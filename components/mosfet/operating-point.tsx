"use client";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MOSFETParams, calculateIdVds, calculateGm, calculateRout } from "@/lib/mosfet-types";
import { Target, Zap, TrendingUp, CircuitBoard } from "lucide-react";

interface OperatingPointProps {
  params: MOSFETParams;
  vgs: number;
  vds: number;
  onVgsChange: (vgs: number) => void;
  onVdsChange: (vds: number) => void;
}

export function OperatingPoint({
  params,
  vgs,
  vds,
  onVgsChange,
  onVdsChange,
}: OperatingPointProps) {
  const isNChannel = params.vth >= 0;
  const effectiveVth = Math.abs(params.vth);
  
  const id = calculateIdVds(vgs, vds, params);
  const gm = calculateGm(vgs, vds, params);
  const rout = calculateRout(vgs, vds, params);
  
  const vov = Math.abs(vgs) - effectiveVth;
  const isSaturation = Math.abs(vds) >= vov && vov > 0;
  const isLinear = Math.abs(vds) < vov && vov > 0;
  const isCutoff = vov <= 0;

  const region = isCutoff ? "Cutoff" : isSaturation ? "Saturation" : "Linear";
  const regionColor = isCutoff 
    ? "text-muted-foreground" 
    : isSaturation 
      ? "text-primary" 
      : "text-accent";

  const power = Math.abs(id * vds);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Operating Point Analysis</h3>
      </div>

      <div className="space-y-4">
        {/* VGS Control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground text-sm">
              V<sub>GS</sub>
            </Label>
            <span className="text-sm font-mono text-primary">
              {vgs.toFixed(2)} V
            </span>
          </div>
          <Slider
            value={[isNChannel ? vgs : Math.abs(vgs)]}
            onValueChange={([v]) => onVgsChange(isNChannel ? v : -v)}
            min={0}
            max={Math.abs(params.vgsMax)}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* VDS Control */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-muted-foreground text-sm">
              V<sub>DS</sub>
            </Label>
            <span className="text-sm font-mono text-primary">
              {Math.abs(vds).toFixed(2)} V
            </span>
          </div>
          <Slider
            value={[Math.abs(vds)]}
            onValueChange={([v]) => onVdsChange(isNChannel ? v : -v)}
            min={0}
            max={Math.abs(params.vdsMax)}
            step={0.5}
            className="w-full"
          />
        </div>

        <Separator className="my-4" />

        {/* Operating Region */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Operating Region</span>
          <Badge variant="outline" className={regionColor}>
            {region}
          </Badge>
        </div>

        <Separator className="my-4" />

        {/* Calculated Parameters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Zap className="h-3 w-3" />
              <span>Drain Current</span>
            </div>
            <p className="font-mono text-lg text-foreground">
              {Math.abs(id) >= 1 
                ? `${Math.abs(id).toFixed(3)} A` 
                : `${(Math.abs(id) * 1000).toFixed(2)} mA`}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              <span>Transconductance</span>
            </div>
            <p className="font-mono text-lg text-foreground">
              {gm >= 1 
                ? `${gm.toFixed(3)} S` 
                : `${(gm * 1000).toFixed(2)} mS`}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <CircuitBoard className="h-3 w-3" />
              <span>Output Resistance</span>
            </div>
            <p className="font-mono text-lg text-foreground">
              {rout === Infinity 
                ? "∞" 
                : rout >= 1000 
                  ? `${(rout / 1000).toFixed(1)} kΩ` 
                  : `${rout.toFixed(1)} Ω`}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Zap className="h-3 w-3" />
              <span>Power Dissipation</span>
            </div>
            <p className="font-mono text-lg text-foreground">
              {power >= 1 
                ? `${power.toFixed(2)} W` 
                : `${(power * 1000).toFixed(1)} mW`}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Additional Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Overdrive Voltage (V<sub>OV</sub>)</span>
            <span className="font-mono text-foreground">
              {vov > 0 ? vov.toFixed(2) : "0.00"} V
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Threshold Voltage (V<sub>th</sub>)</span>
            <span className="font-mono text-foreground">
              {params.vth.toFixed(2)} V
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Intrinsic Gain (g<sub>m</sub>r<sub>o</sub>)</span>
            <span className="font-mono text-foreground">
              {rout === Infinity ? "∞" : (gm * rout).toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
