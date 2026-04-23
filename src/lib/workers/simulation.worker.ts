/// <reference lib="webworker" />

import { runSimulationEngine } from '@/lib/simulation/engine';
import type { SimulationWorkerCommand, SimulationWorkerResponse } from '@/lib/simulation/protocol';

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;
let activeRequestId: string | null = null;

ctx.onmessage = async (event: MessageEvent<SimulationWorkerCommand>) => {
  const message = event.data;

  if (message.type === 'cancel') {
    if (activeRequestId === message.requestId) {
      activeRequestId = null;
    }
    return;
  }

  activeRequestId = message.requestId;

  try {
    const result = await runSimulationEngine(message.input, {
      onProgress(progress) {
        if (activeRequestId !== message.requestId) return;
        const payload: SimulationWorkerResponse = {
          type: 'progress',
          requestId: message.requestId,
          progress
        };
        ctx.postMessage(payload);
      },
      isCancelled() {
        return activeRequestId !== message.requestId;
      }
    });

    if (activeRequestId !== message.requestId) {
      return;
    }

    const payload: SimulationWorkerResponse = {
      type: 'complete',
      requestId: message.requestId,
      result
    };
    ctx.postMessage(payload);
  } catch (error) {
    const payload: SimulationWorkerResponse = {
      type: 'error',
      requestId: message.requestId,
      error: error instanceof Error ? error.message : 'Simulation worker failed.'
    };
    ctx.postMessage(payload);
  }
};
