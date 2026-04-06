import { create } from 'zustand';

export interface CodeBlock {
  id: string;
  agentId: number;
  filename: string;
  content: string;
  timestamp: number;
}

export interface AppState {
  isGenerating: boolean;
  activeAgentId: number | null;
  generatedFiles: Record<string, string>; // filename -> content
  codeLog: CodeBlock[];
  previewUrl: string | null;
  
  setIsGenerating: (val: boolean) => void;
  setActiveAgentId: (id: number | null) => void;
  addGeneratedCode: (block: CodeBlock) => void;
  setPreviewUrl: (url: string | null) => void;
  clearState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isGenerating: false,
  activeAgentId: null,
  generatedFiles: {},
  codeLog: [],
  previewUrl: null,
  
  setIsGenerating: (val) => set({ isGenerating: val }),
  setActiveAgentId: (id) => set({ activeAgentId: id }),
  addGeneratedCode: (block) => set((state) => ({
    codeLog: [...state.codeLog, block].slice(-50), // keep last 50
    generatedFiles: {
      ...state.generatedFiles,
      [block.filename]: (state.generatedFiles[block.filename] || '') + '\\n' + block.content
    }
  })),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  clearState: () => set({ isGenerating: false, activeAgentId: null, generatedFiles: {}, codeLog: [], previewUrl: null })
}));
