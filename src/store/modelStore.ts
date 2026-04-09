// src/store/modelStore.ts
import { create } from 'zustand';
import type { ModelInfo } from '@/types';

interface ModelState {
  models:      ModelInfo[];
  count:       number;
  lastSync:    number;
  isFetching:  boolean;
  source:      'api' | 'fallback' | null;
  
  setModels:   (m: ModelInfo[], source?: 'api' | 'fallback') => void;
  setFetching: (v: boolean) => void;
  reset:       () => void;
}

export const useModelStore = create<ModelState>((set) => ({
  models:      [],
  count:       0,
  lastSync:    0,
  isFetching:  false,
  source:      null,

  setModels: (m, source = 'api') =>
    set({
      models:   m,
      count:    m.length,
      lastSync: Date.now(),
      source,
    }),

  setFetching: (v) => set({ isFetching: v }),

  reset: () =>
    set({
      models:     [],
      count:      0,
      lastSync:   0,
      isFetching: false,
      source:     null,
    }),
}));