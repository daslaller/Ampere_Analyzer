"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MOSFETParams, MOSFETPreset } from "@/lib/mosfet-types";
import { Cpu, Thermometer, Zap, Info } from "lucide-react";

interface DeviceInfoProps {
  params: MOSFETParams;
  preset: MOSFETPreset | null;
}

export function DeviceInfo({ params, preset }: DeviceInfoProps) {
  const isNChannel = params.vth >= 0;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Device Summary</h3>
      </div>

      {preset && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{preset.name}</span>
            <Badge variant={isNChannel ? "default" : "secondary"}>
              {preset.type}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{preset.manufacturer}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Electrical Specs */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
            <Zap className="h-3.5 w-3.5" />
            <span>ELECTRICAL</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">V<sub>DS(max)</sub></span>
              <span className="font-mono text-foreground">{Math.abs(params.vdsMax)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">V<sub>GS(max)</sub></span>
              <span className="font-mono text-foreground">±{Math.abs(params.vgsMax)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">I<sub>D(max)</sub></span>
              <span className="font-mono text-foreground">{Math.abs(params.idMax)} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">R<sub>DS(on)</sub></span>
              <span className="font-mono text-foreground">
                {params.rdsOn >= 1000 
                  ? `${(params.rdsOn / 1000).toFixed(2)} Ω` 
                  : `${params.rdsOn} mΩ`}
              </span>
            </div>
          </div>
        </div>

        {/* Model Params */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
            <Cpu className="h-3.5 w-3.5" />
            <span>SPICE MODEL</span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">V<sub>th</sub></span>
              <span className="font-mono text-foreground">{params.vth.toFixed(2)} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">K<sub>n</sub></span>
              <span className="font-mono text-foreground">{params.kn.toFixed(4)} A/V²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">λ</span>
              <span className="font-mono text-foreground">{params.lambda.toFixed(3)} /V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">V<sub>F</sub> (body)</span>
              <span className="font-mono text-foreground">{params.bodyDiodeVf || 0.9} V</span>
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Capacitances */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
          <Thermometer className="h-3.5 w-3.5" />
          <span>CAPACITANCES</span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-muted/50 rounded-md">
            <p className="text-muted-foreground text-xs">C<sub>iss</sub></p>
            <p className="font-mono text-foreground">{params.ciss} pF</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-md">
            <p className="text-muted-foreground text-xs">C<sub>oss</sub></p>
            <p className="font-mono text-foreground">{params.coss} pF</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-md">
            <p className="text-muted-foreground text-xs">C<sub>rss</sub></p>
            <p className="font-mono text-foreground">{params.crss} pF</p>
          </div>
        </div>
      </div>

      {/* Calculated Gate Charge (simplified) */}
      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <p className="text-xs text-muted-foreground mb-1">Estimated Gate Charge</p>
        <p className="font-mono text-foreground">
          Q<sub>g</sub> ≈ {((params.ciss + params.crss) * 10 / 1000).toFixed(1)} nC
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          @ V<sub>GS</sub> = 10V (simplified)
        </p>
      </div>
    </Card>
  );
}
