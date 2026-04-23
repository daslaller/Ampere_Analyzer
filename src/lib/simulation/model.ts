import type {
  LimitingFactor,
  SimulationInput,
  SimulationPoint,
  SimulationPowerLoss,
  SimulationResult,
  SimulationSeriesSummary
} from '@/lib/types';

const CURRENT_SWEEP_BUFFER = 1e-9;

export function isMosfetLike(transistorType: string) {
  return transistorType.includes('MOSFET') || transistorType.includes('GaN');
}

export function calculatePowerLoss(input: SimulationInput, current: number): SimulationPowerLoss {
  const { deviceLimits, operatingConditions } = input;
  const dutyCycle = operatingConditions.dutyCycle;

  const conduction = isMosfetLike(deviceLimits.transistorType)
    ? Math.pow(current, 2) * ((deviceLimits.rdsOnMilliOhms ?? 0) / 1000) * dutyCycle
    : current * (deviceLimits.vceSat ?? 0) * dutyCycle;

  const switching =
    0.5 *
    operatingConditions.operatingVoltage *
    current *
    ((deviceLimits.riseTimeNs + deviceLimits.fallTimeNs) * 1e-9) *
    (operatingConditions.switchingFrequencyKHz * 1000);

  return {
    total: conduction + switching,
    conduction,
    switching
  };
}

export function evaluateLimits(input: SimulationInput, current: number) {
  const powerLoss = calculatePowerLoss(input, current);
  const totalRth = input.deviceLimits.rthJC + input.thermalModel.coolingThermalResistance;
  const finalTemperature = input.operatingConditions.ambientTemperature + powerLoss.total * totalRth;

  const staticVoltageExceeded = input.operatingConditions.operatingVoltage - input.deviceLimits.maxVoltage > CURRENT_SWEEP_BUFFER;
  const thermalExceeded = finalTemperature - input.deviceLimits.maxTemperature > CURRENT_SWEEP_BUFFER;
  const powerExceeded =
    input.deviceLimits.powerDissipation !== null &&
    powerLoss.total - input.deviceLimits.powerDissipation > CURRENT_SWEEP_BUFFER;
  const budgetExceeded = powerLoss.total - input.thermalModel.coolingBudget > CURRENT_SWEEP_BUFFER;
  const currentExceeded = current - input.deviceLimits.maxCurrent > CURRENT_SWEEP_BUFFER;

  let limitingFactor: LimitingFactor = null;

  switch (input.searchMode.mode) {
    case 'temp':
      if (thermalExceeded) limitingFactor = 'Thermal';
      break;
    case 'budget':
      if (budgetExceeded) limitingFactor = 'Cooling Budget';
      break;
    default:
      if (staticVoltageExceeded) limitingFactor = 'Voltage';
      else if (thermalExceeded) limitingFactor = 'Thermal';
      else if (powerExceeded) limitingFactor = 'Power Dissipation';
      else if (budgetExceeded) limitingFactor = 'Cooling Budget';
      else if (currentExceeded) limitingFactor = 'Current';
      break;
  }

  return {
    withinLimits: limitingFactor === null,
    limitingFactor,
    finalTemperature,
    powerLoss
  };
}

export function calculateProgressPercent(input: SimulationInput, point: ReturnType<typeof evaluateLimits>, current: number) {
  const voltageRatio = input.operatingConditions.operatingVoltage / input.deviceLimits.maxVoltage;
  const tempRatio = point.finalTemperature / input.deviceLimits.maxTemperature;
  const powerRatio =
    input.deviceLimits.powerDissipation === null ? 0 : point.powerLoss.total / input.deviceLimits.powerDissipation;
  const budgetRatio = point.powerLoss.total / input.thermalModel.coolingBudget;
  const currentRatio = current / input.deviceLimits.maxCurrent;

  switch (input.searchMode.mode) {
    case 'temp':
      return Math.min(tempRatio * 100, 100);
    case 'budget':
      return Math.min(budgetRatio * 100, 100);
    default:
      return Math.min(Math.max(tempRatio, powerRatio, budgetRatio, currentRatio, voltageRatio) * 100, 100);
  }
}

export function buildSimulationPoint(input: SimulationInput, current: number, sampleIndex: number): SimulationPoint {
  const evaluated = evaluateLimits(input, current);

  return {
    sampleIndex,
    current,
    temperature: evaluated.finalTemperature,
    powerLoss: evaluated.powerLoss.total,
    conductionLoss: evaluated.powerLoss.conduction,
    switchingLoss: evaluated.powerLoss.switching,
    progressPercent: calculateProgressPercent(input, evaluated, current),
    limitingFactor: evaluated.limitingFactor,
    withinLimits: evaluated.withinLimits
  };
}

export function createSeriesSummary(points: SimulationPoint[], sortedByCurrent: boolean): SimulationSeriesSummary {
  if (points.length === 0) {
    return {
      sampleCount: 0,
      minCurrent: 0,
      maxCurrent: 0,
      maxTemperature: 0,
      maxPowerLoss: 0,
      sortedByCurrent
    };
  }

  return {
    sampleCount: points.length,
    minCurrent: Math.min(...points.map((point) => point.current)),
    maxCurrent: Math.max(...points.map((point) => point.current)),
    maxTemperature: Math.max(...points.map((point) => point.temperature)),
    maxPowerLoss: Math.max(...points.map((point) => point.powerLoss)),
    sortedByCurrent
  };
}

export function formatResultDetails(result: {
  analysisStatus: SimulationResult['analysisStatus'];
  maxSafeCurrent: number;
  limitingFactor: LimitingFactor;
  limitCurrent: number | null;
  finalTemperature: number;
  powerLoss: SimulationPowerLoss;
}) {
  if (result.analysisStatus === 'input_invalid' && result.limitingFactor === 'Voltage') {
    return 'Operating voltage exceeds the device voltage rating. Reduce operating voltage before running the simulation.';
  }

  if (result.analysisStatus === 'within_limits') {
    return `Device stayed within the selected limits up to ${result.maxSafeCurrent.toFixed(2)} A in the current sweep window.`;
  }

  const limitCurrent = result.limitCurrent === null ? 'the evaluated point' : `${result.limitCurrent.toFixed(2)} A`;
  return `${result.limitingFactor ?? 'A limit'} was reached at ${limitCurrent}. Junction temperature was ${result.finalTemperature.toFixed(2)} °C and total power loss was ${result.powerLoss.total.toFixed(2)} W.`;
}
