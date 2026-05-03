"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Play, Settings, Thermometer, Zap, Cpu, Wind } from "lucide-react";
import { COOLING_METHODS, MOSFET_PRESETS, type CoolingMethod, type SimulationParams, type ExtractedSpecs } from "@/lib/mosfet-types";

interface SimulationFormProps {
  onRunSimulation: (params: SimulationParams) => void;
  isRunning: boolean;
  importedSpecs: ExtractedSpecs | null;
}

const TRANSISTOR_TYPES = [
  "MOSFET (N-Channel)",
  "MOSFET (P-Channel)",
  "BJT (NPN)",
  "BJT (PNP)",
  "IGBT",
  "GaN FET",
  "SiC MOSFET",
];

export function SimulationForm({ onRunSimulation, isRunning, importedSpecs }: SimulationFormProps) {
  // Device specs
  const [componentName, setComponentName] = useState("");
  const [transistorType, setTransistorType] = useState("MOSFET (N-Channel)");
  const [maxCurrent, setMaxCurrent] = useState(33);
  const [maxVoltage, setMaxVoltage] = useState(100);
  const [powerDissipation, setPowerDissipation] = useState(130);
  const [rdsOn, setRdsOn] = useState(44);
  const [vceSat, setVceSat] = useState(1.5);
  const [riseTime, setRiseTime] = useState(35);
  const [fallTime, setFallTime] = useState(35);
  const [rthJC, setRthJC] = useState(1.0);
  const [maxTemperature, setMaxTemperature] = useState(150);

  // Simulation settings
  const [switchingFrequency, setSwitchingFrequency] = useState(100);
  const [ambientTemperature, setAmbientTemperature] = useState(25);
  const [coolingMethod, setCoolingMethod] = useState<CoolingMethod>(COOLING_METHODS[4]);
  const [simulationMode, setSimulationMode] = useState<"ftf" | "temp" | "budget">("ftf");
  const [simulationAlgorithm, setSimulationAlgorithm] = useState<"iterative" | "binary">("iterative");
  const [precisionSteps, setPrecisionSteps] = useState(200);
  const [coolingBudget, setCoolingBudget] = useState(100);

  // Apply imported specs
  useEffect(() => {
    if (importedSpecs) {
      setTransistorType(importedSpecs.transistorType || "MOSFET (N-Channel)");
      setMaxCurrent(parseFloat(importedSpecs.maxCurrent) || 33);
      setMaxVoltage(parseFloat(importedSpecs.maxVoltage) || 100);
      setPowerDissipation(parseFloat(importedSpecs.powerDissipation) || 130);
      setRdsOn(parseFloat(importedSpecs.rdsOn) || 44);
      setVceSat(parseFloat(importedSpecs.vceSat) || 1.5);
      setRiseTime(parseFloat(importedSpecs.riseTime) || 35);
      setFallTime(parseFloat(importedSpecs.fallTime) || 35);
      setRthJC(parseFloat(importedSpecs.rthJC) || 1.0);
      setMaxTemperature(parseFloat(importedSpecs.maxTemperature) || 150);
    }
  }, [importedSpecs]);

  const handlePresetSelect = (presetId: string) => {
    const preset = MOSFET_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setComponentName(preset.name);
      setTransistorType(preset.type === "N-Channel" ? "MOSFET (N-Channel)" : "MOSFET (P-Channel)");
      setMaxCurrent(Math.abs(preset.params.idMax));
      setMaxVoltage(Math.abs(preset.params.vdsMax));
      setRdsOn(preset.params.rdsOn);
      // Estimate power dissipation
      setPowerDissipation(Math.abs(preset.params.idMax) * Math.abs(preset.params.vdsMax) * 0.02);
    }
  };

  const handleSubmit = () => {
    const params: SimulationParams = {
      componentName: componentName || "Custom Device",
      transistorType,
      maxCurrent,
      maxVoltage,
      powerDissipation,
      rdsOn,
      vceSat,
      riseTime,
      fallTime,
      rthJC,
      maxTemperature,
      switchingFrequency,
      ambientTemperature,
      coolingMethod,
      simulationMode,
      simulationAlgorithm,
      precisionSteps,
      coolingBudget: simulationMode === "budget" ? coolingBudget : undefined,
    };
    onRunSimulation(params);
  };

  const isMosfet = transistorType.includes("MOSFET") || transistorType.includes("GaN") || transistorType.includes("SiC");

  return (
    <div className="space-y-4">
      {/* Quick Preset Selection */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Quick Select
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handlePresetSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a preset MOSFET..." />
            </SelectTrigger>
            <SelectContent>
              {MOSFET_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name} ({preset.manufacturer}) - {preset.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="device" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="device" className="gap-1.5">
            <Zap className="h-4 w-4" />
            Device
          </TabsTrigger>
          <TabsTrigger value="thermal" className="gap-1.5">
            <Thermometer className="h-4 w-4" />
            Thermal
          </TabsTrigger>
          <TabsTrigger value="simulation" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Simulation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="device" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Device Specifications</CardTitle>
              <CardDescription>Enter the transistor parameters from the datasheet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Component Name</Label>
                  <Input
                    value={componentName}
                    onChange={(e) => setComponentName(e.target.value)}
                    placeholder="e.g., IRF540N"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transistor Type</Label>
                  <Select value={transistorType} onValueChange={setTransistorType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSISTOR_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Max Current (A)</Label>
                  <Input
                    type="number"
                    value={maxCurrent}
                    onChange={(e) => setMaxCurrent(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Voltage (V)</Label>
                  <Input
                    type="number"
                    value={maxVoltage}
                    onChange={(e) => setMaxVoltage(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Power Diss. (W)</Label>
                  <Input
                    type="number"
                    value={powerDissipation}
                    onChange={(e) => setPowerDissipation(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {isMosfet ? (
                  <div className="space-y-2">
                    <Label>Rds(on) (mOhm)</Label>
                    <Input
                      type="number"
                      value={rdsOn}
                      onChange={(e) => setRdsOn(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Vce(sat) (V)</Label>
                    <Input
                      type="number"
                      value={vceSat}
                      onChange={(e) => setVceSat(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Rise/Fall Time (ns)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={riseTime}
                      onChange={(e) => setRiseTime(parseFloat(e.target.value) || 0)}
                      placeholder="Rise"
                    />
                    <Input
                      type="number"
                      value={fallTime}
                      onChange={(e) => setFallTime(parseFloat(e.target.value) || 0)}
                      placeholder="Fall"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thermal" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thermal Parameters</CardTitle>
              <CardDescription>Configure thermal resistance and cooling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rth(j-c) (C/W)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={rthJC}
                    onChange={(e) => setRthJC(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Junction-to-case thermal resistance</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Junction Temp (C)</Label>
                  <Input
                    type="number"
                    value={maxTemperature}
                    onChange={(e) => setMaxTemperature(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  Cooling Method
                </Label>
                <Select
                  value={coolingMethod.value}
                  onValueChange={(v) => setCoolingMethod(COOLING_METHODS.find((c) => c.value === v) || COOLING_METHODS[0])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COOLING_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.name} ({method.thermalResistance} C/W, {method.coolingBudget}W)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ambient Temperature: {ambientTemperature}C</Label>
                <Slider
                  value={[ambientTemperature]}
                  onValueChange={([v]) => setAmbientTemperature(v)}
                  min={0}
                  max={60}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Simulation Settings</CardTitle>
              <CardDescription>Configure how the analysis runs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Switching Frequency: {switchingFrequency} kHz</Label>
                <Slider
                  value={[switchingFrequency]}
                  onValueChange={([v]) => setSwitchingFrequency(v)}
                  min={1}
                  max={500}
                  step={1}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Simulation Mode</Label>
                  <Select value={simulationMode} onValueChange={(v) => setSimulationMode(v as "ftf" | "temp" | "budget")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ftf">First to Fail (FTF)</SelectItem>
                      <SelectItem value="temp">Temperature Limit</SelectItem>
                      <SelectItem value="budget">Cooling Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Algorithm</Label>
                  <Select
                    value={simulationAlgorithm}
                    onValueChange={(v) => setSimulationAlgorithm(v as "iterative" | "binary")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iterative">Iterative (Accurate)</SelectItem>
                      <SelectItem value="binary">Binary Search (Fast)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Precision Steps: {precisionSteps}</Label>
                <Slider
                  value={[precisionSteps]}
                  onValueChange={([v]) => setPrecisionSteps(v)}
                  min={50}
                  max={500}
                  step={10}
                />
              </div>

              {simulationMode === "budget" && (
                <div className="space-y-2">
                  <Label>Cooling Budget (W)</Label>
                  <Input
                    type="number"
                    value={coolingBudget}
                    onChange={(e) => setCoolingBudget(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSubmit} disabled={isRunning} className="w-full" size="lg">
        {isRunning ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Running Simulation...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run Analysis
          </>
        )}
      </Button>
    </div>
  );
}
