<script lang="ts">
  import { get } from 'svelte/store';
  import { onDestroy } from 'svelte';
  import { aiStore } from '@/lib/stores/ai';
  import { deepDiveStore } from '@/lib/stores/deep-dive';
  import { historyStore } from '@/lib/stores/history';
  import { simulationStore } from '@/lib/stores/simulation';
  import { formStore, buildSimulationInput } from '@/lib/form';
  import { coolingMethods, defaultFormValues, predefinedTransistors, transistorTypes } from '@/lib/constants';
  import { postFormData, postJson } from '@/lib/api';
  import { summarizeSimulation } from '@/lib/simulation/summary';
  import SectionCard from '@/lib/components/SectionCard.svelte';
  import LiveGraphCanvas from '@/lib/components/LiveGraphCanvas.svelte';
  import HistoryTable from '@/lib/components/HistoryTable.svelte';
  import DeepDivePanel from '@/lib/components/DeepDivePanel.svelte';
  import type {
    AiCalculatedExpectedResultsOutput,
    AiDeepDiveAnalysisOutput,
    AiOptimizationSuggestionsOutput,
    DeepDiveStep,
    ExtractTransistorSpecsOutput,
    FindDatasheetOutput,
    GetBestEffortSpecsOutput,
    HistoryEntry,
    SimulationFormValues,
    SimulationInput,
    SimulationResult
  } from '@/lib/types';

  let activeTab: 'analyzer' | 'history' = 'analyzer';
  let datasheetFile: File | null = null;
  let sourceMeta: SimulationInput['source'] = { kind: 'manual', label: 'Manual form entry' };
  let datasheetLookupResult: FindDatasheetOutput | null = null;

  const coolingGroups = coolingMethods.reduce<Record<string, typeof coolingMethods>>((groups, method) => {
    groups[method.group] = [...(groups[method.group] ?? []), method];
    return groups;
  }, {});

  function updateField<K extends keyof SimulationFormValues>(key: K, value: SimulationFormValues[K]) {
    formStore.patch({ [key]: value } as Pick<SimulationFormValues, K>);
    if (key !== 'predefinedComponent') {
      sourceMeta = sourceMeta.kind === 'predefined' ? { kind: 'manual', label: 'Manual form entry' } : sourceMeta;
    }
  }

  function parseOptionalNumber(value: string) {
    if (value.trim() === '') return null;
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function syncPredefined(value: string) {
    formStore.selectPredefined(value);
    sourceMeta = value
      ? { kind: 'predefined', label: `Predefined component: ${value}` }
      : { kind: 'manual', label: 'Manual form entry' };
  }

  function applySpecs(specs: ExtractTransistorSpecsOutput | GetBestEffortSpecsOutput, source: SimulationInput['source']) {
    formStore.applyExtractedSpecs(specs);
    sourceMeta = source;
  }

  async function handleDatasheetLookup() {
    aiStore.begin('datasheetLookup');
    datasheetLookupResult = null;

    try {
      const componentName = $formStore.componentName.trim();
      const result = await postJson<FindDatasheetOutput | null>('/api/datasheet/find', { componentName });
      datasheetLookupResult = result;
      if (result) {
        aiStore.succeed('datasheetLookup', result);
      } else {
        aiStore.clear('datasheetLookup');
      }
    } catch (error) {
      aiStore.fail('datasheetLookup', error instanceof Error ? error.message : 'Lookup failed.');
    }
  }

  async function handleDatasheetExtract() {
    if (!$formStore.componentName.trim() || !datasheetFile) return;
    aiStore.begin('datasheetExtract');

    try {
      const formData = new FormData();
      formData.set('componentName', $formStore.componentName.trim());
      formData.set('datasheet', datasheetFile);
      const result = await postFormData<ExtractTransistorSpecsOutput>('/api/datasheet/extract', formData);
      applySpecs(result, { kind: 'datasheet', label: datasheetFile.name, confidence: 'High' });
      aiStore.succeed('datasheetExtract', result);
    } catch (error) {
      aiStore.fail('datasheetExtract', error instanceof Error ? error.message : 'Datasheet parse failed.');
    }
  }

  async function handleBestEffort() {
    aiStore.begin('bestEffort');

    try {
      const result = await postJson<GetBestEffortSpecsOutput>('/api/specs/best-effort', {
        componentName: $formStore.componentName.trim()
      });
      applySpecs(result, {
        kind: 'best-effort',
        label: 'AI best-effort search',
        confidence: result.confidence
      });
      aiStore.succeed('bestEffort', result);
    } catch (error) {
      aiStore.fail('bestEffort', error instanceof Error ? error.message : 'Best-effort search failed.');
    }
  }

  function createHistoryEntry(input: SimulationInput, result: SimulationResult): HistoryEntry {
    return {
      id: crypto.randomUUID(),
      componentName: input.componentName,
      timestamp: new Date().toISOString(),
      source: input.source,
      input,
      result
    };
  }

  async function runSimulationWithSource(source = sourceMeta, historyLabel?: string) {
    deepDiveStore.reset();
    aiStore.clear('expectedResults');
    aiStore.clear('suggestions');
    const input = buildSimulationInput($formStore, historyLabel ? { ...source, label: historyLabel } : source);
    const result = await simulationStore.run(input);
    historyStore.add(createHistoryEntry(input, result));
    return { input, result };
  }

  async function handleRunSimulation() {
    try {
      await runSimulationWithSource();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleExpectedResults() {
    const input = buildSimulationInput($formStore, sourceMeta);
    aiStore.begin('expectedResults');

    try {
      const result = await postJson<AiCalculatedExpectedResultsOutput>('/api/ai/expected-results', {
        componentName: input.componentName,
        source: {
          ...input.source,
          notes: datasheetLookupResult?.foundDatasheetName ?? ''
        },
        deviceLimits: input.deviceLimits,
        operatingConditions: input.operatingConditions,
        thermalModel: input.thermalModel
      });
      aiStore.succeed('expectedResults', result);
    } catch (error) {
      aiStore.fail('expectedResults', error instanceof Error ? error.message : 'Expected results failed.');
    }
  }

  async function handleSuggestions() {
    const currentResult = $simulationStore.result;
    if (!currentResult) return;

    aiStore.begin('suggestions');
    try {
      const input = buildSimulationInput($formStore, sourceMeta);
      const result = await postJson<AiOptimizationSuggestionsOutput>('/api/ai/suggestions', {
        componentName: input.componentName,
        coolingMethod: input.thermalModel.coolingMethod,
        maxTemperature: input.deviceLimits.maxTemperature,
        coolingBudget: input.thermalModel.coolingBudget,
        simulationResults: summarizeSimulation(input, currentResult)
      });
      aiStore.succeed('suggestions', result);
    } catch (error) {
      aiStore.fail('suggestions', error instanceof Error ? error.message : 'Suggestions failed.');
    }
  }

  function createDeepDiveSteps(recommendation: AiDeepDiveAnalysisOutput): DeepDiveStep[] {
    return [
      {
        id: 'review',
        title: 'Review Initial Run',
        description: 'Lock in the current baseline and confirm the original limiting factor before we try to improve it.',
        inputPatch: {},
        result: $simulationStore.result
      },
      {
        id: 'frequency',
        title: `Test ${recommendation.optimalFrequency} kHz`,
        description: 'Reduce switching stress first and see how much headroom frequency alone recovers.',
        inputPatch: {
          switchingFrequency: recommendation.optimalFrequency
        },
        result: null
      },
      {
        id: 'cooling',
        title: `Apply ${recommendation.bestCoolingMethod}`,
        description: 'Pair the AI-selected cooler with the optimized switching frequency and re-run the simulation.',
        inputPatch: {
          switchingFrequency: recommendation.optimalFrequency,
          coolingMethod: recommendation.bestCoolingMethod
        },
        result: null
      },
      {
        id: 'final',
        title: 'Final Recommendation',
        description: recommendation.reasoning,
        inputPatch: {
          switchingFrequency: recommendation.optimalFrequency,
          coolingMethod: recommendation.bestCoolingMethod
        },
        result: null
      }
    ];
  }

  async function handleDeepDive() {
    const baselineResult = $simulationStore.result;
    if (!baselineResult) return;

    aiStore.begin('deepDive');

    try {
      const input = buildSimulationInput($formStore, sourceMeta);
      const recommendation = await postJson<AiDeepDiveAnalysisOutput>('/api/ai/deep-dive', {
        componentName: input.componentName,
        coolingMethod: input.thermalModel.coolingMethod,
        maxTemperature: input.deviceLimits.maxTemperature,
        coolingBudget: input.thermalModel.coolingBudget,
        simulationResults: summarizeSimulation(input, baselineResult),
        allCoolingMethods: JSON.stringify(coolingMethods),
        initialSpecs: JSON.stringify(input)
      });

      aiStore.succeed('deepDive', recommendation);
      const steps = createDeepDiveSteps(recommendation);
      deepDiveStore.start(steps);
      deepDiveStore.advance(0, steps[0]);

      for (let index = 1; index < steps.length - 1; index += 1) {
        const step = steps[index];
        formStore.patch(step.inputPatch);
        const simulationInput = buildSimulationInput(get(formStore), {
          kind: 'ai-optimized',
          label: `AI Deep Dive: ${step.title}`,
          confidence: 'Medium'
        });
        const result = await simulationStore.run(simulationInput);
        const resolvedStep = { ...step, result };
        steps[index] = resolvedStep;
        deepDiveStore.advance(index, resolvedStep);
      }

      const finalResult = steps[steps.length - 2].result;
      if (finalResult) {
        const finalStep = { ...steps[steps.length - 1], result: finalResult };
        deepDiveStore.advance(steps.length - 1, finalStep);
        historyStore.add(createHistoryEntry(buildSimulationInput(get(formStore), {
          kind: 'ai-optimized',
          label: 'AI optimized deep dive',
          confidence: 'Medium'
        }), finalResult));
      }

      deepDiveStore.complete();
    } catch (error) {
      aiStore.fail('deepDive', error instanceof Error ? error.message : 'Deep dive failed.');
      deepDiveStore.fail(error instanceof Error ? error.message : 'Deep dive failed.');
    }
  }

  function applyDeepDiveRecommendation() {
    const deepDiveResult = $aiStore.deepDive.data;
    if (!deepDiveResult) return;
    formStore.patch({
      switchingFrequency: deepDiveResult.optimalFrequency,
      coolingMethod: deepDiveResult.bestCoolingMethod
    });
    sourceMeta = {
      kind: 'ai-optimized',
      label: 'AI deep dive recommendation',
      confidence: 'Medium'
    };
  }

  function resetAnalyzer() {
    formStore.reset();
    sourceMeta = { kind: 'manual', label: 'Manual form entry' };
    datasheetFile = null;
    datasheetLookupResult = null;
    aiStore.reset();
    deepDiveStore.reset();
    simulationStore.reset();
  }

  onDestroy(() => {
    simulationStore.destroy();
  });

  $: form = $formStore;
  $: simulation = $simulationStore;
  $: ai = $aiStore;
  $: deepDive = $deepDiveStore;
</script>

<svelte:head>
  <title>Ampere Analyzer</title>
  <meta name="description" content="SvelteKit-based power transistor simulation studio with worker-driven live graphing and AI-assisted analysis." />
</svelte:head>

<main class="shell">
  <section class="hero">
    <span class="eyebrow">Master branch rewrite in SvelteKit</span>
    <h1>Ampere Analyzer</h1>
    <p>
      We rebuilt the analyzer around a shared TypeScript simulation core, a canvas live graph, and explicit AI actions so the UI stays responsive while the worker does the heavy lifting.
    </p>
    <div class="top-actions">
      <span class="status-pill">Source: {sourceMeta.label}</span>
      {#if simulation.status === 'running'}
        <button class="button ghost" on:click={() => simulationStore.cancel()}>Cancel Run</button>
      {/if}
      <button class="button ghost" on:click={resetAnalyzer}>Reset Analyzer</button>
    </div>
  </section>

  <div class="tabs">
    <button class:active={activeTab === 'analyzer'} class="tab" on:click={() => (activeTab = 'analyzer')}>Analyzer</button>
    <button class:active={activeTab === 'history'} class="tab" on:click={() => (activeTab = 'history')}>History</button>
  </div>

  {#if activeTab === 'history'}
    <SectionCard title="Stored Runs" description="Quick access to recent simulations and AI-optimized follow-ups.">
      <HistoryTable history={$historyStore} onClear={() => historyStore.clear()} />
    </SectionCard>
  {:else}
    <div class="layout-grid">
      <div class="stack">
        <SectionCard title="Device And Conditions" description="Feed the worker a clean, normalized set of operating inputs.">
          <div class="form-grid">
            <div class="field full">
              <label for="predefined">Predefined component</label>
              <select id="predefined" class="select" value={form.predefinedComponent} on:change={(event) => syncPredefined((event.currentTarget as HTMLSelectElement).value)}>
                <option value="">Select a component</option>
                {#each predefinedTransistors as transistor}
                  <option value={transistor.value}>{transistor.name}</option>
                {/each}
              </select>
            </div>

            <div class="field full">
              <label for="componentName">Component name</label>
              <input
                id="componentName"
                class="input"
                value={form.componentName}
                placeholder="IRFZ44N"
                on:input={(event) => updateField('componentName', (event.currentTarget as HTMLInputElement).value)}
              />
            </div>

            <div class="field full">
              <label for="datasheet">Datasheet PDF</label>
              <input
                id="datasheet"
                class="input"
                type="file"
                accept=".pdf,application/pdf"
                on:change={(event) => {
                  const fileList = (event.currentTarget as HTMLInputElement).files;
                  datasheetFile = fileList?.[0] ?? null;
                }}
              />
            </div>

            <div class="button-row">
              <button class="button secondary" on:click={handleDatasheetLookup} disabled={!form.componentName.trim() || ai.datasheetLookup.loading}>Lookup Datasheet</button>
              <button class="button ghost" on:click={handleDatasheetExtract} disabled={!form.componentName.trim() || !datasheetFile}>Parse Uploaded PDF</button>
              <button class="button ghost" on:click={handleBestEffort} disabled={!form.componentName.trim() || ai.bestEffort.loading}>Use Best Effort</button>
            </div>

            {#if ai.datasheetLookup.error}
              <div class="notice error"><strong>Datasheet lookup failed</strong>{ai.datasheetLookup.error}</div>
            {/if}

            {#if datasheetLookupResult}
              <div class="notice">
                <strong>{datasheetLookupResult.foundDatasheetName}</strong>
                Found a likely datasheet. Upload the actual PDF if you want real extraction, or use best-effort search if you only need a quick fill.
              </div>
            {/if}

            {#if ai.bestEffort.data}
              <div class="notice">
                <strong>Best-effort specs loaded</strong>
                Confidence: {ai.bestEffort.data.confidence}. Sources: {ai.bestEffort.data.sources}
              </div>
            {/if}

            {#if ai.datasheetExtract.data}
              <div class="notice">
                <strong>Datasheet specs loaded</strong>
                Parsed from {sourceMeta.label}. The form now reflects the extracted values instead of simulated placeholders.
              </div>
            {/if}

            {#if ai.datasheetExtract.error}
              <div class="notice error"><strong>Datasheet extraction failed</strong>{ai.datasheetExtract.error}</div>
            {/if}

            <div class="field full">
              <label for="transistorType">Transistor type</label>
              <select id="transistorType" class="select" value={form.transistorType} on:change={(event) => updateField('transistorType', (event.currentTarget as HTMLSelectElement).value)}>
                {#each transistorTypes as type}
                  <option value={type}>{type}</option>
                {/each}
              </select>
            </div>

            <div class="field-grid">
              <div class="field">
                <span class="micro-label">Max current (A)</span>
                <input class="input" type="number" value={form.maxCurrent} on:input={(event) => updateField('maxCurrent', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Max voltage (V)</span>
                <input class="input" type="number" value={form.maxVoltage} on:input={(event) => updateField('maxVoltage', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Operating voltage (V)</span>
                <input class="input" type="number" value={form.operatingVoltage} on:input={(event) => updateField('operatingVoltage', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Duty cycle (0-1)</span>
                <input class="input" type="number" step="0.05" value={form.dutyCycle} on:input={(event) => updateField('dutyCycle', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Power dissipation (W)</span>
                <input class="input" type="number" value={form.powerDissipation ?? ''} on:input={(event) => updateField('powerDissipation', parseOptionalNumber((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">RthJC (C/W)</span>
                <input class="input" type="number" step="0.01" value={form.rthJC} on:input={(event) => updateField('rthJC', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Rise time (ns)</span>
                <input class="input" type="number" value={form.riseTime} on:input={(event) => updateField('riseTime', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Fall time (ns)</span>
                <input class="input" type="number" value={form.fallTime} on:input={(event) => updateField('fallTime', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              {#if form.transistorType.includes('MOSFET') || form.transistorType.includes('GaN')}
                <div class="field">
                  <span class="micro-label">Rds(on) (mOhm)</span>
                  <input class="input" type="number" value={form.rdsOn ?? ''} on:input={(event) => updateField('rdsOn', parseOptionalNumber((event.currentTarget as HTMLInputElement).value))} />
                </div>
              {:else}
                <div class="field">
                  <span class="micro-label">Vce(sat) (V)</span>
                  <input class="input" type="number" value={form.vceSat ?? ''} on:input={(event) => updateField('vceSat', parseOptionalNumber((event.currentTarget as HTMLInputElement).value))} />
                </div>
              {/if}
              <div class="field">
                <span class="micro-label">Max junction temp (C)</span>
                <input class="input" type="number" value={form.maxTemperature} on:input={(event) => updateField('maxTemperature', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
            </div>

            <div class="field-grid">
              <div class="field">
                <span class="micro-label">Frequency (kHz)</span>
                <input class="input" type="number" value={form.switchingFrequency} on:input={(event) => updateField('switchingFrequency', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Ambient temp (C)</span>
                <input class="input" type="number" value={form.ambientTemperature} on:input={(event) => updateField('ambientTemperature', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field full">
                <span class="micro-label">Cooling method</span>
                <select class="select" value={form.coolingMethod} on:change={(event) => updateField('coolingMethod', (event.currentTarget as HTMLSelectElement).value)}>
                  {#each Object.entries(coolingGroups) as [group, methods]}
                    <optgroup label={group}>
                      {#each methods as method}
                        <option value={method.value}>{method.name} ({method.coolingBudget} W)</option>
                      {/each}
                    </optgroup>
                  {/each}
                </select>
              </div>
              <div class="field">
                <span class="micro-label">Cooling budget override (W)</span>
                <input class="input" type="number" value={form.coolingBudget ?? ''} on:input={(event) => updateField('coolingBudget', parseOptionalNumber((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Precision steps</span>
                <input class="input" type="number" min="10" max="500" value={form.precisionSteps} on:input={(event) => updateField('precisionSteps', Number((event.currentTarget as HTMLInputElement).value))} />
              </div>
              <div class="field">
                <span class="micro-label">Simulation mode</span>
                <select class="select" value={form.simulationMode} on:change={(event) => updateField('simulationMode', (event.currentTarget as HTMLSelectElement).value as SimulationFormValues['simulationMode'])}>
                  <option value="ftf">First to fail</option>
                  <option value="temp">Thermal only</option>
                  <option value="budget">Cooling budget only</option>
                </select>
              </div>
              <div class="field">
                <span class="micro-label">Algorithm</span>
                <select class="select" value={form.simulationAlgorithm} on:change={(event) => updateField('simulationAlgorithm', (event.currentTarget as HTMLSelectElement).value as SimulationFormValues['simulationAlgorithm'])}>
                  <option value="iterative">Iterative sweep</option>
                  <option value="binary">Binary search</option>
                </select>
              </div>
            </div>

            <div class="button-row">
              <button class="button" on:click={handleRunSimulation} disabled={simulation.status === 'running'}>Run Simulation</button>
              <button class="button ghost" on:click={() => formStore.patch(defaultFormValues)}>Restore Defaults</button>
            </div>
          </div>
        </SectionCard>
      </div>

      <div class="stack">
        <SectionCard tone="accent" title="Live Analysis" description="Worker-backed progress stays isolated from the rest of the page while the canvas repaints on animation frames.">
          <div class="stack">
            <LiveGraphCanvas points={simulation.points} mode={form.simulationMode} maxTemperature={form.maxTemperature} />

            {#if simulation.error}
              <div class="notice error"><strong>Simulation failed</strong>{simulation.error}</div>
            {/if}

            {#if simulation.result}
              <div class="result-hero">
                <span class="label">{simulation.result.analysisStatus}</span>
                <span class="value">{simulation.result.maxSafeCurrent.toFixed(2)} A</span>
                <p class="summary">{simulation.result.details}</p>
              </div>

              <div class="metrics-grid">
                <div class="metric">
                  <span>Limiting factor</span>
                  <strong>{simulation.result.limitingFactor ?? 'None in sweep'}</strong>
                </div>
                <div class="metric">
                  <span>Final temperature</span>
                  <strong>{simulation.result.finalTemperature.toFixed(2)} C</strong>
                </div>
                <div class="metric">
                  <span>Total power loss</span>
                  <strong>{simulation.result.powerLoss.total.toFixed(2)} W</strong>
                </div>
                <div class="metric">
                  <span>Conduction loss</span>
                  <strong>{simulation.result.powerLoss.conduction.toFixed(2)} W</strong>
                </div>
                <div class="metric">
                  <span>Switching loss</span>
                  <strong>{simulation.result.powerLoss.switching.toFixed(2)} W</strong>
                </div>
                <div class="metric">
                  <span>Sample count</span>
                  <strong>{simulation.result.seriesSummary.sampleCount}</strong>
                </div>
              </div>

              <div class="button-row">
                <button class="button secondary" on:click={handleExpectedResults} disabled={ai.expectedResults.loading}>Generate AI Expected Results</button>
                <button class="button ghost" on:click={handleSuggestions} disabled={ai.suggestions.loading}>Ask For AI Suggestions</button>
                <button class="button warn" on:click={handleDeepDive} disabled={ai.deepDive.loading}>Run AI Deep Dive</button>
              </div>
            {:else if simulation.status === 'running'}
              <div class="notice">
                <strong>Simulation in progress</strong>
                The worker is streaming batches into a bounded buffer so the graph stays responsive while the rest of the UI remains interactive.
              </div>
            {:else}
              <div class="notice">
                <strong>No result yet</strong>
                We’re ready to run as soon as the input set looks right.
              </div>
            {/if}
          </div>
        </SectionCard>

        {#if ai.expectedResults.data || ai.expectedResults.error}
          <SectionCard title="AI Expected Results" description="Structured AI estimate from the normalized device and operating model.">
            {#if ai.expectedResults.error}
              <div class="notice error"><strong>Expected results failed</strong>{ai.expectedResults.error}</div>
            {/if}
            {#if ai.expectedResults.data}
              <div class="metrics-grid">
                <div class="metric">
                  <span>Expected max current</span>
                  <strong>{ai.expectedResults.data.expectedMaxCurrent.toFixed(2)} A</strong>
                </div>
                <div class="metric">
                  <span>Expected max voltage</span>
                  <strong>{ai.expectedResults.data.expectedMaxVoltage.toFixed(2)} V</strong>
                </div>
                <div class="metric">
                  <span>Expected max temperature</span>
                  <strong>{ai.expectedResults.data.expectedMaxTemperature.toFixed(2)} C</strong>
                </div>
              </div>
              <div class="callout">
                <strong>Reasoning</strong>
                <p>{ai.expectedResults.data.reasoning}</p>
              </div>
            {/if}
          </SectionCard>
        {/if}

        {#if ai.suggestions.data || ai.suggestions.error}
          <SectionCard title="AI Optimization Suggestions" description="Only shown when we explicitly request it after a completed run.">
            {#if ai.suggestions.error}
              <div class="notice error"><strong>Suggestion request failed</strong>{ai.suggestions.error}</div>
            {/if}
            {#if ai.suggestions.data}
              <div class="callout-list">
                {#each ai.suggestions.data.suggestions as suggestion}
                  <div class="callout">
                    <strong>Suggestion</strong>
                    <p>{suggestion}</p>
                  </div>
                {/each}
                <div class="callout">
                  <strong>Reasoning</strong>
                  <p>{ai.suggestions.data.reasoning}</p>
                </div>
              </div>
            {/if}
          </SectionCard>
        {/if}

        {#if deepDive.phase !== 'idle'}
          <SectionCard title="Deep Dive Timeline" description="The deep-dive runner reuses the same simulation pipeline and graph without forced remounts.">
            <DeepDivePanel
              phase={deepDive.phase}
              steps={deepDive.steps}
              currentStepIndex={deepDive.currentStepIndex}
              points={simulation.points}
              mode={form.simulationMode}
              maxTemperature={form.maxTemperature}
              latestResult={simulation.result}
              error={deepDive.error}
            />

            {#if ai.deepDive.data}
              <div class="button-row">
                <button class="button secondary" on:click={applyDeepDiveRecommendation}>Apply AI Recommendation</button>
              </div>
            {/if}
          </SectionCard>
        {/if}
      </div>
    </div>
  {/if}
</main>
