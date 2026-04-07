export const CODE_SNIPPETS: Record<number, string[]> = {
  1: [
    `const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-xl">
    <h3 className="font-mono text-sm tracking-widest text-purple-400 uppercase mb-3">{title}</h3>
    {children}
  </div>
);`,
    `export const Button = ({ variant = 'primary', children, onClick }: ButtonProps) => (
  <button onClick={onClick}
    className={cn('px-6 py-2 rounded-xl font-semibold transition-all', {
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]': variant === 'primary',
      'border border-white/20 hover:border-white/40 text-white': variant === 'ghost',
    })}>
    {children}
  </button>
);`,
    `const heroGradient = 'bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent';
const glassPanel = 'backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl';`,
  ],
  2: [
    `export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}`,
    `export const LazyChart = dynamic(() => import('@/components/dashboard/Chart'), {
  loading: () => <div className="h-48 animate-pulse bg-white/5 rounded-xl" />,
  ssr: false,
});`,
    `const [state, dispatch] = useReducer(reducer, initialState);
const memoizedValue = useMemo(() => computeExpensiveValue(state.data), [state.data]);
const stableCallback = useCallback((id: string) => dispatch({ type: 'SELECT', payload: id }), []);`,
  ],
  3: [
    `export async function POST(req: NextRequest) {
  try {
    const { model, messages, provider } = await req.json();
    if (!model) return NextResponse.json({ error: 'model required' }, { status: 400 });
    const result = await chatProxy({ model, messages, provider });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}`,
    `export const withAuth = (handler: RouteHandler) => async (req: NextRequest) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const payload = verifyToken(token);
    return handler(req, payload);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }
};`,
  ],
  4: [
    `model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  files       File[]
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}`,
    `CREATE TABLE agent_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   INTEGER NOT NULL,
  filename   VARCHAR(500),
  content    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_id);
CREATE INDEX idx_agent_logs_time  ON agent_logs(created_at DESC);`,
  ],
  5: [
    `export function verifyJWT(token: string): JWTPayload {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set');
  return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
}
export function signJWT(payload: Record<string, unknown>, expiresIn = '7d'): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn });
}`,
    `const rateLimit = new Map<string, { count: number; reset: number }>();
export function checkRateLimit(ip: string, limit = 30): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.reset) {
    rateLimit.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}`,
  ],
  6: [
    `export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'dark',
        setTheme: (t) => set({ theme: t }),
        user: null,
        setUser: (u) => set({ user: u }),
        reset: () => set(initialState),
      }),
      { name: 'nexus-app-storage' }
    )
  )
);`,
    `const selectActiveAgent = (s: AppState) => s.activeAgentId;
const selectGeneratedFiles = (s: AppState) => s.generatedFiles;
const selectProgress = (s: AppState) => s.progress;

// Derived selector - only rerenders when count changes
const selectFileCount = createSelector(selectGeneratedFiles, (files) => files.length);`,
  ],
  7: [
    `name: Deploy NexusAI
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - name: Deploy to Render
        run: curl -X POST \${{ secrets.RENDER_DEPLOY_HOOK }}`,
    `FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]`,
  ],
  8: [
    `/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};`,
    `export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: { port: 3000, proxy: { '/api': 'http://localhost:4000' } },
  build: {
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom'], ui: ['framer-motion', 'lucide-react'] } },
    },
  },
});`,
  ],
  9: [
    `export const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 300 } },
};`,
    `useEffect(() => {
  const ctx = canvasRef.current?.getContext('2d');
  if (!ctx) return;
  let raf: number;
  const particles = Array.from({ length: 100 }, createParticle);
  const tick = () => {
    ctx.fillStyle = 'rgba(2,4,16,0.3)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    particles.forEach(p => { update(p); draw(ctx, p); });
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, []);`,
  ],
  10: [
    `// ❌ Bug: missing await causes unhandled promise
// const data = fetch('/api').json();

// ✅ Fixed — always await both:
const res  = await fetch('/api/models');
if (!res.ok) throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
const data = await res.json();`,
    `// ❌ Memory leak: event listener added but never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // ✅ Cleanup is required to prevent memory leaks
  return () => window.removeEventListener('resize', handleResize);
}, [handleResize]); // ✅ handleResize in deps array`,
  ],
  11: [
    `describe('API /chat', () => {
  it('returns 400 when model is missing', async () => {
    const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ messages: [] }), headers: { 'Content-Type': 'application/json' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/model/i);
  });
  it('returns streamed response for valid request', async () => {
    const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'hi' }], provider: 'groq' }), headers: { 'Content-Type': 'application/json' } });
    expect(res.ok).toBe(true);
  });
});`,
  ],
  12: [
    `# NexusAI Team

> 15 specialized AI agents building real code in real-time.

## Features
- 🤖 15 AI agents (UI, Backend, DB, Auth, DevOps, and more)
- 🎬 Mux video background
- 📡 Live free models from OpenRouter + Groq (refreshed every 60s)
- 📊 Real-time code generation dashboard
- 📦 Download generated project as ZIP

## Deploy to Render
1. Push to GitHub
2. Create Web Service on render.com
3. Add env vars: \`OPENROUTER_API_KEY\`, \`GROQ_API_KEY\`, \`MUX_PLAYBACK_ID\`
4. Build: \`npm install && npm run build\`  Start: \`npm start\``,
  ],
  13: [
    `// Virtualized list for large code logs — only renders visible rows
const VirtualLogList = ({ entries }: { entries: LogEntry[] }) => {
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });
  return (
    <div ref={scrollRef} className="overflow-auto h-full">
      <div style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map(vrow => (
          <div key={vrow.index} style={{ position: 'absolute', top: vrow.start, height: vrow.size }}>
            <LogRow entry={entries[vrow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};`,
  ],
  14: [
    `// openapi.yaml excerpt
paths:
  /api/chat:
    post:
      summary: Proxy AI chat completion
      tags: [AI]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [model, messages, provider]
              properties:
                provider: { type: string, enum: [openrouter, groq] }
                model:    { type: string, example: 'meta-llama/llama-3.3-70b-instruct:free' }
                messages: { type: array, items: { \$ref: '#/components/schemas/Message' } }
      responses:
        200: { description: Completion response }
        400: { description: Validation error }
        503: { description: API key not configured }`,
  ],
  15: [
    `export const metadata: Metadata = {
  title: { default: 'NexusAI Team', template: '%s — NexusAI' },
  description: '15 AI agents building real code in real-time. Free models via OpenRouter & Groq.',
  keywords: ['AI', 'code generation', 'multi-agent', 'OpenRouter', 'Groq', 'Next.js'],
  openGraph: {
    type: 'website',
    siteName: 'NexusAI Team',
    title: 'NexusAI Team — 15 AI Agents',
    description: 'Watch 15 specialized AI agents build a full project together.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NexusAI Team' }],
  },
  twitter: { card: 'summary_large_image', creator: '@nexusai' },
};`,
  ],
};

