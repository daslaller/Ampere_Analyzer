import { describe, expect, it } from 'vitest';
import { buildSimulationPoint } from './model';
import { createSimulationInput } from './test-helpers';

describe('simulation model', () => {
  it('uses operating voltage for switching loss instead of max voltage rating', () => {
    const input = createSimulationInput({
      deviceLimits: {
        transistorType: 'MOSFET (N-Channel)',
        maxCurrent: 49,
        maxVoltage: 120,
        powerDissipation: 94,
        rdsOnMilliOhms: 17.5,
        vceSat: null,
        riseTimeNs: 60,
        fallTimeNs: 45,
        rthJC: 1.5,
        maxTemperature: 175
      },
      operatingConditions: {
        switchingFrequencyKHz: 100,
        operatingVoltage: 48,
        ambientTemperature: 25,
        dutyCycle: 0.5
      }
    });

    const point = buildSimulationPoint(input, 10, 0);
    const expectedSwitching = 0.5 * 48 * 10 * ((60 + 45) * 1e-9) * 100000;
    expect(point.switchingLoss).toBeCloseTo(expectedSwitching, 6);
  });

  it('respects duty cycle in conduction loss', () => {
    const input = createSimulationInput({
      operatingConditions: {
        switchingFrequencyKHz: 100,
        operatingVoltage: 48,
        ambientTemperature: 25,
        dutyCycle: 0.25
      }
    });

    const point = buildSimulationPoint(input, 20, 0);
    const expectedConduction = Math.pow(20, 2) * 0.0175 * 0.25;
    expect(point.conductionLoss).toBeCloseTo(expectedConduction, 6);
  });

  it('flags voltage as an immediate invalid condition when operating voltage exceeds rating', () => {
    const input = createSimulationInput({
      deviceLimits: {
        transistorType: 'MOSFET (N-Channel)',
        maxCurrent: 49,
        maxVoltage: 40,
        powerDissipation: 94,
        rdsOnMilliOhms: 17.5,
        vceSat: null,
        riseTimeNs: 60,
        fallTimeNs: 45,
        rthJC: 1.5,
        maxTemperature: 175
      }
    });

    const point = buildSimulationPoint(input, 0, 0);
    expect(point.withinLimits).toBe(false);
    expect(point.limitingFactor).toBe('Voltage');
  });
});
