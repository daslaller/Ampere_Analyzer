import { get, writable } from 'svelte/store';
import { coolingMethods, defaultFormValues, predefinedTransistors } from './constants';
import type {
  ExtractTransistorSpecsOutput,
  GetBestEffortSpecsOutput,
  ManualSpecs,
  SimulationFormValues,
  SimulationInput
} from './types';

function parseNumber(value: string | number | null | undefined, fallback: number | null = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function applySpecsToForm(current: SimulationFormValues, specs: ManualSpecs): SimulationFormValues {
  const transistorType = specs.transistorType || current.transistorType;
  const mosfetLike = transistorType.includes('MOSFET') || transistorType.includes('GaN');

  return {
    ...current,
    transistorType,
    maxCurrent: parseNumber(specs.maxCurrent, current.maxCurrent) ?? current.maxCurrent,
    maxVoltage: parseNumber(specs.maxVoltage, current.maxVoltage) ?? current.maxVoltage,
    powerDissipation: parseNumber(specs.powerDissipation, current.powerDissipation),
    rdsOn: mosfetLike ? parseNumber(specs.rdsOn, current.rdsOn) : null,
    vceSat: mosfetLike ? null : parseNumber(specs.vceSat, current.vceSat),
    riseTime: parseNumber(specs.riseTime, current.riseTime) ?? current.riseTime,
    fallTime: parseNumber(specs.fallTime, current.fallTime) ?? current.fallTime,
    rthJC: parseNumber(specs.rthJC, current.rthJC) ?? current.rthJC,
    maxTemperature: parseNumber(specs.maxTemperature, current.maxTemperature) ?? current.maxTemperature
  };
}

function createFormStore() {
  const { subscribe, set, update } = writable<SimulationFormValues>(defaultFormValues);

  return {
    subscribe,
    reset: () => set(defaultFormValues),
    patch: (patch: Partial<SimulationFormValues>) => update((current) => ({ ...current, ...patch })),
    selectPredefined: (value: string) =>
      update((current) => {
        const component = predefinedTransistors.find((item) => item.value === value);
        if (!component) {
          return { ...current, predefinedComponent: value };
        }

        return applySpecsToForm(
          {
            ...current,
            predefinedComponent: component.value,
            componentName: component.name
          },
          component.specs
        );
      }),
    applyExtractedSpecs: (payload: ExtractTransistorSpecsOutput | GetBestEffortSpecsOutput | ManualSpecs) =>
      update((current) => applySpecsToForm(current, payload)),
    snapshot: () => get({ subscribe })
  };
}

export const formStore = createFormStore();

export function buildSimulationInput(values: SimulationFormValues, source: SimulationInput['source']): SimulationInput {
  const cooling = coolingMethods.find((method) => method.value === values.coolingMethod) ?? coolingMethods[0];
  const coolingBudget = values.coolingBudget && values.coolingBudget > 0 ? values.coolingBudget : cooling.coolingBudget;

  return {
    componentName: values.componentName || values.predefinedComponent || 'Unnamed Component',
    deviceLimits: {
      transistorType: values.transistorType,
      maxCurrent: values.maxCurrent,
      maxVoltage: values.maxVoltage,
      powerDissipation: values.powerDissipation,
      rdsOnMilliOhms: values.rdsOn,
      vceSat: values.vceSat,
      riseTimeNs: values.riseTime,
      fallTimeNs: values.fallTime,
      rthJC: values.rthJC,
      maxTemperature: values.maxTemperature
    },
    operatingConditions: {
      switchingFrequencyKHz: values.switchingFrequency,
      operatingVoltage: values.operatingVoltage,
      ambientTemperature: values.ambientTemperature,
      dutyCycle: values.dutyCycle
    },
    thermalModel: {
      coolingMethod: cooling.name,
      coolingThermalResistance: cooling.thermalResistance,
      coolingBudget
    },
    searchMode: {
      mode: values.simulationMode,
      algorithm: values.simulationAlgorithm,
      precisionSteps: values.precisionSteps,
      currentSweepMultiplier: values.simulationMode === 'temp' ? 1.5 : 1.2,
      epsilon: 0.01
    },
    source
  };
}