export const FILE_NAMES: Record<number, string[]> = {
  1:  ['src/components/ui/Button.tsx','src/components/ui/Card.tsx','src/components/ui/Modal.tsx','src/components/ui/Badge.tsx','src/styles/tokens.css'],
  2:  ['src/components/layout/Header.tsx','src/hooks/useDebounce.ts','src/hooks/useLocalStorage.ts','src/components/pages/Home.tsx','src/hooks/usePrevious.ts'],
  3:  ['src/app/api/chat/route.ts','src/app/api/models/route.ts','src/lib/models/openrouter.ts','src/lib/models/groq.ts','src/middleware.ts'],
  4:  ['prisma/schema.prisma','src/db/migrations/001_init.sql','src/lib/db.ts','src/db/queries/users.ts','src/db/queries/projects.ts'],
  5:  ['src/lib/auth.ts','src/lib/jwt.ts','src/lib/rateLimit.ts','src/hooks/useAuth.ts','src/middleware/withAuth.ts'],
  6:  ['src/store/appStore.ts','src/store/modelStore.ts','src/store/chatStore.ts','src/selectors/index.ts','src/store/uiStore.ts'],
  7:  ['.github/workflows/deploy.yml','Dockerfile','docker-compose.yml','render.yaml','.env.example'],
  8:  ['next.config.ts','tailwind.config.ts','tsconfig.json','.eslintrc.js','.prettierrc'],
  9:  ['src/components/canvas/AgentCanvas.tsx','src/lib/animations.ts','src/components/video/VideoBackground.tsx','src/hooks/useCanvas.ts','src/lib/particles.ts'],
  10: ['src/components/agents/AgentCard.tsx','src/components/dashboard/MainDashboard.tsx','src/components/lines/ConnectionLines.tsx','src/lib/utils/debug.ts'],
  11: ['tests/api/chat.test.ts','tests/components/AgentCard.test.tsx','tests/store/appStore.test.ts','cypress/e2e/generation.cy.ts'],
  12: ['README.md','docs/API.md','docs/AGENTS.md','CONTRIBUTING.md','docs/DEPLOY.md'],
  13: ['src/components/preview/PreviewCanvas.tsx','src/components/preview/FileTree.tsx','src/lib/performance.ts','src/hooks/useVirtual.ts'],
  14: ['src/app/api/download/route.ts','openapi.yaml','src/lib/validators.ts','src/lib/schema.ts'],
  15: ['src/app/sitemap.ts','src/app/robots.ts','src/lib/seo.ts','src/app/manifest.ts'],
};
