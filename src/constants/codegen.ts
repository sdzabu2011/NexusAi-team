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

// ---------------------------------------------------------------------------
// FILE_NAMES — expanded pools per agent (enough for many generation cycles).
// Each pool is intentionally larger than any single run needs so the
// unique-filename resolver in useCodegen.ts rarely has to fall back to
// the numeric-suffix strategy.
// ---------------------------------------------------------------------------
export const FILE_NAMES: Record<number, string[]> = {
  // Agent 1 — UI Components
  1: [
    'src/components/ui/Button.tsx',
    'src/components/ui/Card.tsx',
    'src/components/ui/Modal.tsx',
    'src/components/ui/Badge.tsx',
    'src/styles/tokens.css',
    'src/components/ui/Input.tsx',
    'src/components/ui/Tooltip.tsx',
    'src/components/ui/Spinner.tsx',
    'src/components/ui/Avatar.tsx',
    'src/components/ui/Dropdown.tsx',
    'src/components/ui/Tabs.tsx',
    'src/components/ui/Accordion.tsx',
    'src/components/ui/Checkbox.tsx',
    'src/components/ui/Radio.tsx',
    'src/components/ui/Switch.tsx',
    'src/components/ui/Slider.tsx',
    'src/components/ui/Progress.tsx',
    'src/components/ui/Alert.tsx',
    'src/components/ui/Breadcrumb.tsx',
    'src/components/ui/Pagination.tsx',
    'src/components/ui/Table.tsx',
    'src/components/ui/Skeleton.tsx',
    'src/components/ui/Drawer.tsx',
    'src/components/ui/Popover.tsx',
    'src/components/ui/Select.tsx',
    'src/styles/globals.css',
    'src/styles/animations.css',
    'src/styles/typography.css',
    'src/styles/colors.css',
    'src/styles/layout.css',
  ],

  // Agent 2 — Layout & Hooks
  2: [
    'src/components/layout/Header.tsx',
    'src/hooks/useDebounce.ts',
    'src/hooks/useLocalStorage.ts',
    'src/components/pages/Home.tsx',
    'src/hooks/usePrevious.ts',
    'src/components/layout/Footer.tsx',
    'src/components/layout/Sidebar.tsx',
    'src/components/layout/NavBar.tsx',
    'src/components/layout/PageWrapper.tsx',
    'src/components/layout/Container.tsx',
    'src/hooks/useMediaQuery.ts',
    'src/hooks/useClickOutside.ts',
    'src/hooks/useScrollPosition.ts',
    'src/hooks/useKeyPress.ts',
    'src/hooks/useWindowSize.ts',
    'src/hooks/useOnMount.ts',
    'src/hooks/useInterval.ts',
    'src/hooks/useTimeout.ts',
    'src/hooks/useToggle.ts',
    'src/hooks/useCounter.ts',
    'src/components/pages/About.tsx',
    'src/components/pages/Contact.tsx',
    'src/components/pages/Settings.tsx',
    'src/components/pages/Profile.tsx',
    'src/components/pages/Dashboard.tsx',
    'src/components/layout/MobileMenu.tsx',
    'src/components/layout/Breadcrumbs.tsx',
    'src/components/layout/ScrollToTop.tsx',
    'src/components/layout/NotFound.tsx',
    'src/components/layout/ErrorBoundary.tsx',
  ],

  // Agent 3 — API Routes & Server
  3: [
    'src/app/api/chat/route.ts',
    'src/app/api/models/route.ts',
    'src/lib/models/openrouter.ts',
    'src/lib/models/groq.ts',
    'src/middleware.ts',
    'src/app/api/auth/route.ts',
    'src/app/api/users/route.ts',
    'src/app/api/projects/route.ts',
    'src/app/api/files/route.ts',
    'src/app/api/download/route.ts',
    'src/app/api/health/route.ts',
    'src/app/api/metrics/route.ts',
    'src/app/api/settings/route.ts',
    'src/app/api/search/route.ts',
    'src/app/api/upload/route.ts',
    'src/lib/models/anthropic.ts',
    'src/lib/models/cohere.ts',
    'src/lib/models/mistral.ts',
    'src/lib/models/together.ts',
    'src/lib/models/registry.ts',
    'src/lib/api/client.ts',
    'src/lib/api/fetcher.ts',
    'src/lib/api/endpoints.ts',
    'src/lib/api/interceptors.ts',
    'src/lib/api/errorHandler.ts',
    'src/app/api/webhooks/route.ts',
    'src/app/api/notifications/route.ts',
    'src/app/api/analytics/route.ts',
    'src/app/api/feedback/route.ts',
    'src/app/api/export/route.ts',
  ],

  // Agent 4 — Database
  4: [
    'prisma/schema.prisma',
    'src/db/migrations/001_init.sql',
    'src/lib/db.ts',
    'src/db/queries/users.ts',
    'src/db/queries/projects.ts',
    'src/db/migrations/002_add_files.sql',
    'src/db/migrations/003_add_sessions.sql',
    'src/db/migrations/004_add_logs.sql',
    'src/db/migrations/005_add_settings.sql',
    'src/db/migrations/006_add_analytics.sql',
    'src/db/queries/files.ts',
    'src/db/queries/sessions.ts',
    'src/db/queries/logs.ts',
    'src/db/queries/settings.ts',
    'src/db/queries/analytics.ts',
    'src/db/seeds/users.ts',
    'src/db/seeds/projects.ts',
    'src/db/seeds/settings.ts',
    'src/lib/dbClient.ts',
    'src/lib/dbPool.ts',
    'src/lib/dbCache.ts',
    'src/lib/dbHelpers.ts',
    'src/lib/dbTypes.ts',
    'src/lib/dbMigrations.ts',
    'src/lib/dbTransactions.ts',
    'prisma/seed.ts',
    'src/db/repositories/UserRepository.ts',
    'src/db/repositories/ProjectRepository.ts',
    'src/db/repositories/FileRepository.ts',
    'src/db/repositories/LogRepository.ts',
  ],

  // Agent 5 — Auth & Security
  5: [
    'src/lib/auth.ts',
    'src/lib/jwt.ts',
    'src/lib/rateLimit.ts',
    'src/hooks/useAuth.ts',
    'src/middleware/withAuth.ts',
    'src/lib/oauth.ts',
    'src/lib/session.ts',
    'src/lib/csrf.ts',
    'src/lib/encryption.ts',
    'src/lib/permissions.ts',
    'src/lib/roles.ts',
    'src/lib/passwordHash.ts',
    'src/lib/tokenBlacklist.ts',
    'src/lib/auditLog.ts',
    'src/lib/ipFilter.ts',
    'src/middleware/withRateLimit.ts',
    'src/middleware/withCors.ts',
    'src/middleware/withValidation.ts',
    'src/middleware/withLogging.ts',
    'src/middleware/withCache.ts',
    'src/hooks/usePermissions.ts',
    'src/hooks/useSession.ts',
    'src/hooks/useRoles.ts',
    'src/components/auth/LoginForm.tsx',
    'src/components/auth/RegisterForm.tsx',
    'src/components/auth/ForgotPassword.tsx',
    'src/components/auth/ResetPassword.tsx',
    'src/components/auth/OAuthButtons.tsx',
    'src/components/auth/AuthGuard.tsx',
    'src/components/auth/TwoFactor.tsx',
  ],

  // Agent 6 — State Management
  6: [
    'src/store/appStore.ts',
    'src/store/modelStore.ts',
    'src/store/chatStore.ts',
    'src/selectors/index.ts',
    'src/store/uiStore.ts',
    'src/store/authStore.ts',
    'src/store/projectStore.ts',
    'src/store/fileStore.ts',
    'src/store/settingsStore.ts',
    'src/store/notificationStore.ts',
    'src/selectors/authSelectors.ts',
    'src/selectors/projectSelectors.ts',
    'src/selectors/fileSelectors.ts',
    'src/selectors/uiSelectors.ts',
    'src/selectors/modelSelectors.ts',
    'src/store/middleware/logger.ts',
    'src/store/middleware/persist.ts',
    'src/store/middleware/devtools.ts',
    'src/store/slices/generationSlice.ts',
    'src/store/slices/agentSlice.ts',
    'src/store/slices/editorSlice.ts',
    'src/store/slices/previewSlice.ts',
    'src/store/slices/logSlice.ts',
    'src/store/actions/generationActions.ts',
    'src/store/actions/agentActions.ts',
    'src/store/actions/fileActions.ts',
    'src/store/actions/uiActions.ts',
    'src/store/actions/authActions.ts',
    'src/store/initialState.ts',
    'src/store/rootReducer.ts',
    'src/store/storeTypes.ts',
  ],

  // Agent 7 — DevOps & Infrastructure
  7: [
    '.github/workflows/deploy.yml',
    'Dockerfile',
    'docker-compose.yml',
    'render.yaml',
    '.env.example',
    '.github/workflows/ci.yml',
    '.github/workflows/lint.yml',
    '.github/workflows/test.yml',
    '.github/workflows/release.yml',
    '.github/workflows/security.yml',
    'docker-compose.dev.yml',
    'docker-compose.prod.yml',
    '.dockerignore',
    'nginx.conf',
    'scripts/deploy.sh',
    'scripts/setup.sh',
    'scripts/migrate.sh',
    'scripts/seed.sh',
    'scripts/backup.sh',
    'scripts/health-check.sh',
    'k8s/deployment.yaml',
    'k8s/service.yaml',
    'k8s/ingress.yaml',
    'k8s/configmap.yaml',
    'k8s/secrets.yaml',
    'terraform/main.tf',
    'terraform/variables.tf',
    'terraform/outputs.tf',
    'terraform/provider.tf',
    'terraform/modules/vpc.tf',
  ],

  // Agent 8 — Config & Tooling
  8: [
    'next.config.ts',
    'tailwind.config.ts',
    'tsconfig.json',
    '.eslintrc.js',
    '.prettierrc',
    'vitest.config.ts',
    'jest.config.ts',
    'postcss.config.js',
    'babel.config.js',
    'webpack.config.js',
    '.stylelintrc.js',
    '.commitlintrc.js',
    '.huskyrc.js',
    '.lintstagedrc.js',
    'package.json',
    'pnpm-workspace.yaml',
    'turbo.json',
    '.nvmrc',
    '.node-version',
    'browserslist',
    'src/types/index.ts',
    'src/types/api.ts',
    'src/types/models.ts',
    'src/types/store.ts',
    'src/types/components.ts',
    'src/types/agents.ts',
    'src/types/files.ts',
    'src/types/auth.ts',
    'src/types/db.ts',
    'src/types/events.ts',
  ],

  // Agent 9 — Canvas & Animations
  9: [
    'src/components/canvas/AgentCanvas.tsx',
    'src/lib/animations.ts',
    'src/components/video/VideoBackground.tsx',
    'src/hooks/useCanvas.ts',
    'src/lib/particles.ts',
    'src/components/canvas/ParticleSystem.tsx',
    'src/components/canvas/NetworkGraph.tsx',
    'src/components/canvas/GlowEffect.tsx',
    'src/components/canvas/WaveAnimation.tsx',
    'src/components/canvas/MatrixRain.tsx',
    'src/lib/webgl.ts',
    'src/lib/shaders.ts',
    'src/lib/tweening.ts',
    'src/lib/easing.ts',
    'src/lib/springs.ts',
    'src/hooks/useAnimation.ts',
    'src/hooks/useParticles.ts',
    'src/hooks/useWebGL.ts',
    'src/hooks/useRaf.ts',
    'src/hooks/useTransition.ts',
    'src/components/animations/FadeIn.tsx',
    'src/components/animations/SlideIn.tsx',
    'src/components/animations/ScaleIn.tsx',
    'src/components/animations/Stagger.tsx',
    'src/components/animations/Typewriter.tsx',
    'src/components/video/VideoOverlay.tsx',
    'src/components/video/VideoControls.tsx',
    'src/components/video/VideoPlayer.tsx',
    'src/lib/motionVariants.ts',
    'src/lib/gsapConfig.ts',
  ],

  // Agent 10 — Debug & Dashboard
  10: [
    'src/components/agents/AgentCard.tsx',
    'src/components/dashboard/MainDashboard.tsx',
    'src/components/lines/ConnectionLines.tsx',
    'src/lib/utils/debug.ts',
    'src/components/agents/AgentGrid.tsx',
    'src/components/agents/AgentStatus.tsx',
    'src/components/agents/AgentLog.tsx',
    'src/components/agents/AgentMetrics.tsx',
    'src/components/agents/AgentQueue.tsx',
    'src/components/dashboard/StatsPanel.tsx',
    'src/components/dashboard/ActivityFeed.tsx',
    'src/components/dashboard/ProgressBar.tsx',
    'src/components/dashboard/FileCounter.tsx',
    'src/components/dashboard/AgentPicker.tsx',
    'src/components/dashboard/LogViewer.tsx',
    'src/lib/utils/logger.ts',
    'src/lib/utils/profiler.ts',
    'src/lib/utils/formatter.ts',
    'src/lib/utils/helpers.ts',
    'src/lib/utils/constants.ts',
    'src/components/lines/DataFlow.tsx',
    'src/components/lines/NetworkLines.tsx',
    'src/components/lines/AgentConnector.tsx',
    'src/lib/utils/errorReporter.ts',
    'src/lib/utils/telemetry.ts',
    'src/components/dashboard/TokenUsage.tsx',
    'src/components/dashboard/ModelSelector.tsx',
    'src/components/dashboard/CostEstimate.tsx',
    'src/components/dashboard/Timeline.tsx',
    'src/components/dashboard/HeatMap.tsx',
  ],

  // Agent 11 — Testing
  11: [
    'tests/api/chat.test.ts',
    'tests/components/AgentCard.test.tsx',
    'tests/store/appStore.test.ts',
    'cypress/e2e/generation.cy.ts',
    'tests/api/models.test.ts',
    'tests/api/auth.test.ts',
    'tests/api/download.test.ts',
    'tests/api/users.test.ts',
    'tests/components/Button.test.tsx',
    'tests/components/Modal.test.tsx',
    'tests/components/Header.test.tsx',
    'tests/components/Dashboard.test.tsx',
    'tests/hooks/useDebounce.test.ts',
    'tests/hooks/useAuth.test.ts',
    'tests/hooks/useLocalStorage.test.ts',
    'tests/store/modelStore.test.ts',
    'tests/store/chatStore.test.ts',
    'tests/store/authStore.test.ts',
    'tests/lib/jwt.test.ts',
    'tests/lib/rateLimit.test.ts',
    'tests/lib/auth.test.ts',
    'tests/lib/validators.test.ts',
    'cypress/e2e/auth.cy.ts',
    'cypress/e2e/dashboard.cy.ts',
    'cypress/e2e/download.cy.ts',
    'cypress/support/commands.ts',
    'cypress/support/e2e.ts',
    'tests/setup.ts',
    'tests/mocks/handlers.ts',
    'tests/mocks/server.ts',
  ],

  // Agent 12 — Docs
  12: [
    'README.md',
    'docs/API.md',
    'docs/AGENTS.md',
    'CONTRIBUTING.md',
    'docs/DEPLOY.md',
    'docs/ARCHITECTURE.md',
    'docs/GETTING_STARTED.md',
    'docs/CONFIGURATION.md',
    'docs/AUTHENTICATION.md',
    'docs/DATABASE.md',
    'docs/TESTING.md',
    'docs/PERFORMANCE.md',
    'docs/SECURITY.md',
    'docs/TROUBLESHOOTING.md',
    'docs/CHANGELOG.md',
    'docs/ROADMAP.md',
    'docs/FAQ.md',
    'docs/MODELS.md',
    'docs/AGENTS_GUIDE.md',
    'docs/API_REFERENCE.md',
    'SECURITY.md',
    'CODE_OF_CONDUCT.md',
    'LICENSE',
    'docs/WEBHOOKS.md',
    'docs/RATE_LIMITS.md',
    'docs/SELF_HOSTING.md',
    'docs/CUSTOMIZATION.md',
    'docs/INTEGRATIONS.md',
    'docs/MIGRATION.md',
    'docs/GLOSSARY.md',
  ],

  // Agent 13 — Preview & Performance
  13: [
    'src/components/preview/PreviewCanvas.tsx',
    'src/components/preview/FileTree.tsx',
    'src/lib/performance.ts',
    'src/hooks/useVirtual.ts',
    'src/components/preview/CodeEditor.tsx',
    'src/components/preview/FileDiff.tsx',
    'src/components/preview/SplitPane.tsx',
    'src/components/preview/TabBar.tsx',
    'src/components/preview/MiniMap.tsx',
    'src/components/preview/SearchBar.tsx',
    'src/lib/codeHighlight.ts',
    'src/lib/codeParse.ts',
    'src/lib/codeFormat.ts',
    'src/lib/codeAnalyze.ts',
    'src/lib/codeLint.ts',
    'src/hooks/useFileTree.ts',
    'src/hooks/useCodeEditor.ts',
    'src/hooks/useSplitPane.ts',
    'src/hooks/useSearch.ts',
    'src/hooks/useMiniMap.ts',
    'src/lib/workers/formatWorker.ts',
    'src/lib/workers/lintWorker.ts',
    'src/lib/workers/parseWorker.ts',
    'src/lib/workers/highlightWorker.ts',
    'src/lib/virtualScroller.ts',
    'src/components/preview/LineNumbers.tsx',
    'src/components/preview/StatusBar.tsx',
    'src/components/preview/BreadcrumbBar.tsx',
    'src/components/preview/ErrorPanel.tsx',
    'src/components/preview/OutputPanel.tsx',
  ],

  // Agent 14 — Schema & Validation
  14: [
    'src/app/api/download/route.ts',
    'openapi.yaml',
    'src/lib/validators.ts',
    'src/lib/schema.ts',
    'src/lib/zod/userSchema.ts',
    'src/lib/zod/projectSchema.ts',
    'src/lib/zod/fileSchema.ts',
    'src/lib/zod/authSchema.ts',
    'src/lib/zod/settingsSchema.ts',
    'src/lib/zod/apiSchema.ts',
    'src/lib/zod/chatSchema.ts',
    'src/lib/zod/modelSchema.ts',
    'src/lib/zod/agentSchema.ts',
    'src/lib/zod/logSchema.ts',
    'src/lib/zod/webhookSchema.ts',
    'src/lib/transformers/userTransformer.ts',
    'src/lib/transformers/projectTransformer.ts',
    'src/lib/transformers/fileTransformer.ts',
    'src/lib/transformers/responseTransformer.ts',
    'src/lib/transformers/errorTransformer.ts',
    'src/lib/sanitize.ts',
    'src/lib/typeGuards.ts',
    'src/lib/assertions.ts',
    'src/lib/coerce.ts',
    'src/lib/serialize.ts',
    'asyncapi.yaml',
    'graphql/schema.graphql',
    'graphql/resolvers.ts',
    'graphql/typeDefs.ts',
    'graphql/context.ts',
  ],

  // Agent 15 — SEO & Metadata
  15: [
    'src/app/sitemap.ts',
    'src/app/robots.ts',
    'src/lib/seo.ts',
    'src/app/manifest.ts',
    'src/lib/structuredData.ts',
    'src/lib/ogImage.ts',
    'src/lib/analytics.ts',
    'src/lib/gtm.ts',
    'src/lib/hotjar.ts',
    'src/lib/mixpanel.ts',
    'src/app/opengraph-image.tsx',
    'src/app/twitter-image.tsx',
    'src/app/icon.tsx',
    'src/app/apple-icon.tsx',
    'src/app/not-found.tsx',
    'src/app/error.tsx',
    'src/app/loading.tsx',
    'src/app/layout.tsx',
    'src/app/global-error.tsx',
    'src/app/template.tsx',
    'src/lib/webVitals.ts',
    'src/lib/lighthouse.ts',
    'src/lib/a11y.ts',
    'src/lib/i18n.ts',
    'src/lib/locale.ts',
    'public/site.webmanifest',
    'public/browserconfig.xml',
    'src/lib/fontLoader.ts',
    'src/lib/imageOptimizer.ts',
    'src/lib/prefetch.ts',
  ],
};

