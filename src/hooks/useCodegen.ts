'use client';
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useModelStore } from '@/store/modelStore';
import { AGENTS } from '@/constants/agents';
import { FILE_NAMES, generateFallbackFilename } from '@/constants/codegen';
import { randomItem } from '@/lib/utils/helpers';
import type { GeneratedFile, LogEntry } from '@/types';

const LOG_TYPES = ['write', 'read', 'test', 'deploy', 'optimize', 'review'] as const;

// ---------------------------------------------------------------------------
// resolveUniqueFilename
// ---------------------------------------------------------------------------
// Picks the next candidate name from the agent's static FILE_NAMES pool.
// If that name is already in `usedPaths` it tries subsequent pool entries
// (without wrapping / re-using), then falls back to the descriptive
// suffix-based generator.  The suffix counter is stored per-agent so the
// fallback names are deterministic and meaningful.
// ---------------------------------------------------------------------------
function resolveUniqueFilename(
  agentId: number,
  poolIndex: number,
  usedPaths: Set<string>,
  fallbackCounters: Map<number, number>,
): string {
  const pool = FILE_NAMES[agentId] ?? [];

  // Walk forward through the pool starting from poolIndex — never wrap
  // (wrapping is what caused the original duplicates).
  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(poolIndex + offset) % pool.length];
    // Only accept this candidate if it hasn't been used globally yet AND
    // its position in the pool is strictly >= poolIndex (no wrap-around re-use)
    // We relax the "no wrap" rule here and instead rely solely on the Set
    // to prevent duplicates — the Set check is the true guard.
    if (!usedPaths.has(candidate)) {
      return candidate;
    }
  }

  // All pool entries are exhausted or already used — generate a unique fallback.
  const agentMeta = AGENTS.find((a) => a.id === agentId) ?? {
    id: agentId,
    name: `Agent${agentId}`,
  };

  let counter = fallbackCounters.get(agentId) ?? 1;
  let fallback = generateFallbackFilename(agentMeta, counter);

  // Increment until we find a name that hasn't been used.
  while (usedPaths.has(fallback)) {
    counter += 1;
    fallback = generateFallbackFilename(agentMeta, counter);
  }

  fallbackCounters.set(agentId, counter + 1);
  return fallback;
}

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
    async (prompt: string, maxFiles: number = 80) => {
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

      // -------------------------------------------------------------------
      // Duplicate-prevention state — scoped to this single generation run.
      // usedPaths   : every filename/path that has been assigned so far.
      // poolCursors : per-agent cursor so each agent walks its own pool
      //               sequentially without jumping back to names already used.
      // fallbackCounters : per-agent counter for the suffix-based fallback
      //                    generator; starts at 1 and only increments.
      // -------------------------------------------------------------------
      const usedPaths = new Set<string>();
      const poolCursors = new Map<number, number>();
      const fallbackCounters = new Map<number, number>();

      for (let i = 0; i < maxFiles; i++) {
        if (stopRef.current) break;

        const agent = AGENTS[i % AGENTS.length];

        // Advance this agent's pool cursor sequentially.
        const cursor = poolCursors.get(agent.id) ?? 0;

        // Resolve a collision-free filename for this slot.
        const filename = resolveUniqueFilename(
          agent.id,
          cursor,
          usedPaths,
          fallbackCounters,
        );

        // Mark the chosen path as used and advance the cursor.
        usedPaths.add(filename);
        poolCursors.set(agent.id, cursor + 1);

        const ext = filename.split('.').pop() ?? 'ts';

        setActiveAgentId(agent.id);
        setProgress(Math.round((i / maxFiles) * 100));

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