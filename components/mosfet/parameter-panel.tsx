"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOSFETParams, MOSFETPreset, MOSFET_PRESETS } from "@/lib/mosfet-types";
import { Zap, Settings2, Cpu, RefreshCw } from "lucide-react";

interface ParameterPanelProps {
  params: MOSFETParams;
  onParamsChange: (params: MOSFETParams) => void;
  selectedPreset: MOSFETPreset | null;
  onPresetSelect: (preset: MOSFETPreset | null) => void;
}

export function ParameterPanel({
  params,
  onParamsChange,
  selectedPreset,
  onPresetSelect,
}: ParameterPanelProps) {
  const updateParam = (key: keyof MOSFETParams, value: number) => {
    onParamsChange({ ...params, [key]: value });
    // Clear preset when manually editing
    if (selectedPreset) {
      onPresetSelect(null);
    }
  };

  const handlePresetChange = (presetId: string) => {
    const preset = MOSFET_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onPresetSelect(preset);
      onParamsChange(preset.params);
    }
  };

  const resetToDefault = () => {
    const defaultPreset = MOSFET_PRESETS[0];
    onPresetSelect(defaultPreset);
    onParamsChange(defaultPreset.params);
  };

  return (
    <Card className="p-4 space-y-4 bg-card border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">MOSFET Parameters</h2>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefault}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Preset Selector */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">Device Preset</Label>
        <Select
          value={selectedPreset?.id || ""}
          onValueChange={handlePresetChange}
        >
          <SelectTrigger className="bg-input border-border">
            <SelectValue placeholder="Select a MOSFET" />
          </SelectTrigger>
          <SelectContent>
            {MOSFET_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                <div className="flex items-center gap-2">
                  <span>{preset.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {preset.type}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPreset && (
          <p className="text-xs text-muted-foreground">
            {selectedPreset.manufacturer} • {selectedPreset.type}
          </p>
        )}
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="basic" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="limits" className="text-xs">
            <Settings2 className="h-3 w-3 mr-1" />
            Limits
          </TabsTrigger>
          <TabsTrigger value="caps" className="text-xs">
            <Cpu className="h-3 w-3 mr-1" />
            Caps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 pt-4">
          {/* Threshold Voltage */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                V<sub>th</sub> (Threshold)
              </Label>
              <span className="text-sm font-mono text-primary">
                {params.vth.toFixed(2)} V
              </span>
            </div>
            <Slider
              value={[params.vth]}
              onValueChange={([v]) => updateParam("vth", v)}
              min={-10}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Transconductance Parameter */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                K<sub>n</sub> (A/V²)
              </Label>
              <span className="text-sm font-mono text-primary">
                {params.kn.toFixed(4)}
              </span>
            </div>
            <Slider
              value={[params.kn * 100]}
              onValueChange={([v]) => updateParam("kn", v / 100)}
              min={0.01}
              max={20}
              step={0.01}
              className="w-full"
            />
          </div>

          {/* Lambda (Channel Length Modulation) */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                λ (1/V)
              </Label>
              <span className="text-sm font-mono text-primary">
                {params.lambda.toFixed(3)}
              </span>
            </div>
            <Slider
              value={[params.lambda * 100]}
              onValueChange={([v]) => updateParam("lambda", v / 100)}
              min={0}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* RDS(on) */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                R<sub>DS(on)</sub>
              </Label>
              <span className="text-sm font-mono text-primary">
                {params.rdsOn.toFixed(1)} mΩ
              </span>
            </div>
            <Slider
              value={[params.rdsOn]}
              onValueChange={([v]) => updateParam("rdsOn", v)}
              min={1}
              max={5000}
              step={1}
              className="w-full"
            />
          </div>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4 pt-4">
          {/* VGS Max */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                V<sub>GS(max)</sub>
              </Label>
              <span className="text-sm font-mono text-primary">
                ±{Math.abs(params.vgsMax)} V
              </span>
            </div>
            <Slider
              value={[Math.abs(params.vgsMax)]}
              onValueChange={([v]) => updateParam("vgsMax", v)}
              min={5}
              max={30}
              step={1}
              className="w-full"
            />
          </div>

          {/* VDS Max */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                V<sub>DS(max)</sub>
              </Label>
              <span className="text-sm font-mono text-primary">
                {Math.abs(params.vdsMax)} V
              </span>
            </div>
            <Slider
              value={[Math.abs(params.vdsMax)]}
              onValueChange={([v]) => updateParam("vdsMax", params.vth >= 0 ? v : -v)}
              min={10}
              max={200}
              step={5}
              className="w-full"
            />
          </div>

          {/* ID Max */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                I<sub>D(max)</sub>
              </Label>
              <span className="text-sm font-mono text-primary">
                {Math.abs(params.idMax).toFixed(1)} A
              </span>
            </div>
            <Slider
              value={[Math.abs(params.idMax)]}
              onValueChange={([v]) => updateParam("idMax", params.vth >= 0 ? v : -v)}
              min={0.1}
              max={150}
              step={0.5}
              className="w-full"
            />
          </div>
        </TabsContent>

        <TabsContent value="caps" className="space-y-4 pt-4">
          {/* Ciss */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                C<sub>iss</sub> (Input)
              </Label>
              <span className="text-sm font-mono text-primary">
                {params.ciss} pF
              </span>
            </div>
            <Input
              type="number"
              value={params.ciss}
              onChange={(e) => updateParam("ciss", parseFloat(e.target.value) || 0)}
              className="bg-input border-border font-mono"
            />
          </div>

          {/* Coss */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                C<sub>oss</sub> (Output)
              </Label>
              <span className="text-sm font-mono text-primary">
                {params.coss} pF
              </span>
            </div>
            <Input
              type="number"
              value={params.coss}
              onChange={(e) => updateParam("coss", parseFloat(e.target.value) || 0)}
              className="bg-input border-border font-mono"
            />
          </div>

          {/* Crss */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-muted-foreground text-sm">
                C<sub>rss</sub> (Reverse)
              </Label>
              <span className="text-sm font-mono text-primary">
                {params.crss} pF
              </span>
            </div>
            <Input
              type="number"
              value={params.crss}
              onChange={(e) => updateParam("crss", parseFloat(e.target.value) || 0)}
              className="bg-input border-border font-mono"
            />
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