// ---------------------------------------------------------------------------
// Agent-context-aware fallback filename generator.
// Called by useCodegen.ts when the static pool is exhausted or a collision
// would otherwise occur.
// ---------------------------------------------------------------------------

/** Describes the shape of each agent definition (only what we need here). */
interface AgentMeta {
  id: number;
  name: string;
}

/** Canonical directory + extension per agent — used by the fallback generator. */
const AGENT_FALLBACK_CONFIG: Record<
  number,
  { dir: string; prefix: string; ext: string }
> = {
  1:  { dir: 'src/components/ui',         prefix: 'Component',  ext: 'tsx' },
  2:  { dir: 'src/hooks',                 prefix: 'use',         ext: 'ts'  },
  3:  { dir: 'src/app/api',               prefix: 'route',       ext: 'ts'  },
  4:  { dir: 'src/db/queries',            prefix: 'query',       ext: 'ts'  },
  5:  { dir: 'src/lib/auth',              prefix: 'auth',        ext: 'ts'  },
  6:  { dir: 'src/store',                 prefix: 'Store',       ext: 'ts'  },
  7:  { dir: 'scripts',                   prefix: 'script',      ext: 'sh'  },
  8:  { dir: 'src/config',                prefix: 'config',      ext: 'ts'  },
  9:  { dir: 'src/components/canvas',     prefix: 'Canvas',      ext: 'tsx' },
  10: { dir: 'src/components/dashboard',  prefix: 'Panel',       ext: 'tsx' },
  11: { dir: 'tests',                     prefix: 'spec',        ext: 'ts'  },
  12: { dir: 'docs',                      prefix: 'doc',         ext: 'md'  },
  13: { dir: 'src/components/preview',    prefix: 'Preview',     ext: 'tsx' },
  14: { dir: 'src/lib/zod',               prefix: 'schema',      ext: 'ts'  },
  15: { dir: 'src/lib/seo',               prefix: 'seo',         ext: 'ts'  },
};

/**
 * Generates a unique, context-aware fallback filename for an agent when the
 * static pool is exhausted.  The `suffix` parameter is a monotonically
 * increasing integer that guarantees uniqueness across repeated calls.
 */
export function generateFallbackFilename(
  agent: AgentMeta,
  suffix: number,
): string {
  const cfg = AGENT_FALLBACK_CONFIG[agent.id] ?? {
    dir: `src/modules/agent${agent.id}`,
    prefix: 'module',
    ext: 'ts',
  };
  return `${cfg.dir}/${cfg.prefix}${suffix}.${cfg.ext}`;
}