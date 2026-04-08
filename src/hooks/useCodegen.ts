'use client';
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useModelStore } from '@/store/modelStore';
import { AGENTS } from '@/constants/agents';
import { FILE_NAMES, generateFallbackFilename } from '@/constants/codegen';
import { randomItem } from '@/lib/utils/helpers';
import type { GeneratedFile, LogEntry } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LOG_TYPES = [
  'write', 'read', 'test', 'deploy', 'optimize', 'review',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Unique filename resolver
// Walks each agent's static FILE_NAMES pool sequentially.
// Falls back to generateFallbackFilename() when pool is exhausted.
// The usedPaths Set is the ultimate collision guard.
// ─────────────────────────────────────────────────────────────────────────────

function resolveUniqueFilename(
  agentId: number,
  poolIndex: number,
  usedPaths: Set<string>,
  fallbackCounters: Map<number, number>,
): string {
  const pool = FILE_NAMES[agentId] ?? [];

  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(poolIndex + offset) % pool.length];
    if (!usedPaths.has(candidate)) return candidate;
  }

  // Pool exhausted — use descriptive fallback
  const agentMeta = AGENTS.find((a) => a.id === agentId) ?? {
    id: agentId,
    name: `Agent${agentId}`,
  };

  let counter = fallbackCounters.get(agentId) ?? 1;
  let fallback = generateFallbackFilename(agentMeta, counter);
  while (usedPaths.has(fallback)) {
    counter++;
    fallback = generateFallbackFilename(agentMeta, counter);
  }
  fallbackCounters.set(agentId, counter + 1);
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build prompt for each file — context-aware and agent-specific
// ─────────────────────────────────────────────────────────────────────────────

