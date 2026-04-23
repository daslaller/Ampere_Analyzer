import type { SimulationInput, SimulationResult } from '@/lib/types';

export function summarizeSimulation(input: SimulationInput, result: SimulationResult) {
  return [
    `Component: ${input.componentName}`,
    `Mode: ${input.searchMode.mode}`,
    `Algorithm: ${input.searchMode.algorithm}`,
    `Operating Voltage: ${input.operatingConditions.operatingVoltage} V`,
    `Frequency: ${input.operatingConditions.switchingFrequencyKHz} kHz`,
    `Duty Cycle: ${(input.operatingConditions.dutyCycle * 100).toFixed(1)}%`,
    `Cooling Method: ${input.thermalModel.coolingMethod}`,
    `Analysis Status: ${result.analysisStatus}`,
    `Limiting Factor: ${result.limitingFactor ?? 'None within sweep window'}`,
    `Max Safe Current: ${result.maxSafeCurrent.toFixed(2)} A`,
    `Final Temperature: ${result.finalTemperature.toFixed(2)} °C`,
    `Total Power Loss: ${result.powerLoss.total.toFixed(2)} W`,
    `Details: ${result.details}`
  ].join('\n');
}
