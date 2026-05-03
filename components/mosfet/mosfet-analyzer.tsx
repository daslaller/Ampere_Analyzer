"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParameterPanel } from "./parameter-panel";
import { IVCurveChart } from "./iv-curve-chart";
import { TransferCurveChart } from "./transfer-curve-chart";
import { OperatingPoint } from "./operating-point";
import { VgsSelector } from "./vgs-selector";
import { DeviceInfo } from "./device-info";
import { LiveSimulation } from "./live-simulation";
import { DatasheetImport } from "./datasheet-import";
import { SimulationForm } from "./simulation-form";
import { ResultsDisplay } from "./results-display";
import { AiDeepDive } from "./ai-deep-dive";
import {
  MOSFETParams,
  MOSFETPreset,
  MOSFET_PRESETS,
  runSimulation,
  type SimulationParams,
  type SimulationResult,
  type LiveDataPoint,
  type ExtractedSpecs,
  COOLING_METHODS,
} from "@/lib/mosfet-types";
import type { OptimizationResult } from "@/app/actions";
import { Activity, TrendingUp, Target, Info, Zap, Radio, FlaskConical, Sparkles } from "lucide-react";

const defaultPreset = MOSFET_PRESETS[0];

export function MosfetAnalyzer() {
  const [params, setParams] = useState<MOSFETParams>(defaultPreset.params);
  const [selectedPreset, setSelectedPreset] = useState<MOSFETPreset | null>(defaultPreset);
  
  // IV Curve settings
  const [vgsValues, setVgsValues] = useState<number[]>([4, 6, 8, 10, 12]);
  const [vdsMax, setVdsMax] = useState(30);
  
  // Transfer curve settings
  const [vdsFixed, setVdsFixed] = useState(10);
  
  // Operating point
  const [opVgs, setOpVgs] = useState(8);
  const [opVds, setOpVds] = useState(15);

  // Run-to-failure simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams | null>(null);
  const [importedSpecs, setImportedSpecs] = useState<ExtractedSpecs | null>(null);
  const [showDeepDive, setShowDeepDive] = useState(false);

  const handleSpecsExtracted = useCallback((specs: ExtractedSpecs) => {
    setImportedSpecs(specs);
  }, []);

  const handleRunSimulation = useCallback(async (simParams: SimulationParams) => {
    setIsSimulating(true);
    setLiveData([]);
    setSimulationResult(null);
    setSimulationParams(simParams);
    setShowDeepDive(false);

    const result = await runSimulation(simParams, (dataPoint) => {
      setLiveData((prev) => [...prev.slice(-150), dataPoint]);
    });

    setSimulationResult(result);
    setIsSimulating(false);
    setShowDeepDive(true);
  }, []);

  const handleApplyOptimizations = useCallback((optimizations: OptimizationResult) => {
    if (!simulationParams) return;
    
    const newCooling = COOLING_METHODS.find((c) => c.value === optimizations.bestCoolingMethod);
    const updatedParams: SimulationParams = {
      ...simulationParams,
      switchingFrequency: optimizations.optimalFrequency,
      coolingMethod: newCooling || simulationParams.coolingMethod,
    };
    
    handleRunSimulation(updatedParams);
  }, [simulationParams, handleRunSimulation]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Ampere Analyzer</h1>
                <p className="text-xs text-muted-foreground">MOSFET Characterization & Run-to-Failure Analysis</p>
              </div>
            </div>
            
            {selectedPreset && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Device:</span>
                <span className="font-mono text-primary">{selectedPreset.name}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{selectedPreset.manufacturer}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Parameters */}
          <aside className="lg:col-span-3 space-y-4">
            <ParameterPanel
              params={params}
              onParamsChange={setParams}
              selectedPreset={selectedPreset}
              onPresetSelect={setSelectedPreset}
            />
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-6 space-y-4">
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-muted">
                <TabsTrigger value="analysis" className="gap-1.5">
                  <FlaskConical className="h-4 w-4" />
                  <span className="hidden sm:inline">Analysis</span>
                  <span className="sm:hidden">Sim</span>
                </TabsTrigger>
                <TabsTrigger value="live" className="gap-1.5">
                  <Radio className="h-4 w-4" />
                  <span className="hidden sm:inline">Live</span>
                  <span className="sm:hidden">Live</span>
                </TabsTrigger>
                <TabsTrigger value="iv-curves" className="gap-1.5">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">I-V</span>
                  <span className="sm:hidden">I-V</span>
                </TabsTrigger>
                <TabsTrigger value="transfer" className="gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Transfer</span>
                  <span className="sm:hidden">Xfer</span>
                </TabsTrigger>
                <TabsTrigger value="operating" className="gap-1.5">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">Op</span>
                  <span className="sm:hidden">Op</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="mt-4 space-y-4">
                <DatasheetImport onSpecsExtracted={handleSpecsExtracted} />
                <SimulationForm
                  onRunSimulation={handleRunSimulation}
                  isRunning={isSimulating}
                  importedSpecs={importedSpecs}
                />
                <ResultsDisplay
                  isRunning={isSimulating}
                  liveData={liveData}
                  simulationResult={simulationResult}
                  simulationMode={simulationParams?.simulationMode || "ftf"}
                  maxTemperature={simulationParams?.maxTemperature || 150}
                  isDeepDiveAvailable={showDeepDive && !!simulationResult}
                  onRunDeepDive={() => setShowDeepDive(true)}
                />
                {showDeepDive && simulationResult && simulationParams && (
                  <AiDeepDive
                    simulationResult={simulationResult}
                    simulationParams={simulationParams}
                    onApplyOptimizations={handleApplyOptimizations}
                  />
                )}
              </TabsContent>

              <TabsContent value="live" className="mt-4">
                <LiveSimulation params={params} />
              </TabsContent>

              <TabsContent value="iv-curves" className="space-y-4 mt-4">
                <IVCurveChart
                  params={params}
                  vgsValues={vgsValues}
                  vdsMax={vdsMax}
                />
                <VgsSelector
                  params={params}
                  vgsValues={vgsValues}
                  onVgsValuesChange={setVgsValues}
                  vdsMax={vdsMax}
                  onVdsMaxChange={setVdsMax}
                />
              </TabsContent>

              <TabsContent value="transfer" className="mt-4">
                <TransferCurveChart
                  params={params}
                  vdsFixed={vdsFixed}
                  onVdsChange={setVdsFixed}
                />
              </TabsContent>

              <TabsContent value="operating" className="mt-4">
                <OperatingPoint
                  params={params}
                  vgs={opVgs}
                  vds={opVds}
                  onVgsChange={setOpVgs}
                  onVdsChange={setOpVds}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Info */}
          <aside className="lg:col-span-3 space-y-4">
            <DeviceInfo params={params} preset={selectedPreset} />
            
            {/* AI Features Info */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-foreground text-sm">AI Features</h4>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Upload datasheets for automatic spec extraction</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>AI search for component parameters by part number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Deep dive analysis with optimization suggestions</span>
                </li>
              </ul>
            </div>
            
            {/* Quick Reference */}
            <div className="p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-foreground text-sm">Quick Reference</h4>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">Cutoff:</strong> V<sub>GS</sub> {"<"} V<sub>th</sub>
                </p>
                <p>
                  <strong className="text-foreground">Linear:</strong> V<sub>GS</sub> {">"} V<sub>th</sub>, V<sub>DS</sub> {"<"} V<sub>OV</sub>
                </p>
                <p>
                  <strong className="text-foreground">Saturation:</strong> V<sub>GS</sub> {">"} V<sub>th</sub>, V<sub>DS</sub> {"≥"} V<sub>OV</sub>
                </p>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="mb-1"><strong className="text-foreground">Power Loss:</strong></p>
                  <p className="font-mono">P<sub>cond</sub> = I<sub>D</sub>² × R<sub>DS(on)</sub></p>
                  <p className="font-mono mt-1">P<sub>sw</sub> = ½ × V × I × (t<sub>r</sub>+t<sub>f</sub>) × f</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-4">
        <div className="max-w-[1800px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>Ampere Analyzer - MOSFET Characterization & Run-to-Failure Analysis</p>
            <p>AI-Powered Component Import | Thermal Simulation | Deep Dive Optimization</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
