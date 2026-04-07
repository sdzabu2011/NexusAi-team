'use client';
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useModelStore } from '@/store/modelStore';
import { AGENTS } from '@/constants/agents';
import { FILE_NAMES } from '@/constants/codegen';
import { randomItem } from '@/lib/utils/helpers';
import type { GeneratedFile, LogEntry } from '@/types';

const LOG_TYPES = ['write', 'read', 'test', 'deploy', 'optimize', 'review'] as const;

export function useCodegen() {
  const {
    setIsGenerating,
    setActiveAgentId,
    setProgress,
    setSynthesized,
    addGeneratedFile,
    addLogEntry,
    clearAll,
  } = useAppStore();

  const { models } = useModelStore();
  const stopRef = useRef(false);

  const stop = useCallback(() => {
    stopRef.current = true;
    setIsGenerating(false);
    setActiveAgentId(null);
  }, [setIsGenerating, setActiveAgentId]);

  const start = useCallback(
    async (prompt: string) => {
      stopRef.current = false;
      clearAll();
      setIsGenerating(true);

      // Pick best available model — Groq is faster, OpenRouter as fallback
      const groqModels = models.filter((m) => m.provider === 'groq');
      const orModels = models.filter((m) => m.provider === 'openrouter');
      const primaryModel = groqModels[0] ?? orModels[0];
      const provider = primaryModel?.provider ?? 'openrouter';
      const modelId =
        primaryModel?.id ?? 'meta-llama/llama-3.3-70b-instruct:free';

      for (let i = 0; i < AGENTS.length; i++) {
        if (stopRef.current) break;

        const agent = AGENTS[i];
        const fileNames = FILE_NAMES[agent.id] ?? [`src/module_${i}.ts`];
        const filename = fileNames[i % fileNames.length];
        const ext = filename.split('.').pop() ?? 'ts';

        setActiveAgentId(agent.id);
        setProgress(Math.round((i / AGENTS.length) * 100));

        let content = `// ${agent.name} is generating ${filename}...`;

        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider,
              model: modelId,
              system: agent.system,
              messages: [
                {
                  role: 'user',
                  content: `Project description: ${prompt}\n\nGenerate the file: ${filename}\n\nRules:\n- Output ONLY the raw code\n- No markdown code blocks, no backticks\n- No explanation before or after\n- Make it production-quality and relevant to the project`,
                },
              ],
              maxTokens: 1024,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const raw: string =
              data?.choices?.[0]?.message?.content ?? content;
            // Strip accidental markdown code fences if model adds them
            content = raw
              .replace(/^```[\w]*\n?/, '')
              .replace(/\n?```$/, '')
              .trim();
          } else {
            content = `// ${agent.name}: API error ${res.status} — check your API keys in .env`;
          }
        } catch (err) {
          content = `// ${agent.name} error: ${err instanceof Error ? err.message : 'unknown'}`;
        }

        if (stopRef.current) break;

        const file: GeneratedFile = {
          id: `f-${i}`,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          filename,
          content,
          language: ext,
          timestamp: Date.now(),
          linesAdded: content.split('\n').length,
        };

        const log: LogEntry = {
          id: `l-${i}`,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          filename,
          snippet: content.split('\n')[0].trim().slice(0, 80),
          timestamp: Date.now(),
          type: randomItem([...LOG_TYPES]),
        };

        addGeneratedFile(file);
        addLogEntry(log);
      }

      if (!stopRef.current) {
        setIsGenerating(false);
        setActiveAgentId(null);
        setSynthesized(true);
        setProgress(100);
      }
    },
    [
      models,
      clearAll,
      setIsGenerating,
      setActiveAgentId,
      setProgress,
      setSynthesized,
      addGeneratedFile,
      addLogEntry,
    ],
  );

  return { start, stop };
}
