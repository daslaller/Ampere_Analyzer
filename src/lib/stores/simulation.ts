import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { PointBuffer } from '@/lib/simulation/point-buffer';
import type { SimulationWorkerCommand, SimulationWorkerResponse } from '@/lib/simulation/protocol';
import type { SimulationInput, SimulationPoint, SimulationResult, SimulationSeriesSummary } from '@/lib/types';

interface SimulationState {
  status: 'idle' | 'running' | 'complete' | 'error';
  requestId: string | null;
  points: SimulationPoint[];
  latestPoint: SimulationPoint | null;
  result: SimulationResult | null;
  error: string | null;
  summary: SimulationSeriesSummary | null;
}

const initialState: SimulationState = {
  status: 'idle',
  requestId: null,
  points: [],
  latestPoint: null,
  result: null,
  error: null,
  summary: null
};

function createSimulationStore() {
  const buffer = new PointBuffer(240);
  const { subscribe, set, update } = writable<SimulationState>(initialState);
  let worker: Worker | null = null;

  const ensureWorker = () => {
    if (!browser) return null;
    if (!worker) {
      worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
        type: 'module'
      });
    }
    return worker;
  };

  const cleanup = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  };

  return {
    subscribe,
    async run(input: SimulationInput) {
      const activeWorker = ensureWorker();
      if (!activeWorker) {
        throw new Error('Simulation worker is only available in the browser.');
      }

      const requestId = crypto.randomUUID();
      buffer.clear();
      set({
        status: 'running',
        requestId,
        points: [],
        latestPoint: null,
        result: null,
        error: null,
        summary: null
      });

      const response = await new Promise<SimulationResult>((resolve, reject) => {
        const onMessage = (event: MessageEvent<SimulationWorkerResponse>) => {
          if (event.data.requestId !== requestId) {
            return;
          }

          if (event.data.type === 'progress') {
            const progress = event.data.progress;
            buffer.append(event.data.progress.points);
            update((state) => ({
              ...state,
              status: 'running',
              points: buffer.snapshot(),
              latestPoint: progress.latestPoint,
              summary: progress.seriesSummary
            }));
            return;
          }

          activeWorker.removeEventListener('message', onMessage);
          activeWorker.removeEventListener('error', onError);

          if (event.data.type === 'error') {
            reject(new Error(event.data.error));
            return;
          }

          resolve(event.data.result);
        };

        const onError = (error: ErrorEvent) => {
          activeWorker.removeEventListener('message', onMessage);
          activeWorker.removeEventListener('error', onError);
          reject(error.error instanceof Error ? error.error : new Error(error.message));
        };

        activeWorker.addEventListener('message', onMessage);
        activeWorker.addEventListener('error', onError);

        const message: SimulationWorkerCommand = {
          type: 'run',
          requestId,
          input
        };
        activeWorker.postMessage(message);
      }).catch((error) => {
        update((state) => ({
          ...state,
          status: 'error',
          error: error instanceof Error ? error.message : 'Simulation failed.'
        }));
        throw error;
      });

      update((state) => ({
        ...state,
        status: 'complete',
        result: response,
        latestPoint: response.finalPoint,
        summary: response.seriesSummary
      }));
      return response;
    },
    cancel() {
      update((state) => {
        if (state.requestId && worker) {
          const message: SimulationWorkerCommand = {
            type: 'cancel',
            requestId: state.requestId
          };
          worker.postMessage(message);
        }

        return {
          ...state,
          status: state.status === 'running' ? 'idle' : state.status
        };
      });
    },
    reset() {
      buffer.clear();
      set(initialState);
    },
    destroy() {
      cleanup();
      set(initialState);
    }
  };
}

export const simulationStore = createSimulationStore();
