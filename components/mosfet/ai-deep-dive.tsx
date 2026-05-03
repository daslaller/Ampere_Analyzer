"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  BrainCircuit,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  Wind,
  Zap,
  ArrowRight,
} from "lucide-react";
import { getAiOptimizations, type OptimizationResult } from "@/app/actions";
import { COOLING_METHODS, type SimulationResult, type SimulationParams } from "@/lib/mosfet-types";

interface AiDeepDiveProps {
  simulationResult: SimulationResult;
  simulationParams: SimulationParams;
  onApplyOptimizations?: (optimizations: OptimizationResult) => void;
}

export function AiDeepDive({ simulationResult, simulationParams, onApplyOptimizations }: AiDeepDiveProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDeepDive = () => {
    startTransition(async () => {
      setError(null);
      setResult(null);

      const currentResults = `
        Status: ${simulationResult.status}
        Max Safe Current: ${simulationResult.maxSafeCurrent.toFixed(2)}A
        Failure Reason: ${simulationResult.failureReason || "None"}
        Final Temperature: ${simulationResult.finalTemperature.toFixed(1)}°C
        Total Power Loss: ${simulationResult.powerDissipation.total.toFixed(2)}W
        Conduction Loss: ${simulationResult.powerDissipation.conduction.toFixed(2)}W
        Switching Loss: ${simulationResult.powerDissipation.switching.toFixed(2)}W
      `;

      const coolingMethodsStr = JSON.stringify(
        COOLING_METHODS.map((c) => ({
          name: c.name,
          value: c.value,
          thermalResistance: c.thermalResistance,
          coolingBudget: c.coolingBudget,
        }))
      );

      const currentSpecs = JSON.stringify({
        componentName: simulationParams.componentName,
        transistorType: simulationParams.transistorType,
        maxCurrent: simulationParams.maxCurrent,
        maxVoltage: simulationParams.maxVoltage,
        rdsOn: simulationParams.rdsOn,
        rthJC: simulationParams.rthJC,
        maxTemperature: simulationParams.maxTemperature,
        switchingFrequency: simulationParams.switchingFrequency,
        coolingMethod: simulationParams.coolingMethod.name,
      });

      const response = await getAiOptimizations(
        simulationParams.componentName,
        currentResults,
        coolingMethodsStr,
        currentSpecs
      );

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setResult(response.data);
      }
    });
  };

  if (result) {
    const recommendedCooling = COOLING_METHODS.find((c) => c.value === result.bestCoolingMethod);
    const currentImprovement =
      ((result.projectedMaxSafeCurrent - simulationResult.maxSafeCurrent) / simulationResult.maxSafeCurrent) * 100;

    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Optimization Results
          </CardTitle>
          <CardDescription>Analysis complete with optimization recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Improvement Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Projected Max Current
              </div>
              <p className="text-2xl font-bold text-primary">
                {result.projectedMaxSafeCurrent.toFixed(2)} A
              </p>
              <p className="text-xs text-primary/70">
                +{currentImprovement.toFixed(1)}% improvement
              </p>
            </div>
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap className="h-4 w-4" />
                Optimal Frequency
              </div>
              <p className="text-2xl font-bold">{result.optimalFrequency} kHz</p>
              <p className="text-xs text-muted-foreground">
                {result.optimalFrequency < simulationParams.switchingFrequency
                  ? "Reduced to minimize switching losses"
                  : "Optimized for efficiency"}
              </p>
            </div>
          </div>

          {/* Recommended Cooling */}
          {recommendedCooling && (
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Wind className="h-4 w-4" />
                Recommended Cooling
              </div>
              <p className="font-medium">{recommendedCooling.name}</p>
              <p className="text-xs text-muted-foreground">
                Thermal Resistance: {recommendedCooling.thermalResistance} °C/W |
                Cooling Budget: {recommendedCooling.coolingBudget}W
              </p>
            </div>
          )}

          {/* AI Reasoning */}
          <Alert className="border-primary/30">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <AlertTitle>AI Analysis</AlertTitle>
            <AlertDescription className="text-sm whitespace-pre-wrap">
              {result.reasoning}
            </AlertDescription>
          </Alert>

          {/* Suggestions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Optimization Suggestions
            </h4>
            <ul className="space-y-2">
              {result.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Apply Button */}
          {onApplyOptimizations && (
            <Button onClick={() => onApplyOptimizations(result)} className="w-full gap-2">
              <ArrowRight className="h-4 w-4" />
              Apply Optimizations & Re-run
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          AI Deep Dive Analysis
        </CardTitle>
        <CardDescription>
          Let AI analyze your simulation results and suggest optimizations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>The AI will analyze:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Current simulation results and failure points</li>
            <li>Optimal cooling solutions for your device</li>
            <li>Switching frequency optimization</li>
            <li>Thermal management improvements</li>
          </ul>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={runDeepDive} disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Analyzing...
            </>
          ) : (
            <>
              <BrainCircuit className="mr-2 h-4 w-4" />
              Start AI Deep Dive
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
