"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SimulationResult, AiCalculatedExpectedResultsOutput, AiOptimizationSuggestionsOutput, LiveDataPoint, AiDeepDiveStep } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Thermometer, Zap, Gauge, Lightbulb, Bot, Cpu, TrendingUp, Power, Package, ShieldAlert, BrainCircuit } from 'lucide-react';
import React, { useEffect, useState } from "react";
import LiveSimulationView from "./live-simulation-view";
import { Button } from "../ui/button";
import AiDeepDiveView from "./ai-deep-dive-view";

interface ResultsDisplayProps {
  isLoading: boolean;
  simulationResult: SimulationResult | null;
  aiCalculatedResults: AiCalculatedExpectedResultsOutput | null;
  aiOptimizationSuggestions: AiOptimizationSuggestionsOutput | null;
  liveData: LiveDataPoint[];
  formValues: any;
  onAiDeepDive: () => void;
  isDeepDiveRunning: boolean;
  deepDiveSteps: AiDeepDiveStep[];
  currentDeepDiveStep: number;
  /** When true, the parent is rendering the live view separately */
  liveViewHandledByParent?: boolean;
}

// NEW: Add SmoothCounter component
const SmoothCounter = ({ 
  value, 
  duration = 300, 
  decimals = 1 
}: { 
  value: number; 
  duration?: number; 
  decimals?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  const easeInOutQuad = (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };
  
  useEffect(() => {
    const startValue = displayValue;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutQuad(progress);
      
      const interpolatedValue = startValue + (value - startValue) * easedProgress;
      setDisplayValue(interpolatedValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span>{displayValue.toFixed(decimals)}</span>;
};

// UPDATED: Enhanced ResultMetric component with smooth animations
const ResultMetric = ({ 
  icon, 
  label, 
  value, 
  unit, 
  colorClass = 'text-primary',
  animate = false
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  unit: string; 
  colorClass?: string;
  animate?: boolean;
}) => (
  <div className="flex items-start space-x-3 rounded-lg p-4 bg-white/5 transition-all hover:bg-white/10">
    <div className="flex-shrink-0 mt-1">
      {React.createElement(icon, { className: `h-6 w-6 ${colorClass}` })}
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">
        {animate && typeof value === 'number' ? (
          <SmoothCounter value={value} decimals={2} />
        ) : (
          value
        )} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  </div>
);

export default function ResultsDisplay({
  isLoading,
  simulationResult,
  aiCalculatedResults,
  aiOptimizationSuggestions,
  liveData,
  formValues,
  onAiDeepDive,
  isDeepDiveRunning,
  deepDiveSteps,
  currentDeepDiveStep,
  liveViewHandledByParent = false,
}: ResultsDisplayProps) {

  if (isDeepDiveRunning) {
    return (
        <AiDeepDiveView
            steps={deepDiveSteps}
            currentStepIndex={currentDeepDiveStep}
            liveData={liveData}
            initialFormValues={formValues}
        />
    )
  }

  // When the parent renders the live view (canvas 60fps), skip rendering it here
  if (isLoading && liveViewHandledByParent) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col items-center justify-center h-full p-8 text-center border-dashed border-white/20 bg-transparent shadow-none">
          <Bot className="h-16 w-16 text-muted-foreground/50 mb-4 animate-pulse" />
          <CardTitle className="text-xl">Preparing Analysis...</CardTitle>
          <CardDescription className="mt-2 max-w-xs mx-auto">
            The AI is getting ready to run the simulation. Please wait.
          </CardDescription>
      </Card>
    );
  }

  if (!simulationResult) {
    return (
      <Card className="flex flex-col items-center justify-center h-full p-8 text-center border-dashed border-white/20 bg-transparent shadow-none">
        <Bot className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <CardTitle className="text-xl">Awaiting Analysis</CardTitle>
        <CardDescription className="mt-2 max-w-xs mx-auto">
          Enter your component's specifications and desired simulation constraints, then click "Run Analysis" to view the results.
        </CardDescription>
      </Card>
    );
  }

  const isSuccess = simulationResult.status === 'success';

  const failureIcons: { [key: string]: React.ElementType } = {
    Thermal: Thermometer,
    Current: Gauge,
    Voltage: Zap,
    'Power Dissipation': Package,
    'Cooling Budget': ShieldAlert,
  };
  const FailureIcon = simulationResult.failureReason ? failureIcons[simulationResult.failureReason] || AlertTriangle : AlertTriangle;

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      <Card>
        <CardHeader>
          <CardTitle>Simulation Outcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={isSuccess ? 'default' : 'destructive'} className={isSuccess ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
            {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <FailureIcon className="h-4 w-4" />}
            <AlertTitle className="font-bold">{isSuccess ? 'Analysis Successful' : `Failure: ${simulationResult.failureReason} Limit Reached`}</AlertTitle>
            <AlertDescription>{simulationResult.details}</AlertDescription>
          </Alert>

          {/* UPDATED: Enhanced main score display with smooth animation */}
          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-6 text-center">
            <div className="text-sm text-green-300 mb-2">MAXIMUM SAFE CURRENT</div>
            <div className="text-6xl font-bold text-green-400">
              <SmoothCounter 
                value={simulationResult?.maxSafeCurrent || 0} 
                duration={800}
                decimals={1}
              />
            </div>
            <div className="text-xl text-green-300 mt-2">Amperes</div>
          </div>

          {/* UPDATED: Grid with smooth animated metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ResultMetric 
              icon={Thermometer} 
              label="Final Junction Temp" 
              value={simulationResult.finalTemperature} 
              unit="°C" 
              colorClass="text-orange-400"
              animate={true}
            />
            <ResultMetric 
              icon={Power} 
              label="Total Heat Generation" 
              value={simulationResult.powerDissipation.total} 
              unit="W" 
              colorClass="text-red-400"
              animate={true}
            />
            <ResultMetric 
              icon={Cpu} 
              label="Conduction Loss" 
              value={simulationResult.powerDissipation.conduction} 
              unit="W"
              animate={true}
            />
            <ResultMetric 
              icon={TrendingUp} 
              label="Switching Loss" 
              value={simulationResult.powerDissipation.switching} 
              unit="W"
              animate={true}
            />
            {/* NEW: Live current display if data is available */}
            {liveData.length > 0 && (
              <div className="flex items-start space-x-3 rounded-lg p-4 bg-white/5 transition-all hover:bg-white/10">
                <div className="flex-shrink-0 mt-1">
                  <Gauge className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Analysis</p>
                  <p className="text-xl font-bold">
                    <SmoothCounter 
                      value={liveData[liveData.length - 1]?.current || 0} 
                      decimals={1}
                      duration={100}
                    /> <span className="text-sm font-normal text-muted-foreground">A</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

       {liveData && liveData.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>Analysis Graph</CardTitle>
             <CardDescription>
                {formValues.simulationAlgorithm === 'iterative' 
                    ? "Plot of the calculated thermal curve." 
                    : "Live plot of the binary search algorithm."
                }
             </CardDescription>
           </CardHeader>
           <CardContent>
              <LiveSimulationView 
                liveData={liveData} 
                simulationMode={formValues.simulationMode}
                maxTemperature={formValues.maxTemperature}
              />
           </CardContent>
         </Card>
      )}

      {aiCalculatedResults && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Calculated Safe Limits</CardTitle>
            <CardDescription>AI-powered estimation based on the datasheet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ResultMetric 
                  icon={Gauge} 
                  label="Expected Max Current" 
                  value={aiCalculatedResults.expectedMaxCurrent} 
                  unit="A"
                  animate={true}
                />
                <ResultMetric 
                  icon={Thermometer} 
                  label="Expected Max Temp" 
                  value={aiCalculatedResults.expectedMaxTemperature} 
                  unit="°C"
                  animate={true}
                />
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-muted-foreground italic"><strong className="text-foreground not-italic">AI Reasoning:</strong> {aiCalculatedResults.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {aiOptimizationSuggestions && (
        <Card>
          <CardHeader>
            <CardTitle>AI Optimization Advisor</CardTitle>
            <CardDescription>Suggestions to improve performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {aiOptimizationSuggestions.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                    <Lightbulb className="h-4 w-4 text-accent mr-3 mt-1 flex-shrink-0" />
                    <span>{suggestion}</span>
                </li>
              ))}
            </ul>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-muted-foreground pt-2 italic"><strong className="text-foreground not-italic">AI Reasoning:</strong> {aiOptimizationSuggestions.reasoning}</p>
            </div>
            <Button onClick={onAiDeepDive} disabled={isLoading || isDeepDiveRunning} className="w-full bg-primary/80 hover:bg-primary">
                <BrainCircuit className="mr-2 h-5 w-5"/>
                Start AI Deep Dive Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}