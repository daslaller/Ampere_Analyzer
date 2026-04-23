import type { SimulationInput, SimulationPoint, SimulationProgress, SimulationResult } from '@/lib/types';
import { buildSimulationPoint, createSeriesSummary, evaluateLimits, formatResultDetails } from './model';

interface SimulationRunOptions {
  onProgress?: (progress: SimulationProgress) => void;
  isCancelled?: () => boolean;
}

function createProgress(points: SimulationPoint[], algorithm: SimulationInput['searchMode']['algorithm'], sortedByCurrent: boolean): SimulationProgress {
  return {
    algorithm,
    points,
    latestPoint: points.at(-1) ?? null,
    seriesSummary: createSeriesSummary(points, sortedByCurrent)
  };
}

function finalizeResult(input: SimulationInput, points: SimulationPoint[], maxSafeCurrent: number, limitPoint: SimulationPoint | null, analysisStatus: SimulationResult['analysisStatus']): SimulationResult {
  const finalPoint = limitPoint ?? points.at(-1) ?? buildSimulationPoint(input, 0, 0);
  const evaluatedSafePoint = evaluateLimits(input, maxSafeCurrent);
  const finalTemperature = analysisStatus === 'limit_reached' ? finalPoint.temperature : evaluatedSafePoint.finalTemperature;
  const powerLoss = analysisStatus === 'limit_reached'
    ? {
        total: finalPoint.powerLoss,
        conduction: finalPoint.conductionLoss,
        switching: finalPoint.switchingLoss
      }
    : evaluatedSafePoint.powerLoss;

  const result: SimulationResult = {
    analysisStatus,
    maxSafeCurrent,
    limitingFactor: analysisStatus === 'limit_reached' || analysisStatus === 'input_invalid' ? finalPoint.limitingFactor : null,
    limitCurrent: analysisStatus === 'limit_reached' || analysisStatus === 'input_invalid' ? finalPoint.current : null,
    details: '',
    finalTemperature,
    powerLoss,
    finalPoint,
    seriesSummary: createSeriesSummary(points, input.searchMode.algorithm === 'iterative')
  };

  result.details = formatResultDetails(result);
  return result;
}

export async function runSimulationEngine(input: SimulationInput, options: SimulationRunOptions = {}): Promise<SimulationResult> {
  const { algorithm, precisionSteps, currentSweepMultiplier, epsilon } = input.searchMode;

  const upfrontPoint = buildSimulationPoint(input, 0, 0);
  if (!upfrontPoint.withinLimits && upfrontPoint.limitingFactor === 'Voltage') {
    options.onProgress?.(createProgress([upfrontPoint], algorithm, true));
    return finalizeResult(input, [upfrontPoint], 0, upfrontPoint, 'input_invalid');
  }

  if (algorithm === 'iterative') {
    const points: SimulationPoint[] = [];
    const maxCurrentRange = input.deviceLimits.maxCurrent * currentSweepMultiplier;
    const stepSize = maxCurrentRange / precisionSteps;
    let maxSafeCurrent = 0;
    const batch: SimulationPoint[] = [];

    for (let index = 0; index <= precisionSteps; index += 1) {
      if (options.isCancelled?.()) {
        break;
      }

      const current = index * stepSize;
      const point = buildSimulationPoint(input, current, index);
      points.push(point);
      batch.push(point);

      if (batch.length >= 12) {
        options.onProgress?.(createProgress([...batch], algorithm, true));
        batch.length = 0;
      }

      if (point.withinLimits) {
        maxSafeCurrent = current;
        continue;
      }

      if (batch.length > 0) {
        options.onProgress?.(createProgress([...batch], algorithm, true));
      }

      return finalizeResult(input, points, maxSafeCurrent, point, 'limit_reached');
    }

    if (batch.length > 0) {
      options.onProgress?.(createProgress([...batch], algorithm, true));
    }

    return finalizeResult(input, points, maxSafeCurrent, null, 'within_limits');
  }

  const sampledPoints: SimulationPoint[] = [];
  let low = 0;
  let high = input.deviceLimits.maxCurrent * currentSweepMultiplier;
  let maxSafeCurrent = 0;
  const maxIterations = Math.max(12, Math.ceil(Math.log2(Math.max(high - low, epsilon) / epsilon)) + 2);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    if (options.isCancelled?.()) {
      break;
    }

    const mid = (low + high) / 2;
    const point = buildSimulationPoint(input, mid, iteration);
    sampledPoints.push(point);
    options.onProgress?.(createProgress([point], algorithm, false));

    if (point.withinLimits) {
      maxSafeCurrent = mid;
      low = mid;
    } else {
      high = mid;
    }

    if (high - low <= epsilon) {
      break;
    }
  }

  const finalLimitPoint = sampledPoints.find((point) => !point.withinLimits) ?? null;
  return finalizeResult(
    input,
    sampledPoints,
    maxSafeCurrent,
    finalLimitPoint,
    finalLimitPoint ? 'limit_reached' : 'within_limits'
  );
}
