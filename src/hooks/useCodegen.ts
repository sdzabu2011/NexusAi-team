'use client';
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { AGENTS } from '@/constants/agents';
import { CODE_SNIPPETS, FILE_NAMES } from '@/constants/codegen';
import { randomInt, randomItem } from '@/lib/utils/helpers';
import type { GeneratedFile, LogEntry } from '@/types';

const LOG_TYPES = ['write','read','test','deploy','optimize','review'] as const;

export function useCodegen() {
  const { setIsGenerating, setActiveAgentId, setProgress, setSynthesized, addGeneratedFile, addLogEntry, clearAll } = useAppStore();
  const stopRef = useRef(false);

  const stop = useCallback(() => {
    stopRef.current = true;
    setIsGenerating(false);
    setActiveAgentId(null);
  }, [setIsGenerating, setActiveAgentId]);

  const start = useCallback((prompt: string, totalFiles = 80) => {
    stopRef.current = false;
    clearAll();
    setIsGenerating(true);

    let done = 0;
    const tick = () => {
      if (stopRef.current || done >= totalFiles) {
        if (!stopRef.current) { setIsGenerating(false); setActiveAgentId(null); setSynthesized(true); setProgress(100); }
        return;
      }
      const agent = AGENTS[done % AGENTS.length];
      const snippets = CODE_SNIPPETS[agent.id] ?? ['// processing...'];
      const fileNames = FILE_NAMES[agent.id] ?? [`src/module_${done}.ts`];
      const snippet   = randomItem(snippets);
      const filename  = fileNames[done % fileNames.length];

      setActiveAgentId(agent.id);
      setProgress(Math.round((done / totalFiles) * 100));

      const file: GeneratedFile = {
        id: `f-${done}`, agentId: agent.id, agentName: agent.name, agentColor: agent.color,
        filename, content: snippet, language: filename.split('.').pop() ?? 'ts',
        timestamp: Date.now(), linesAdded: snippet.split('\n').length,
      };
      const log: LogEntry = {
        id: `l-${done}`, agentId: agent.id, agentName: agent.name, agentColor: agent.color,
        filename, snippet: snippet.split('\n')[0].trim().slice(0, 80),
        timestamp: Date.now(), type: randomItem([...LOG_TYPES]),
      };
      addGeneratedFile(file);
      addLogEntry(log);
      done++;
      setTimeout(tick, randomInt(100, 320));
    };
    tick();
  }, [clearAll, setIsGenerating, setActiveAgentId, setProgress, setSynthesized, addGeneratedFile, addLogEntry]);

  return { start, stop };
}
