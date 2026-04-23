import { writable } from 'svelte/store';
import type { DeepDivePhase, DeepDiveStep } from '@/lib/types';

interface DeepDiveState {
  phase: DeepDivePhase;
  currentStepIndex: number;
  steps: DeepDiveStep[];
  error: string | null;
}

const initialState: DeepDiveState = {
  phase: 'idle',
  currentStepIndex: 0,
  steps: [],
  error: null
};

function createDeepDiveStore() {
  const { subscribe, set, update } = writable<DeepDiveState>(initialState);

  return {
    subscribe,
    reset() {
      set(initialState);
    },
    start(steps: DeepDiveStep[]) {
      set({
        phase: 'running',
        currentStepIndex: 0,
        steps,
        error: null
      });
    },
    advance(stepIndex: number, step: DeepDiveStep) {
      update((state) => {
        const steps = [...state.steps];
        steps[stepIndex] = step;
        return {
          ...state,
          phase: 'running',
          currentStepIndex: stepIndex,
          steps
        };
      });
    },
    complete() {
      update((state) => ({ ...state, phase: 'complete' }));
    },
    fail(error: string) {
      update((state) => ({ ...state, phase: 'error', error }));
    }
  };
}

export const deepDiveStore = createDeepDiveStore();