function buildFilePrompt(
  projectDescription: string,
  filename: string,
  agentName: string,
  agentRole: string,
): string {
  const ext = filename.split('.').pop() ?? 'ts';
  const langHint: Record<string, string> = {
    tsx: 'React TypeScript (TSX)',
    ts:  'TypeScript',
    js:  'JavaScript',
    py:  'Python',
    go:  'Go',
    rs:  'Rust',
    sql: 'SQL',
    css: 'CSS',
    md:  'Markdown',
    yaml: 'YAML',
    json: 'JSON',
    sh:  'Bash shell script',
    prisma: 'Prisma schema',
  };

  return `You are ${agentName}, a ${agentRole}.

Project: ${projectDescription}

Your task: Generate the file "${filename}" (${langHint[ext] ?? ext})

Critical rules — follow exactly:
1. Output ONLY the raw file content. Nothing else.
2. NO markdown code fences (no triple backticks).
3. NO explanation, no comments about what you are doing.
4. NO preamble like "Here is the file:" or "Sure! Below is..."
5. The code must be production-ready, complete, and fully functional.
6. Include proper imports, exports, types, and error handling.
7. Make it relevant to the project description above.
8. Name variables and functions descriptively, not generically.

Start writing the file content immediately:`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip accidental markdown fences from model output
// ─────────────────────────────────────────────────────────────────────────────

function stripFences(raw: string): string {
  return raw
    .replace(/^```[\w]*\r?\n?/, '')
    .replace(/\r?\n?```$/, '')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// useCodegen hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCodegen() {
  const {
    setIsGenerating,
    setActiveAgentId,
    setThinkingAgentId,
    setProgress,
    setSynthesized,
    addGeneratedFile,
    addLogEntry,
    clearAll,
  } = useAppStore();

  const { models } = useModelStore();
  const stopRef = useRef(false);

  // ── stop ──────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    stopRef.current = true;
    setIsGenerating(false);
    setActiveAgentId(null);
    setThinkingAgentId(null);
  }, [setIsGenerating, setActiveAgentId, setThinkingAgentId]);

  // ── start ─────────────────────────────────────────────────────────────────

  const start = useCallback(
    async (prompt: string, maxFiles: number = 50) => {
      stopRef.current = false;
      clearAll();
      setIsGenerating(true);
      setProgress(0);

      // ── Model selection: prefer Groq (faster), fallback to OpenRouter ──────
      const groqModels = models.filter((m) => m.provider === 'groq');
      const orModels   = models.filter((m) => m.provider === 'openrouter');

      // Use all available models in round-robin for variety
      const allModels  = [...groqModels, ...orModels];
      const primaryModel = groqModels[0] ?? orModels[0];
      const provider  = primaryModel?.provider ?? 'openrouter';
      const modelId   = primaryModel?.id ?? 'meta-llama/llama-3.3-70b-instruct:free';

      // ── Duplicate-prevention state ─────────────────────────────────────────
      const usedPaths       = new Set<string>();
      const poolCursors     = new Map<number, number>();
      const fallbackCounters = new Map<number, number>();

      // ── Main generation loop ───────────────────────────────────────────────
      for (let i = 0; i < maxFiles; i++) {
        if (stopRef.current) break;

        // Round-robin through agents
        const agent = AGENTS[i % AGENTS.length];

        // Sequential pool cursor per agent
        const cursor = poolCursors.get(agent.id) ?? 0;
        const filename = resolveUniqueFilename(
          agent.id,
          cursor,
          usedPaths,
          fallbackCounters,
        );
        usedPaths.add(filename);
        poolCursors.set(agent.id, cursor + 1);

        const ext = filename.split('.').pop() ?? 'ts';

        // Update UI state
        setActiveAgentId(agent.id);
        setProgress(Math.round((i / maxFiles) * 100));

        // ── THINKING state — rainbow animation shows now ───────────────────
        setThinkingAgentId(agent.id);

        let content = `// ${agent.name} — ${filename}\n// Generating…`;

        try {
          // Pick model in round-robin (variety across files)
          const modelForFile = allModels.length > 0
            ? allModels[i % allModels.length]
            : { provider, id: modelId };

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: modelForFile.provider,
              model: modelForFile.id,
              system: agent.system,
              messages: [
                {
                  role: 'user',
                  content: buildFilePrompt(
                    prompt,
                    filename,
                    agent.name,
                    agent.role,
                  ),
                },
              ],
              maxTokens: 1200,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const raw: string =
              data?.choices?.[0]?.message?.content ?? content;
            content = stripFences(raw);
          } else {
            const errData = await res.json().catch(() => ({}));
            content = `// ${agent.name}: API error ${res.status}\n// ${errData?.error ?? 'Unknown error'}\n// Retry or check your API keys in Render dashboard`;
          }
        } catch (err) {
          content = `// ${agent.name} network error\n// ${err instanceof Error ? err.message : 'Unknown'}\n// Check your internet connection`;
        }

        // ── Thinking done ─────────────────────────────────────────────────
        setThinkingAgentId(null);

        if (stopRef.current) break;

        // ── Build file & log objects ──────────────────────────────────────
        const file: GeneratedFile = {
          id: `f-${Date.now()}-${i}`,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          filename,
          content,
          language: ext,
          timestamp: Date.now(),
          linesAdded: content.split('\n').length,
        };

        const firstMeaningfulLine = content
          .split('\n')
          .find((l) => l.trim() && !l.trim().startsWith('//'))
          ?.trim()
          .slice(0, 90) ?? content.split('\n')[0].trim().slice(0, 90);

        const log: LogEntry = {
          id: `l-${Date.now()}-${i}`,
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          filename,
          snippet: firstMeaningfulLine,
          timestamp: Date.now(),
          type: randomItem([...LOG_TYPES]),
        };

        addGeneratedFile(file);
        addLogEntry(log);
      }

      // ── Generation complete ────────────────────────────────────────────────
      if (!stopRef.current) {
        setIsGenerating(false);
        setActiveAgentId(null);
        setThinkingAgentId(null);
        setSynthesized(true);
        setProgress(100);
      }
    },
    [
      models,
      clearAll,
      setIsGenerating,
      setActiveAgentId,
      setThinkingAgentId,
      setProgress,
      setSynthesized,
      addGeneratedFile,
      addLogEntry,
    ],
  );

  return { start, stop };
}