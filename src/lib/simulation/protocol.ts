import type { SimulationInput, SimulationProgress, SimulationResult } from '@/lib/types';

export interface SimulationRunMessage {
  type: 'run';
  requestId: string;
  input: SimulationInput;
}

export interface SimulationCancelMessage {
  type: 'cancel';
  requestId: string;
}

export type SimulationWorkerCommand = SimulationRunMessage | SimulationCancelMessage;

export interface SimulationProgressMessage {
  type: 'progress';
  requestId: string;
  progress: SimulationProgress;
}

export interface SimulationCompleteMessage {
  type: 'complete';
  requestId: string;
  result: SimulationResult;
}

export interface SimulationErrorMessage {
  type: 'error';
  requestId: string;
  error: string;
}

export type SimulationWorkerResponse = SimulationProgressMessage | SimulationCompleteMessage | SimulationErrorMessage;
