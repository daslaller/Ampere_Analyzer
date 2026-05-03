"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { MOSFETParams, generateIVCurves } from "@/lib/mosfet-types";
import { Activity } from "lucide-react";

interface IVCurveChartProps {
  params: MOSFETParams;
  vgsValues: number[];
  vdsMax: number;
}

const VGS_COLORS = [
  "hsl(165, 70%, 50%)",
  "hsl(200, 65%, 55%)",
  "hsl(50, 70%, 55%)",
  "hsl(25, 80%, 55%)",
  "hsl(280, 50%, 60%)",
  "hsl(340, 70%, 55%)",
];

export function IVCurveChart({ params, vgsValues, vdsMax }: IVCurveChartProps) {
  const isNChannel = params.vth >= 0;
  
  const chartData = useMemo(() => {
    const rawData = generateIVCurves(params, vgsValues, vdsMax, 80);
    const grouped: Record<number, Record<string, number>> = {};
    
    rawData.forEach(({ vds, id, vgs }) => {
      const vdsKey = Math.abs(vds).toFixed(2);
      if (!grouped[parseFloat(vdsKey)]) {
        grouped[parseFloat(vdsKey)] = { vds: parseFloat(vdsKey) };
      }
      grouped[parseFloat(vdsKey)][`vgs_${vgs.toFixed(1)}`] = Math.abs(id);
    });
    
    return Object.values(grouped).sort((a, b) => a.vds - b.vds);
  }, [params, vgsValues, vdsMax]);

  const maxId = useMemo(() => {
    let max = 0;
    chartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key.startsWith("vgs_") && point[key] > max) {
          max = point[key];
        }
      });
    });
    return max * 1.1;
  }, [chartData]);

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            Output Characteristics (I<sub>D</sub> vs V<sub>DS</sub>)
          </h3>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {isNChannel ? "N-Channel" : "P-Channel"}
        </Badge>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.4}
            />
            <XAxis
              dataKey="vds"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              label={{
                value: "VDS (V)",
                position: "insideBottom",
                offset: -5,
                style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
              }}
            />
            <YAxis
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
                style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
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
              itemStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(4)} A`,
                name.replace("vgs_", "VGS = ") + " V",
              ]}
              labelFormatter={(v) => `VDS = ${v} V`}
            />
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value: string) =>
                value.replace("vgs_", "VGS = ") + " V"
              }
            />
            
            <ReferenceLine
              y={0}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
            
            {vgsValues.map((vgs, index) => (
              <Line
                key={`vgs_${vgs}`}
                type="monotone"
                dataKey={`vgs_${vgs.toFixed(1)}`}
                stroke={VGS_COLORS[index % VGS_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {vgsValues.map((vgs, index) => (
          <Badge
            key={vgs}
            variant="outline"
            className="font-mono text-xs"
            style={{
              borderColor: VGS_COLORS[index % VGS_COLORS.length],
              color: VGS_COLORS[index % VGS_COLORS.length],
            }}
          >
            V<sub>GS</sub> = {vgs}V
          </Badge>
        ))}
      </div>
    </Card>
  );
}
