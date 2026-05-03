"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { MOSFETParams, generateTransferCurve, calculateGm } from "@/lib/mosfet-types";
import { TrendingUp } from "lucide-react";

interface TransferCurveChartProps {
  params: MOSFETParams;
  vdsFixed: number;
  onVdsChange: (vds: number) => void;
}

export function TransferCurveChart({
  params,
  vdsFixed,
  onVdsChange,
}: TransferCurveChartProps) {
  const isNChannel = params.vth >= 0;
  const vgsMin = isNChannel ? 0 : params.vgsMax;
  const vgsMax = isNChannel ? params.vgsMax : 0;

  const chartData = useMemo(() => {
    const rawData = generateTransferCurve(params, vdsFixed, vgsMin, vgsMax, 100);
    
    return rawData.map(({ vgs, id }) => ({
      vgs: isNChannel ? vgs : Math.abs(vgs),
      id: Math.abs(id),
      gm: Math.abs(calculateGm(vgs, vdsFixed, params)),
    }));
  }, [params, vdsFixed, vgsMin, vgsMax, isNChannel]);

  const maxId = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.id));
    return max * 1.1 || 1;
  }, [chartData]);

  const maxGm = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.gm));
    return max * 1.1 || 0.1;
  }, [chartData]);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-foreground">
            Transfer Characteristics (I<sub>D</sub> vs V<sub>GS</sub>)
          </h3>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          V<sub>DS</sub> = {Math.abs(vdsFixed)}V
        </Badge>
      </div>

      {/* VDS Slider */}
      <div className="mb-4 space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-muted-foreground text-sm">
            V<sub>DS</sub> (Fixed)
          </Label>
          <span className="text-sm font-mono text-primary">
            {Math.abs(vdsFixed).toFixed(1)} V
          </span>
        </div>
        <Slider
          value={[Math.abs(vdsFixed)]}
          onValueChange={([v]) => onVdsChange(isNChannel ? v : -v)}
          min={0.5}
          max={Math.abs(params.vdsMax)}
          step={0.5}
          className="w-full"
        />
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 50, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="idGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(165, 70%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(165, 70%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.4}
            />
            <XAxis
              dataKey="vgs"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              label={{
                value: isNChannel ? "VGS (V)" : "|VGS| (V)",
                position: "insideBottom",
                offset: -5,
                style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
              }}
            />
            <YAxis
              yAxisId="left"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              domain={[0, maxId]}
              tickFormatter={(v) => (v >= 1 ? v.toFixed(1) : v.toFixed(3))}
              label={{
                value: "ID (A)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "hsl(165, 70%, 50%)", fontSize: 12 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              domain={[0, maxGm]}
              tickFormatter={(v) => v.toFixed(3)}
              label={{
                value: "gm (S)",
                angle: 90,
                position: "insideRight",
                style: { fill: "hsl(200, 65%, 55%)", fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              formatter={(value: number, name: string) => {
                if (name === "id") return [`${value.toFixed(4)} A`, "ID"];
                if (name === "gm") return [`${value.toFixed(4)} S`, "gm"];
                return [value, name];
              }}
              labelFormatter={(v) => `VGS = ${v} V`}
            />
            
            {/* Reference line at Vth */}
            <ReferenceLine
              x={Math.abs(params.vth)}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
              label={{
                value: "Vth",
                position: "top",
                fill: "hsl(var(--destructive))",
                fontSize: 11,
              }}
              yAxisId="left"
            />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="id"
              fill="url(#idGradient)"
              stroke="none"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="id"
              stroke="hsl(165, 70%, 50%)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="gm"
              stroke="hsl(200, 65%, 55%)"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[hsl(165,70%,50%)]" />
          <span className="text-muted-foreground">Drain Current (ID)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[hsl(200,65%,55%)] border-dashed" style={{ borderTopWidth: 2, borderTopStyle: 'dashed' }} />
          <span className="text-muted-foreground">Transconductance (gm)</span>
        </div>
      </div>
    </Card>
  );
}
