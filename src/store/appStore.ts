import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GeneratedFile, LogEntry, Tab } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

interface AppState {
  // Generation
  isGenerating:    boolean;
  activeAgentId:   number | null;
  thinkingAgentId: number | null;  // Agent currently calling AI (rainbow ring)
  progress:        number;         // 0-100
  isSynthesized:   boolean;

  // Data
  generatedFiles: GeneratedFile[];
  codeLog:        LogEntry[];

  // UI
  selectedTab: Tab;
  maxFiles:    number;             // 1-1000, user-controlled
  prompt:      string;

  // Actions — generation
  setIsGenerating:    (v: boolean) => void;
  setActiveAgentId:   (id: number | null) => void;
  setThinkingAgentId: (id: number | null) => void;
  setProgress:        (p: number) => void;
  setSynthesized:     (v: boolean) => void;

  // Actions — data
  addGeneratedFile: (f: GeneratedFile) => void;
  addLogEntry:      (e: LogEntry) => void;

  // Actions — UI
  setSelectedTab: (t: Tab) => void;
  setMaxFiles:    (n: number) => void;
  setPrompt:      (p: string) => void;

  // Reset
  clearAll: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

const initialState = {
  isGenerating:    false,
  activeAgentId:   null,
  thinkingAgentId: null,
  progress:        0,
  isSynthesized:   false,
  generatedFiles:  [],
  codeLog:         [],
  selectedTab:     'dashboard' as Tab,
  maxFiles:        50,
  prompt:          '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Generation setters
      setIsGenerating:    (v) => set({ isGenerating: v },    false, 'setIsGenerating'),
      setActiveAgentId:   (id) => set({ activeAgentId: id }, false, 'setActiveAgentId'),
      setThinkingAgentId: (id) => set({ thinkingAgentId: id }, false, 'setThinkingAgentId'),
      setProgress:        (p) => set(
        { progress: Math.min(100, Math.max(0, Math.round(p))) },
        false,
        'setProgress',
      ),
      setSynthesized: (v) => set({ isSynthesized: v }, false, 'setSynthesized'),

      // Data setters
      addGeneratedFile: (f) =>
        set(
          (s) => ({ generatedFiles: [...s.generatedFiles, f] }),
          false,
          'addGeneratedFile',
        ),

      addLogEntry: (e) =>
        set(
          (s) => ({
            // Keep last 200 log entries to avoid memory bloat
            codeLog: [...s.codeLog, e].slice(-200),
          }),
          false,
          'addLogEntry',
        ),

      // UI setters
      setSelectedTab: (t) => set({ selectedTab: t }, false, 'setSelectedTab'),
      setMaxFiles: (n) =>
        set(
          { maxFiles: Math.min(1000, Math.max(1, Math.round(n))) },
          false,
          'setMaxFiles',
        ),
      setPrompt: (p) => set({ prompt: p }, false, 'setPrompt'),

      // Reset everything except maxFiles and prompt
      clearAll: () =>
        set(
          (s) => ({
            isGenerating:    false,
            activeAgentId:   null,
            thinkingAgentId: null,
            progress:        0,
            isSynthesized:   false,
            generatedFiles:  [],
            codeLog:         [],
            // Preserve user preferences
            maxFiles: s.maxFiles,
            prompt:   s.prompt,
          }),
          false,
          'clearAll',
        ),
    }),
    { name: 'NexusAI-AppStore' },
  ),
);