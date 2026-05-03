"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { MOSFETParams } from "@/lib/mosfet-types";
import { Play, Pause, RotateCcw, Zap } from "lucide-react";

interface LiveSimulationProps {
  params: MOSFETParams;
}

interface SimulationPoint {
  time: number;
  vgs: number;
  vds: number;
  id: number;
  power: number;
}

export function LiveSimulation({ params }: LiveSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [time, setTime] = useState(0);
  const [frequency, setFrequency] = useState(1000); // Hz
  const [dutyCycle, setDutyCycle] = useState(50); // %
  const [vgsHigh, setVgsHigh] = useState(10); // V
  const [vdsSupply, setVdsSupply] = useState(24); // V
  const [loadResistance, setLoadResistance] = useState(10); // Ohms
  const [currentPoint, setCurrentPoint] = useState<SimulationPoint>({
    time: 0,
    vgs: 0,
    vds: 0,
    id: 0,
    power: 0,
  });
  const [operatingRegion, setOperatingRegion] = useState<string>("Cutoff");

  const dataBufferRef = useRef<SimulationPoint[]>([]);
  const maxBufferSize = 500;

  const calculateDrainCurrent = useCallback(
    (vgs: number, vds: number): number => {
      const { vth, kn, lambda, type } = params;
      const sign = type === "N" ? 1 : -1;
      const effectiveVgs = sign * vgs;
      const effectiveVds = sign * vds;
      const effectiveVth = sign * vth;

      if (effectiveVgs <= effectiveVth) {
        return 0;
      }

      const vov = effectiveVgs - effectiveVth;

      if (effectiveVds < vov) {
        // Linear region
        return (
          sign * kn * (vov * effectiveVds - 0.5 * effectiveVds * effectiveVds)
        );
      } else {
        // Saturation region
        return sign * 0.5 * kn * vov * vov * (1 + lambda * effectiveVds);
      }
    },
    [params]
  );

  const getOperatingRegion = useCallback(
    (vgs: number, vds: number): string => {
      const { vth, type } = params;
      const sign = type === "N" ? 1 : -1;
      const effectiveVgs = sign * vgs;
      const effectiveVds = sign * vds;
      const effectiveVth = sign * vth;

      if (effectiveVgs <= effectiveVth) {
        return "Cutoff";
      }

      const vov = effectiveVgs - effectiveVth;

      if (effectiveVds < vov) {
        return "Linear";
      } else {
        return "Saturation";
      }
    },
    [params]
  );

  const simulate = useCallback(
    (t: number) => {
      const period = 1 / frequency;
      const tInCycle = t % period;
      const dutyTime = (dutyCycle / 100) * period;

      // Gate signal with rise/fall time
      const riseTime = period * 0.02;
      const fallTime = period * 0.02;

      let vgs: number;
      if (tInCycle < riseTime) {
        vgs = (tInCycle / riseTime) * vgsHigh;
      } else if (tInCycle < dutyTime - fallTime) {
        vgs = vgsHigh;
      } else if (tInCycle < dutyTime) {
        vgs = ((dutyTime - tInCycle) / fallTime) * vgsHigh;
      } else {
        vgs = 0;
      }

      // Calculate drain current based on circuit
      const id = calculateDrainCurrent(vgs, vdsSupply);

      // Vds depends on load and current (simplified model)
      const vLoad = id * loadResistance;
      const vds = Math.max(0, vdsSupply - vLoad);

      // Recalculate with actual Vds
      const actualId = calculateDrainCurrent(vgs, vds);
      const power = actualId * vds;

      return {
        time: t,
        vgs,
        vds,
        id: actualId,
        power,
      };
    },
    [
      frequency,
      dutyCycle,
      vgsHigh,
      vdsSupply,
      loadResistance,
      calculateDrainCurrent,
    ]
  );

  const drawWaveforms = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = "oklch(0.12 0.005 250)";
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "oklch(0.25 0.01 250)";
    ctx.lineWidth = 0.5;

    const gridLines = 8;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight * i) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (chartWidth * i) / 10;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    const data = dataBufferRef.current;
    if (data.length < 2) return;

    // Calculate scales
    const timeRange = data[data.length - 1].time - data[0].time;
    const maxVgs = Math.max(...data.map((d) => d.vgs), vgsHigh);
    const maxId = Math.max(...data.map((d) => d.id), 0.1);
    const maxVds = Math.max(...data.map((d) => d.vds), vdsSupply);

    // Draw channels (4 rows)
    const rowHeight = chartHeight / 4;

    const drawChannel = (
      values: number[],
      row: number,
      maxVal: number,
      color: string,
      label: string,
      unit: string
    ) => {
      const yOffset = padding.top + row * rowHeight;

      // Channel label
      ctx.fillStyle = color;
      ctx.font = "11px monospace";
      ctx.fillText(`${label}`, padding.left - 45, yOffset + rowHeight / 2 + 4);

      // Draw waveform
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      values.forEach((val, i) => {
        const x =
          padding.left +
          ((data[i].time - data[0].time) / timeRange) * chartWidth;
        const y = yOffset + rowHeight - (val / maxVal) * rowHeight * 0.8 - 10;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Scale label
      ctx.fillStyle = "oklch(0.65 0 0)";
      ctx.font = "9px monospace";
      ctx.fillText(
        `${maxVal.toFixed(1)}${unit}`,
        width - padding.right + 2,
        yOffset + 12
      );
    };

    // Vgs - Cyan
    drawChannel(
      data.map((d) => d.vgs),
      0,
      maxVgs,
      "oklch(0.75 0.15 200)",
      "Vgs",
      "V"
    );

    // Id - Green
    drawChannel(
      data.map((d) => d.id),
      1,
      maxId,
      "oklch(0.75 0.18 165)",
      "Id",
      "A"
    );

    // Vds - Yellow
    drawChannel(
      data.map((d) => d.vds),
      2,
      maxVds,
      "oklch(0.75 0.18 50)",
      "Vds",
      "V"
    );

    // Power - Red
    const maxPower = Math.max(...data.map((d) => d.power), 1);
    drawChannel(
      data.map((d) => d.power),
      3,
      maxPower,
      "oklch(0.65 0.2 25)",
      "P",
      "W"
    );

    // Time axis label
    ctx.fillStyle = "oklch(0.65 0 0)";
    ctx.font = "10px monospace";
    ctx.fillText(
      `Time: ${(timeRange * 1000).toFixed(2)}ms`,
      width / 2 - 40,
      height - 8
    );
  }, [vgsHigh, vdsSupply]);

  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let lastTime = performance.now();
    const timeStep = 1 / frequency / 50; // 50 samples per cycle

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setTime((prevTime) => {
        const newTime = prevTime + deltaTime;
        const point = simulate(newTime);

        dataBufferRef.current.push(point);
        if (dataBufferRef.current.length > maxBufferSize) {
          dataBufferRef.current.shift();
        }

        setCurrentPoint(point);
        setOperatingRegion(getOperatingRegion(point.vgs, point.vds));

        return newTime;
      });

      drawWaveforms();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, simulate, drawWaveforms, frequency, getOperatingRegion]);

  const handleReset = () => {
    setTime(0);
    dataBufferRef.current = [];
    setCurrentPoint({ time: 0, vgs: 0, vds: 0, id: 0, power: 0 });
  };

  const regionColors: Record<string, string> = {
    Cutoff: "bg-muted text-muted-foreground",
    Linear: "bg-chart-2/20 text-chart-2",
    Saturation: "bg-primary/20 text-primary",
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Zap className="h-4 w-4 text-primary" />
            Live Simulation
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={regionColors[operatingRegion]}>
              {operatingRegion}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Waveform Display */}
        <div className="relative rounded-md border border-border bg-background overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-[280px]"
            style={{ display: "block" }}
          />
        </div>

        {/* Live Values */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-md border border-border bg-background p-2 text-center">
            <div className="text-xs text-muted-foreground">Vgs</div>
            <div className="text-lg font-mono text-chart-2">
              {currentPoint.vgs.toFixed(2)}
              <span className="text-xs text-muted-foreground ml-1">V</span>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-2 text-center">
            <div className="text-xs text-muted-foreground">Id</div>
            <div className="text-lg font-mono text-primary">
              {currentPoint.id.toFixed(3)}
              <span className="text-xs text-muted-foreground ml-1">A</span>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-2 text-center">
            <div className="text-xs text-muted-foreground">Vds</div>
            <div className="text-lg font-mono text-chart-3">
              {currentPoint.vds.toFixed(2)}
              <span className="text-xs text-muted-foreground ml-1">V</span>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-2 text-center">
            <div className="text-xs text-muted-foreground">Power</div>
            <div className="text-lg font-mono text-chart-4">
              {currentPoint.power.toFixed(2)}
              <span className="text-xs text-muted-foreground ml-1">W</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Frequency: {frequency} Hz
            </Label>
            <Slider
              value={[frequency]}
              onValueChange={([v]) => setFrequency(v)}
              min={100}
              max={10000}
              step={100}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Duty Cycle: {dutyCycle}%
            </Label>
            <Slider
              value={[dutyCycle]}
              onValueChange={([v]) => setDutyCycle(v)}
              min={10}
              max={90}
              step={5}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Vgs High: {vgsHigh}V
            </Label>
            <Slider
              value={[vgsHigh]}
              onValueChange={([v]) => setVgsHigh(v)}
              min={1}
              max={20}
              step={0.5}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Supply (Vds): {vdsSupply}V
            </Label>
            <Slider
              value={[vdsSupply]}
              onValueChange={([v]) => setVdsSupply(v)}
              min={5}
              max={60}
              step={1}
              className="w-full"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label className="text-xs text-muted-foreground">
              Load Resistance: {loadResistance}Ω
            </Label>
            <Slider
              value={[loadResistance]}
              onValueChange={([v]) => setLoadResistance(v)}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
