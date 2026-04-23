import { coolingMethods } from '@/lib/constants';
import type { SimulationInput, SimulationMode, SimulationAlgorithm } from '@/lib/types';

export function createSimulationInput(overrides: Partial<SimulationInput> = {}, mode: SimulationMode = 'ftf', algorithm: SimulationAlgorithm = 'iterative'): SimulationInput {
  const cooling = coolingMethods.find((method) => method.value === 'air-nh-d15') ?? coolingMethods[0];

  return {
    componentName: 'IRFZ44N',
    deviceLimits: {
      transistorType: 'MOSFET (N-Channel)',
      maxCurrent: 49,
      maxVoltage: 55,
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
    },
    thermalModel: {
      coolingMethod: cooling.name,
      coolingThermalResistance: cooling.thermalResistance,
      coolingBudget: cooling.coolingBudget
    },
    searchMode: {
      mode,
      algorithm,
      precisionSteps: 200,
      currentSweepMultiplier: 1.2,
      epsilon: 0.01
    },
    source: {
      kind: 'manual',
      label: 'Unit test'
    },
    ...overrides
  };
}
