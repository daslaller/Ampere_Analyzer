"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Thermometer,
  Zap,
  Gauge,
  Power,
  ShieldAlert,
  BrainCircuit,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import type { SimulationResult, LiveDataPoint } from "@/lib/mosfet-types";

interface ResultsDisplayProps {
  isRunning: boolean;
  liveData: LiveDataPoint[];
  simulationResult: SimulationResult | null;
  simulationMode: "ftf" | "temp" | "budget";
  maxTemperature: number;
  onRunDeepDive?: () => void;
  isDeepDiveAvailable?: boolean;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: LiveDataPoint; value: number }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="font-medium">{`Current: ${data.current.toFixed(2)} A`}</p>
        <p className="text-sm text-muted-foreground">{`Temperature: ${data.temperature.toFixed(1)} °C`}</p>
        <p className="text-sm text-muted-foreground">{`Power Loss: ${data.powerLoss.toFixed(2)} W`}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Conduction: {data.conductionLoss.toFixed(2)}W | Switching: {data.switchingLoss.toFixed(2)}W
        </p>
      </div>
    );
  }
  return null;
};

function SmoothCounter({ value, decimals = 1 }: { value: number; decimals?: number }) {
  return <span>{value.toFixed(decimals)}</span>;
}

function ResultMetric({
  icon: Icon,
  label,
  value,
  unit,
  colorClass = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit: string;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-2 rounded-md bg-background">
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">
          {typeof value === "number" ? <SmoothCounter value={value} /> : value} {unit}
        </p>
      </div>
    </div>
  );
}

export function ResultsDisplay({
  isRunning,
  liveData,
  simulationResult,
  simulationMode,
  maxTemperature,
  onRunDeepDive,
  isDeepDiveAvailable,
}: ResultsDisplayProps) {
  const lastPoint = liveData.length > 0 ? liveData[liveData.length - 1] : null;
  const progress = lastPoint?.progress ?? 0;

  const progressLabelMap = {
    ftf: "Progress to First Limit",
    temp: "Progress to Temp Limit",
    budget: "Progress to Budget Limit",
  };

  // Live simulation view
  if (isRunning && liveData.length > 0) {
    const barChartData = lastPoint
      ? [
          { name: "Current (A)", value: lastPoint.current, fill: "hsl(var(--chart-1))" },
          { name: "Temp (°C)", value: lastPoint.temperature, fill: "hsl(var(--chart-2))" },
          { name: "Total (W)", value: lastPoint.powerLoss, fill: "hsl(var(--chart-3))" },
          { name: "Cond (W)", value: lastPoint.conductionLoss, fill: "hsl(var(--chart-4))" },
          { name: "Switch (W)", value: lastPoint.switchingLoss, fill: "hsl(var(--chart-5))" },
        ]
      : [];

    return (
      <div className="space-y-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Live Analysis</CardTitle>
            <CardDescription>Visualizing simulation progress in real-time...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Live Temperature Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="current"
                    tickFormatter={(v) => v.toFixed(1)}
                    label={{ value: "Current (A)", position: "bottom", offset: -5 }}
                    className="text-xs"
                  />
                  <YAxis
                    tickFormatter={(v) => v.toFixed(0)}
                    label={{ value: "Temp (°C)", angle: -90, position: "insideLeft" }}
                    className="text-xs"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#tempGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Live Bar Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progressLabelMap[simulationMode]}</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Awaiting state
  if (!simulationResult && !isRunning) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <Gauge className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <CardTitle className="text-lg mb-2">Awaiting Analysis</CardTitle>
          <CardDescription>
            Configure the simulation parameters and click &quot;Run Analysis&quot; to start.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isRunning && liveData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <div className="animate-spin h-12 w-12 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full" />
          <CardTitle className="text-lg mb-2">Preparing Analysis...</CardTitle>
          <CardDescription>The simulation is initializing. Please wait.</CardDescription>
        </CardContent>
      </Card>
    );
  }

  // Results view
  if (!simulationResult) return null;

  const isSuccess = simulationResult.status === "success";
  const failureIcons: Record<string, React.ElementType> = {
    Thermal: Thermometer,
    Current: Gauge,
    Voltage: Zap,
    "Power Dissipation": Power,
    "Cooling Budget": ShieldAlert,
  };
  const FailureIcon = simulationResult.failureReason
    ? failureIcons[simulationResult.failureReason] || AlertTriangle
    : AlertTriangle;

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Simulation Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Alert */}
          <Alert className={isSuccess ? "border-primary/50 bg-primary/5" : "border-destructive/50 bg-destructive/5"}>
            {isSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <FailureIcon className="h-4 w-4 text-destructive" />
            )}
            <AlertTitle>
              {isSuccess ? "Analysis Successful" : `Failure: ${simulationResult.failureReason} Limit Reached`}
            </AlertTitle>
            <AlertDescription>{simulationResult.details}</AlertDescription>
          </Alert>

          {/* Main Score */}
          <div className="text-center py-6 px-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">MAXIMUM SAFE CURRENT</p>
            <p className="text-5xl font-bold text-primary">
              <SmoothCounter value={simulationResult.maxSafeCurrent} decimals={2} />
            </p>
            <p className="text-xl text-muted-foreground">Amperes</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultMetric
              icon={Thermometer}
              label="Final Junction Temp"
              value={simulationResult.finalTemperature}
              unit="°C"
              colorClass="text-orange-500"
            />
            <ResultMetric
              icon={Power}
              label="Total Power Loss"
              value={simulationResult.powerDissipation.total}
              unit="W"
              colorClass="text-yellow-500"
            />
            <ResultMetric
              icon={TrendingUp}
              label="Conduction Loss"
              value={simulationResult.powerDissipation.conduction}
              unit="W"
              colorClass="text-blue-500"
            />
            <ResultMetric
              icon={Zap}
              label="Switching Loss"
              value={simulationResult.powerDissipation.switching}
              unit="W"
              colorClass="text-purple-500"
            />
          </div>

          {/* Analysis Graph */}
          {liveData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Temperature vs Current</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveData}>
                    <defs>
                      <linearGradient id="resultTempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="current" tickFormatter={(v) => v.toFixed(1)} className="text-xs" />
                    <YAxis tickFormatter={(v) => v.toFixed(0)} className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="hsl(var(--primary))"
                      fill="url(#resultTempGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AI Deep Dive Button */}
          {isDeepDiveAvailable && onRunDeepDive && (
            <Button onClick={onRunDeepDive} variant="outline" className="w-full gap-2">
              <BrainCircuit className="h-4 w-4" />
              Run AI Deep Dive Analysis
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
