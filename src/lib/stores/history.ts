import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { HistoryEntry } from '@/lib/types';

const STORAGE_KEY = 'ampere-analyzer-history-v2';

function createHistoryStore() {
  const { subscribe, set, update } = writable<HistoryEntry[]>([]);

  const load = () => {
    if (!browser) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryEntry[];
      set(parsed);
    } catch (error) {
      console.error('Failed to load history', error);
    }
  };

  const persist = (entries: HistoryEntry[]) => {
    if (!browser) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to persist history', error);
    }
  };

  return {
    subscribe,
    load,
    add(entry: HistoryEntry) {
      update((entries) => {
        const next = [entry, ...entries].slice(0, 50);
        persist(next);
        return next;
      });
    },
    clear() {
      persist([]);
      set([]);
    }
  };
}

export const historyStore = createHistoryStore();
