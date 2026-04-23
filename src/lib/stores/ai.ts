import { writable } from 'svelte/store';
import type {
  AiCalculatedExpectedResultsOutput,
  AiDeepDiveAnalysisOutput,
  AiOptimizationSuggestionsOutput,
  ExtractTransistorSpecsOutput,
  FindDatasheetOutput,
  GetBestEffortSpecsOutput
} from '@/lib/types';

interface AsyncSlice<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

interface AiState {
  datasheetLookup: AsyncSlice<FindDatasheetOutput>;
  datasheetExtract: AsyncSlice<ExtractTransistorSpecsOutput>;
  bestEffort: AsyncSlice<GetBestEffortSpecsOutput>;
  expectedResults: AsyncSlice<AiCalculatedExpectedResultsOutput>;
  suggestions: AsyncSlice<AiOptimizationSuggestionsOutput>;
  deepDive: AsyncSlice<AiDeepDiveAnalysisOutput>;
}

const emptySlice = <T>(): AsyncSlice<T> => ({
  loading: false,
  error: null,
  data: null
});

function createAiStore() {
  const { subscribe, update, set } = writable<AiState>({
    datasheetLookup: emptySlice(),
    datasheetExtract: emptySlice(),
    bestEffort: emptySlice(),
    expectedResults: emptySlice(),
    suggestions: emptySlice(),
    deepDive: emptySlice()
  });

  return {
    subscribe,
    reset() {
      set({
        datasheetLookup: emptySlice(),
        datasheetExtract: emptySlice(),
        bestEffort: emptySlice(),
        expectedResults: emptySlice(),
        suggestions: emptySlice(),
        deepDive: emptySlice()
      });
    },
    begin<K extends keyof AiState>(key: K) {
      update((state) => ({
        ...state,
        [key]: {
          loading: true,
          error: null,
          data: state[key].data
        }
      }));
    },
    succeed<K extends keyof AiState>(key: K, data: NonNullable<AiState[K]['data']>) {
      update((state) => ({
        ...state,
        [key]: {
          loading: false,
          error: null,
          data
        }
      }));
    },
    fail<K extends keyof AiState>(key: K, error: string) {
      update((state) => ({
        ...state,
        [key]: {
          loading: false,
          error,
          data: state[key].data
        }
      }));
    },
    clear<K extends keyof AiState>(key: K) {
      update((state) => ({
        ...state,
        [key]: emptySlice()
      }));
    }
  };
}

export const aiStore = createAiStore();
