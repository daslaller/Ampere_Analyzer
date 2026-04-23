import { describe, expect, it } from 'vitest';
import { runSimulationEngine } from './engine';
import { createSimulationInput } from './test-helpers';

describe('simulation engine', () => {
  it('keeps binary search valid for very low-current devices', async () => {
    const result = await runSimulationEngine(
      createSimulationInput(
        {
          componentName: '2N7000',
          deviceLimits: {
            transistorType: 'MOSFET (N-Channel)',
            maxCurrent: 0.2,
            maxVoltage: 60,
            powerDissipation: 0.4,
            rdsOnMilliOhms: 5000,
            vceSat: null,
            riseTimeNs: 20,
            fallTimeNs: 20,
            rthJC: 312.5,
            maxTemperature: 150
          }
        },
        'ftf',
        'binary'
      )
    );

    expect(result.maxSafeCurrent).toBeGreaterThanOrEqual(0);
    expect(result.seriesSummary.sampleCount).toBeGreaterThan(0);
  });

  it('returns comparable results between iterative and binary algorithms', async () => {
    const iterative = await runSimulationEngine(createSimulationInput({}, 'ftf', 'iterative'));
    const binary = await runSimulationEngine(createSimulationInput({}, 'ftf', 'binary'));

    expect(binary.limitingFactor).toBe(iterative.limitingFactor);
    const allowedDelta =
      (createSimulationInput({}, 'ftf', 'iterative').deviceLimits.maxCurrent *
        createSimulationInput({}, 'ftf', 'iterative').searchMode.currentSweepMultiplier) /
      createSimulationInput({}, 'ftf', 'iterative').searchMode.precisionSteps;

    expect(Math.abs(binary.maxSafeCurrent - iterative.maxSafeCurrent)).toBeLessThanOrEqual(allowedDelta);
  });
});
