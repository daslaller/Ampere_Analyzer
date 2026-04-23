<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { SimulationPoint, SimulationMode } from '@/lib/types';

  export let points: SimulationPoint[] = [];
  export let mode: SimulationMode = 'ftf';
  export let maxTemperature = 150;
  export let latestLabel = 'Live Simulation';

  let canvas: HTMLCanvasElement | null = null;
  let host: HTMLDivElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let frame = 0;

  const colors = {
    grid: 'rgba(90, 101, 127, 0.28)',
    axis: '#8ca0bf',
    temperature: '#ffb14a',
    power: '#6dd3ff',
    text: '#d9e3f0',
    fill: 'rgba(109, 211, 255, 0.12)'
  };

  function scheduleDraw() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  }

  function drawLine(
    ctx: CanvasRenderingContext2D,
    values: number[],
    minValue: number,
    maxValue: number,
    width: number,
    height: number,
    color: string
  ) {
    if (values.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    values.forEach((value, index) => {
      const x = 48 + (index / Math.max(values.length - 1, 1)) * (width - 72);
      const normalized = (value - minValue) / Math.max(maxValue - minValue, 1);
      const y = height - 28 - normalized * (height - 56);

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }

  function draw() {
    if (!canvas || !host) return;
    const rect = host.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 320);
    const height = 260;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0f1726';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let index = 0; index < 5; index += 1) {
      const y = 24 + index * ((height - 52) / 4);
      ctx.beginPath();
      ctx.moveTo(48, y);
      ctx.lineTo(width - 24, y);
      ctx.stroke();
    }

    ctx.strokeStyle = colors.axis;
    ctx.beginPath();
    ctx.moveTo(48, 16);
    ctx.lineTo(48, height - 28);
    ctx.lineTo(width - 24, height - 28);
    ctx.stroke();

    ctx.fillStyle = colors.text;
    ctx.font = '12px "IBM Plex Mono", monospace';
    ctx.fillText(latestLabel, 48, 16);

    if (points.length === 0) {
      ctx.fillStyle = 'rgba(217, 227, 240, 0.8)';
      ctx.font = '14px "Space Grotesk", sans-serif';
      ctx.fillText('Run a simulation to stream live graph data here.', 48, height / 2);
      return;
    }

    const temperatures = points.map((point) => point.temperature);
    const powerLoss = points.map((point) => point.powerLoss);
    const maxPower = Math.max(...powerLoss, 1);
    const latest = points.at(-1);

    drawLine(ctx, temperatures, 0, Math.max(maxTemperature * 1.1, ...temperatures), width, height, colors.temperature);
    drawLine(ctx, powerLoss, 0, maxPower * 1.1, width, height, colors.power);

    ctx.fillStyle = colors.text;
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText(`Mode: ${mode.toUpperCase()}`, width - 116, 16);
    ctx.fillText(`Temp limit ${maxTemperature.toFixed(0)} C`, 56, 34);
    ctx.fillText(`Power max ${maxPower.toFixed(1)} W`, width - 132, height - 12);

    if (latest) {
      ctx.fillStyle = 'rgba(255, 177, 74, 0.18)';
      ctx.fillRect(56, height - 56, 140, 22);
      ctx.fillStyle = colors.text;
      ctx.fillText(`Current ${latest.current.toFixed(2)} A`, 64, height - 41);
    }
  }

  onMount(() => {
    scheduleDraw();

    if (host && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => scheduleDraw());
      resizeObserver.observe(host);
    }
  });

  onDestroy(() => {
    cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
  });

  $: points, scheduleDraw();
</script>

<div class="graph-shell" bind:this={host}>
  <canvas bind:this={canvas} aria-label="Live simulation graph"></canvas>
</div>
