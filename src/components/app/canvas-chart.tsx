"use client";

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { LiveDataPoint } from '@/lib/types';

export interface CanvasChartHandle {
  /** Push new data points without triggering React re-renders */
  pushData: (points: LiveDataPoint[]) => void;
  /** Clear all data */
  clear: () => void;
}

interface CanvasChartProps {
  height?: number;
  maxTemperature?: number;
  showPowerLoss?: boolean;
}

// Colors
const PRIMARY_COLOR = 'rgba(66, 153, 225, 1)';      // blue
const PRIMARY_FILL = 'rgba(66, 153, 225, 0.15)';
const POWER_COLOR = 'rgba(245, 101, 101, 1)';        // red
const POWER_FILL = 'rgba(245, 101, 101, 0.08)';
const GRID_COLOR = 'rgba(255, 255, 255, 0.08)';
const AXIS_COLOR = 'rgba(160, 174, 192, 0.6)';
const TEXT_COLOR = 'rgba(160, 174, 192, 0.9)';
const TOOLTIP_BG = 'rgba(26, 32, 44, 0.92)';

/**
 * High-performance Canvas chart for real-time simulation data.
 *
 * This component bypasses React's reconciliation entirely for data updates.
 * New data is pushed via an imperative handle (ref), and rendering happens
 * on requestAnimationFrame — giving us true 60fps with zero DOM overhead.
 */
