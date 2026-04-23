<script lang="ts">
  import LiveGraphCanvas from './LiveGraphCanvas.svelte';
  import type { DeepDivePhase, DeepDiveStep, SimulationPoint, SimulationResult, SimulationMode } from '@/lib/types';

  export let phase: DeepDivePhase = 'idle';
  export let steps: DeepDiveStep[] = [];
  export let currentStepIndex = 0;
  export let points: SimulationPoint[] = [];
  export let mode: SimulationMode = 'ftf';
  export let maxTemperature = 150;
  export let latestResult: SimulationResult | null = null;
  export let error: string | null = null;
</script>

<div class="deep-dive">
  <div class="deep-dive-header">
    <div>
      <h3>AI Deep Dive</h3>
      <p>State machine: <strong>{phase}</strong></p>
    </div>
    {#if phase === 'error' && error}
      <p class="error-text">{error}</p>
    {/if}
  </div>

  <div class="stepper">
    {#each steps as step, index}
      <article class:selected={index === currentStepIndex} class:complete={step.result !== null}>
        <span class="step-index">{index + 1}</span>
        <div>
          <h4>{step.title}</h4>
          <p>{step.description}</p>
        </div>
      </article>
    {/each}
  </div>

  <LiveGraphCanvas points={points} mode={mode} {maxTemperature} latestLabel="Deep Dive Simulation" />

  {#if latestResult}
    <div class="metrics-grid">
      <div class="metric">
        <span>Projected Safe Current</span>
        <strong>{latestResult.maxSafeCurrent.toFixed(2)} A</strong>
      </div>
      <div class="metric">
        <span>Limiting Factor</span>
        <strong>{latestResult.limitingFactor ?? 'None in sweep'}</strong>
      </div>
      <div class="metric">
        <span>Total Power Loss</span>
        <strong>{latestResult.powerLoss.total.toFixed(2)} W</strong>
      </div>
    </div>
  {/if}
</div>
