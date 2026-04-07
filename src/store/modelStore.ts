import { create } from 'zustand';
import type { ModelInfo } from '@/types';

interface ModelState {
  models:      ModelInfo[];
  count:       number;
  lastSync:    number;
  isFetching:  boolean;
  setModels:   (m: ModelInfo[]) => void;
  setFetching: (v: boolean) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  models:      [],
  count:       0,
  lastSync:    0,
  isFetching:  false,
  setModels:   (m) => set({ models: m, count: m.length, lastSync: Date.now() }),
  setFetching: (v) => set({ isFetching: v }),
}));
