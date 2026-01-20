/**
 * Tauri Integration Helper
 *
 * This module provides a unified interface for running simulations that works
 * in both web (Web Worker) and desktop (Tauri) environments.
 */

import type { LiveDataPoint } from './types';

// Check if running in Tauri environment
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Simulation parameters matching the Rust struct
export interface TauriSimulationParams {
  maxCurrent: number;
  maxVoltage: number;
  powerDissipation: number | null;
  rthJc: number;
  riseTime: number;
  fallTime: number;
  switchingFrequency: number;
  maxTemperature: number;
  ambientTemperature: number;
  totalRth: number;
  transistorType: string;
  rdsOnOhms: number;
  vceSat: number | null;
  simulationMode: 'ftf' | 'temp' | 'budget';
  coolingBudget: number | null;
  simulationAlgorithm: 'iterative' | 'binary';
  precisionSteps: number;
  effectiveCoolingBudget: number;
}

// Result from Tauri simulation
export interface TauriSimulationResult {
  status: string;
  maxSafeCurrent: number;
  failureReason: string | null;
  details: string;
  finalTemperature: number;
  powerDissipation: {
    total: number;
    conduction: number;
    switching: number;
  };
  dataPoints: Array<{
    current: number;
    temperature: number;
    powerLoss: number;
    conductionLoss: number;
    switchingLoss: number;
    progress: number;
    limitValue: number;
    checkResult: {
      isSafe: boolean;
      failureReason: string | null;
      details: string;
      finalTemperature: number;
      powerDissipation: {
        total: number;
        conduction: number;
        switching: number;
      };
    };
  }>;
}

/**
 * Run simulation using Tauri backend (Rust)
 * This is much faster than the Web Worker approach and runs natively
 */
export async function runTauriSimulation(
  params: TauriSimulationParams
): Promise<TauriSimulationResult> {
  if (!isTauri()) {
    throw new Error('Tauri is not available. Running in web mode.');
  }

  // Dynamic import to avoid errors in web build
  const { invoke } = await import('@tauri-apps/api/core');

  return invoke<TauriSimulationResult>('run_simulation', { params });
}

/**
 * Convert Tauri data points to LiveDataPoint format for the frontend
 */
export function convertToLiveDataPoints(
  result: TauriSimulationResult
): LiveDataPoint[] {
  return result.dataPoints.map((dp) => ({
    current: dp.current,
    temperature: dp.temperature,
    powerLoss: dp.powerLoss,
    conductionLoss: dp.conductionLoss,
    switchingLoss: dp.switchingLoss,
    progress: dp.progress,
    limitValue: dp.limitValue,
  }));
}

/**
 * Get the application version from Tauri
 */
export async function getAppVersion(): Promise<string> {
  if (!isTauri()) {
    return 'web';
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('get_version');
}
