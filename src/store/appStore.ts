import { create } from 'zustand';
import type { GeneratedFile, LogEntry, Tab } from '@/types';

interface AppState {
  isGenerating:   boolean;
  activeAgentId:  number | null;
  prompt:         string;
  progress:       number;
  isSynthesized:  boolean;
  generatedFiles: GeneratedFile[];
  codeLog:        LogEntry[];
  selectedTab:    Tab;

  setPrompt:        (p: string) => void;
  setIsGenerating:  (v: boolean) => void;
  setActiveAgentId: (id: number | null) => void;
  setProgress:      (p: number) => void;
  setSynthesized:   (v: boolean) => void;
  addGeneratedFile: (f: GeneratedFile) => void;
  addLogEntry:      (e: LogEntry) => void;
  setSelectedTab:   (t: Tab) => void;
  clearAll:         () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isGenerating:   false,
  activeAgentId:  null,
  prompt:         '',
  progress:       0,
  isSynthesized:  false,
  generatedFiles: [],
  codeLog:        [],
  selectedTab:    'dashboard',

  setPrompt:        (p) => set({ prompt: p }),
  setIsGenerating:  (v) => set({ isGenerating: v }),
  setActiveAgentId: (id) => set({ activeAgentId: id }),
  setProgress:      (p) => set({ progress: Math.min(100, Math.max(0, p)) }),
  setSynthesized:   (v) => set({ isSynthesized: v }),
  setSelectedTab:   (t) => set({ selectedTab: t }),

  addGeneratedFile: (f) => set((s) => ({ generatedFiles: [...s.generatedFiles, f] })),
  addLogEntry:      (e) => set((s) => ({ codeLog: [...s.codeLog, e].slice(-150) })),

  clearAll: () => set({
    isGenerating: false, activeAgentId: null, progress: 0,
    isSynthesized: false, generatedFiles: [], codeLog: [],
  }),
}));
