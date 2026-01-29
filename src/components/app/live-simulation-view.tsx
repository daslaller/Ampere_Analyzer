
"use client";

import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CanvasChart from './canvas-chart';
import type { CanvasChartHandle } from './canvas-chart';
import type { LiveDataPoint } from '@/lib/types';
import { Info } from 'lucide-react';

export interface LiveSimulationViewHandle {
  /** Push data points directly to canvas — zero React re-renders */
  pushData: (points: LiveDataPoint[]) => void;
  /** Clear all data and reset the view */
  clear: () => void;
}

interface LiveSimulationViewProps {
  simulationMode: 'ftf' | 'temp' | 'budget';
  maxTemperature: number;
}

const LiveSimulationView = forwardRef<LiveSimulationViewHandle, LiveSimulationViewProps>(
  ({ simulationMode, maxTemperature }, ref) => {
    const chartRef = useRef<CanvasChartHandle>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const progressTextRef = useRef<HTMLSpanElement>(null);
    const statRefs = useRef<{
      current: HTMLSpanElement | null;
      temp: HTMLSpanElement | null;
      power: HTMLSpanElement | null;
      conduction: HTMLSpanElement | null;
      switching: HTMLSpanElement | null;
    }>({ current: null, temp: null, power: null, conduction: null, switching: null });

    // Update DOM directly — bypasses React entirely for 60fps stats
    const updateStats = useCallback((point: LiveDataPoint) => {
      const s = statRefs.current;
      if (s.current) s.current.textContent = `${point.current.toFixed(2)} A`;
      if (s.temp) s.temp.textContent = `${point.temperature.toFixed(1)} °C`;
      if (s.power) s.power.textContent = `${point.powerLoss.toFixed(2)} W`;
      if (s.conduction) s.conduction.textContent = `${point.conductionLoss.toFixed(2)} W`;
      if (s.switching) s.switching.textContent = `${point.switchingLoss.toFixed(2)} W`;

      // Update progress bar via DOM
      const progress = Math.min(100, point.progress);
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress}%`;
      }
      if (progressTextRef.current) {
        progressTextRef.current.textContent = `${progress.toFixed(1)}%`;
      }
    }, []);

    // Expose imperative handle to parent
    useImperativeHandle(ref, () => ({
      pushData: (points: LiveDataPoint[]) => {
        chartRef.current?.pushData(points);
        if (points.length > 0) {
          updateStats(points[points.length - 1]);
        }
      },
      clear: () => {
        chartRef.current?.clear();
        // Reset stats
        const s = statRefs.current;
        if (s.current) s.current.textContent = '0.00 A';
        if (s.temp) s.temp.textContent = '0.0 °C';
        if (s.power) s.power.textContent = '0.00 W';
        if (s.conduction) s.conduction.textContent = '0.00 W';
        if (s.switching) s.switching.textContent = '0.00 W';
        if (progressBarRef.current) progressBarRef.current.style.width = '0%';
        if (progressTextRef.current) progressTextRef.current.textContent = '0.0%';
      },
    }));

    const progressLabelMap = {
      ftf: "Progress to First Limit",
      temp: "Progress to Temp Limit",
      budget: "Progress to Budget Limit"
    };

    const progressDescriptionMap = {
      ftf: "Test will stop when any parameter (temp, power, budget, etc.) exceeds its limit.",
      temp: `Test will stop when junction temperature exceeds ${maxTemperature}°C.`,
      budget: `Test will stop when total power loss exceeds the defined cooling budget.`
    };

    return (
      <Card className="h-full bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Live Analysis</CardTitle>
          <CardDescription>Visualizing simulation progress in real-time...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Canvas chart — renders at 60fps */}
          <CanvasChart
            ref={chartRef}
            height={200}
            maxTemperature={maxTemperature}
            showPowerLoss={true}
          />

          {/* Live stats grid — updated via DOM manipulation, not React state */}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="bg-background/50 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Current</div>
              <span ref={el => { statRefs.current.current = el; }} className="text-sm font-bold text-blue-400">0.00 A</span>
            </div>
            <div className="bg-background/50 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Junction Temp</div>
              <span ref={el => { statRefs.current.temp = el; }} className="text-sm font-bold text-orange-400">0.0 °C</span>
            </div>
            <div className="bg-background/50 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Total Heat</div>
              <span ref={el => { statRefs.current.power = el; }} className="text-sm font-bold text-red-400">0.00 W</span>
            </div>
            <div className="bg-background/50 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Conduction</div>
              <span ref={el => { statRefs.current.conduction = el; }} className="text-sm font-bold text-purple-400">0.00 W</span>
            </div>
            <div className="bg-background/50 rounded-lg p-2">
              <div className="text-xs text-muted-foreground">Switching</div>
              <span ref={el => { statRefs.current.switching = el; }} className="text-sm font-bold text-green-400">0.00 W</span>
            </div>
          </div>

          {/* Progress bar — updated via DOM, not state */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">{progressLabelMap[simulationMode]}</span>
              <span ref={progressTextRef} className="text-sm font-bold text-primary">0.0%</span>
            </div>
            <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                ref={progressBarRef}
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-none"
                style={{ width: '0%' }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              {progressDescriptionMap[simulationMode]}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
);

LiveSimulationView.displayName = 'LiveSimulationView';

export default LiveSimulationView;
