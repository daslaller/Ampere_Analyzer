"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { MOSFETParams } from "@/lib/mosfet-types";

interface VgsSelectorProps {
  params: MOSFETParams;
  vgsValues: number[];
  onVgsValuesChange: (values: number[]) => void;
  vdsMax: number;
  onVdsMaxChange: (value: number) => void;
}

export function VgsSelector({
  params,
  vgsValues,
  onVgsValuesChange,
  vdsMax,
  onVdsMaxChange,
}: VgsSelectorProps) {
  const isNChannel = params.vth >= 0;
  const maxVgs = Math.abs(params.vgsMax);

  const addVgs = () => {
    if (vgsValues.length >= 6) return;
    const newValue = Math.min(
      Math.max(...vgsValues.map(Math.abs)) + 2,
      maxVgs
    );
    const adjusted = isNChannel ? newValue : -newValue;
    onVgsValuesChange([...vgsValues, adjusted].sort((a, b) => 
      isNChannel ? a - b : b - a
    ));
  };

  const removeVgs = (index: number) => {
    if (vgsValues.length <= 1) return;
    const newValues = vgsValues.filter((_, i) => i !== index);
    onVgsValuesChange(newValues);
  };

  const updateVgs = (index: number, value: number) => {
    const newValues = [...vgsValues];
    newValues[index] = isNChannel ? value : -value;
    onVgsValuesChange(newValues.sort((a, b) => isNChannel ? a - b : b - a));
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Curve Settings</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addVgs}
          disabled={vgsValues.length >= 6}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add V<sub>GS</sub>
        </Button>
      </div>

      <div className="space-y-4">
        {/* VDS Max */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground text-sm">
              V<sub>DS</sub> Range
            </Label>
            <span className="text-sm font-mono text-primary">
              0 - {Math.abs(vdsMax)} V
            </span>
          </div>
          <Slider
            value={[Math.abs(vdsMax)]}
            onValueChange={([v]) => onVdsMaxChange(isNChannel ? v : -v)}
            min={5}
            max={Math.abs(params.vdsMax)}
            step={5}
            className="w-full"
          />
        </div>

        <div className="h-px bg-border my-4" />

        {/* VGS Values */}
        <div className="space-y-3">
          <Label className="text-muted-foreground text-sm">
            V<sub>GS</sub> Curves ({vgsValues.length}/6)
          </Label>
          
          {vgsValues.map((vgs, index) => (
            <div key={index} className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs w-16 justify-center">
                {Math.abs(vgs).toFixed(1)}V
              </Badge>
              <Slider
                value={[Math.abs(vgs)]}
                onValueChange={([v]) => updateVgs(index, v)}
                min={0}
                max={maxVgs}
                step={0.5}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeVgs(index)}
                disabled={vgsValues.length <= 1}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