const CanvasChart = forwardRef<CanvasChartHandle, CanvasChartProps>(
  ({ height = 200, maxTemperature = 175, showPowerLoss = true }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dataRef = useRef<LiveDataPoint[]>([]);
    const animFrameRef = useRef<number | null>(null);
    const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
    const needsDrawRef = useRef(true);

    // Expose imperative methods to parent — no state, no re-renders
    useImperativeHandle(ref, () => ({
      pushData: (points: LiveDataPoint[]) => {
        dataRef.current = [...dataRef.current, ...points];
        // Cap at 300 points to keep drawing fast
        if (dataRef.current.length > 300) {
          dataRef.current = dataRef.current.slice(-300);
        }
        needsDrawRef.current = true;
      },
      clear: () => {
        dataRef.current = [];
        needsDrawRef.current = true;
      },
    }));

    // Draw the chart on canvas
    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = height;

      // Resize canvas if needed (high-DPI support)
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);
      }

      const data = dataRef.current;
      const pad = { top: 12, right: 60, bottom: 32, left: 50 };
      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;

      // Clear
      ctx.clearRect(0, 0, w, h);

      if (data.length < 2) {
        ctx.fillStyle = TEXT_COLOR;
        ctx.font = '13px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for data...', w / 2, h / 2);
        return;
      }

      // Compute axis ranges
      const currents = data.map(d => d.current);
      const temps = data.map(d => d.temperature);
      const powers = showPowerLoss ? data.map(d => d.powerLoss) : [];

      const minX = Math.min(...currents);
      const maxX = Math.max(...currents);
      const maxY = Math.max(maxTemperature, ...temps) * 1.1;
      const maxY2 = powers.length > 0 ? Math.max(...powers) * 1.2 : 0;

      const scaleX = (v: number) => pad.left + ((v - minX) / (maxX - minX || 1)) * plotW;
      const scaleY = (v: number) => pad.top + plotH - (v / maxY) * plotH;
      const scaleY2 = (v: number) => pad.top + plotH - (v / (maxY2 || 1)) * plotH;

      // Draw grid
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const y = pad.top + (plotH / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();
      }

      // Temperature limit line
      if (maxTemperature < maxY) {
        const limitY = scaleY(maxTemperature);
        ctx.strokeStyle = 'rgba(245, 101, 101, 0.4)';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pad.left, limitY);
        ctx.lineTo(w - pad.right, limitY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(245, 101, 101, 0.7)';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${maxTemperature}°C limit`, w - pad.right - 4, limitY - 4);
      }

      // Draw power loss area + line (right Y-axis)
      if (showPowerLoss && powers.length > 0) {
        // Area fill
        ctx.beginPath();
        ctx.moveTo(scaleX(data[0].current), scaleY2(0));
        for (let i = 0; i < data.length; i++) {
          ctx.lineTo(scaleX(data[i].current), scaleY2(data[i].powerLoss));
        }
        ctx.lineTo(scaleX(data[data.length - 1].current), scaleY2(0));
        ctx.closePath();
        ctx.fillStyle = POWER_FILL;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(scaleX(data[0].current), scaleY2(data[0].powerLoss));
        for (let i = 1; i < data.length; i++) {
          ctx.lineTo(scaleX(data[i].current), scaleY2(data[i].powerLoss));
        }
        ctx.strokeStyle = POWER_COLOR;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw temperature area fill
      ctx.beginPath();
      ctx.moveTo(scaleX(data[0].current), scaleY(0));
      for (let i = 0; i < data.length; i++) {
        ctx.lineTo(scaleX(data[i].current), scaleY(data[i].temperature));
      }
      ctx.lineTo(scaleX(data[data.length - 1].current), scaleY(0));
      ctx.closePath();
      ctx.fillStyle = PRIMARY_FILL;
      ctx.fill();

      // Draw temperature line
      ctx.beginPath();
      ctx.moveTo(scaleX(data[0].current), scaleY(data[0].temperature));
      for (let i = 1; i < data.length; i++) {
        ctx.lineTo(scaleX(data[i].current), scaleY(data[i].temperature));
      }
      ctx.strokeStyle = PRIMARY_COLOR;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glow dot on the latest point
      const latest = data[data.length - 1];
      const dotX = scaleX(latest.current);
      const dotY = scaleY(latest.temperature);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = PRIMARY_COLOR;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(66, 153, 225, 0.25)';
      ctx.fill();

      // X-axis labels
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const xTicks = 5;
      for (let i = 0; i <= xTicks; i++) {
        const val = minX + ((maxX - minX) / xTicks) * i;
        const x = scaleX(val);
        ctx.fillText(`${val.toFixed(1)}A`, x, h - pad.bottom + 16);
      }

      // Left Y-axis labels (temperature)
      ctx.textAlign = 'right';
      for (let i = 0; i <= gridLines; i++) {
        const val = (maxY / gridLines) * (gridLines - i);
        const y = pad.top + (plotH / gridLines) * i;
        ctx.fillStyle = TEXT_COLOR;
        ctx.fillText(`${val.toFixed(0)}°C`, pad.left - 6, y + 4);
      }

      // Right Y-axis labels (power)
      if (showPowerLoss && maxY2 > 0) {
        ctx.textAlign = 'left';
        for (let i = 0; i <= gridLines; i++) {
          const val = (maxY2 / gridLines) * (gridLines - i);
          const y = pad.top + (plotH / gridLines) * i;
          ctx.fillStyle = 'rgba(245, 101, 101, 0.7)';
          ctx.fillText(`${val.toFixed(0)}W`, w - pad.right + 6, y + 4);
        }
      }

      // Tooltip on hover
      if (mouseRef.current.active) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        // Find nearest data point
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < data.length; i++) {
          const dx = Math.abs(scaleX(data[i].current) - mx);
          if (dx < nearestDist) {
            nearestDist = dx;
            nearestIdx = i;
          }
        }

        if (nearestDist < 30) {
          const d = data[nearestIdx];
          const px = scaleX(d.current);
          const py = scaleY(d.temperature);

          // Crosshair
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(px, pad.top);
          ctx.lineTo(px, pad.top + plotH);
          ctx.stroke();
          ctx.setLineDash([]);

          // Dot
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = PRIMARY_COLOR;
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Tooltip box
          const lines = [
            `Current: ${d.current.toFixed(2)} A`,
            `Temp: ${d.temperature.toFixed(1)} °C`,
            `Power: ${d.powerLoss.toFixed(2)} W`,
          ];
          const tw = 160;
          const th = 54;
          let tx = px + 12;
          let ty = py - th - 8;
          if (tx + tw > w - pad.right) tx = px - tw - 12;
          if (ty < pad.top) ty = py + 12;

          ctx.fillStyle = TOOLTIP_BG;
          ctx.beginPath();
          ctx.roundRect(tx, ty, tw, th, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = 'white';
          ctx.font = '11px Inter, system-ui, sans-serif';
          ctx.textAlign = 'left';
          lines.forEach((line, i) => {
            ctx.fillText(line, tx + 8, ty + 16 + i * 14);
          });
        }
      }

      // Legend
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      const legendY = pad.top - 1;
      ctx.fillStyle = PRIMARY_COLOR;
      ctx.fillRect(pad.left, legendY, 10, 3);
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText('Temperature', pad.left + 14, legendY + 4);
      if (showPowerLoss) {
        ctx.fillStyle = POWER_COLOR;
        ctx.fillRect(pad.left + 90, legendY, 10, 3);
        ctx.fillStyle = TEXT_COLOR;
        ctx.fillText('Power Loss', pad.left + 104, legendY + 4);
      }
    }, [height, maxTemperature, showPowerLoss]);

    // Animation loop — only draws when data changes
    useEffect(() => {
      const loop = () => {
        if (needsDrawRef.current) {
          draw();
          needsDrawRef.current = false;
        }
        animFrameRef.current = requestAnimationFrame(loop);
      };
      animFrameRef.current = requestAnimationFrame(loop);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, [draw]);

    // Resize observer
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const observer = new ResizeObserver(() => {
        needsDrawRef.current = true;
      });
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    // Mouse events for tooltip
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
      needsDrawRef.current = true;
    }, []);

    const handleMouseLeave = useCallback(() => {
      mouseRef.current.active = false;
      needsDrawRef.current = true;
    }, []);

    return (
      <div ref={containerRef} className="w-full" style={{ height }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair"
        />
      </div>
    );
  }
);

CanvasChart.displayName = 'CanvasChart';

export default CanvasChart;
