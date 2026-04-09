'use client';
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useModelStore } from '@/store/modelStore';
import { AGENTS } from '@/constants/agents';
import { randomItem } from '@/lib/utils/helpers';
import type { GeneratedFile, LogEntry } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Log types
// ─────────────────────────────────────────────────────────────────────────────

const LOG_TYPES = [
  'write', 'read', 'test', 'deploy', 'optimize', 'review',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Project type detection
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectType {
  lang:      string;
  framework: string;
  extras:    string[];
}

function detectProjectType(prompt: string): ProjectType {
  const p = prompt.toLowerCase();

  // ── Python ────────────────────────────────────────────────────────────────
  if (p.includes('fastapi') || p.includes('fast api'))
    return { lang: 'python', framework: 'fastapi', extras: ['sql', 'dockerfile', 'sh', 'yaml', 'toml'] };
  if (p.includes('django'))
    return { lang: 'python', framework: 'django', extras: ['sql', 'html', 'css', 'sh', 'yaml'] };
  if (p.includes('flask'))
    return { lang: 'python', framework: 'flask', extras: ['sql', 'html', 'css', 'sh', 'yaml'] };
  if (
    p.includes('python') || p.includes('pytorch') || p.includes('tensorflow') ||
    p.includes('pandas') || p.includes('numpy')   || p.includes('scikit')     ||
    p.includes('ml ')    || p.includes('machine learning') || p.includes('data science') ||
    p.includes('jupyter') || p.includes('notebook')
  )
    return { lang: 'python', framework: 'python', extras: ['sql', 'sh', 'yaml', 'toml', 'md'] };

  // ── Rust ──────────────────────────────────────────────────────────────────
  if (
    p.includes('rust') || p.includes('actix') || p.includes('axum') ||
    p.includes('tokio') || p.includes('cargo') || p.includes('bevy') ||
    p.includes('tauri') || p.includes('wasm')
  )
    return { lang: 'rust', framework: 'rust', extras: ['sql', 'toml', 'sh', 'yaml', 'dockerfile'] };

  // ── Go ────────────────────────────────────────────────────────────────────
  if (
    p.includes(' go ') || p.includes('golang') || p.includes('gin ')  ||
    p.includes('echo ') || p.includes('fiber ') || p.includes('gorm') ||
    p.includes('go web') || p.includes('go api') || p.includes('chi ')
  )
    return { lang: 'go', framework: 'go', extras: ['sql', 'sh', 'yaml', 'dockerfile', 'md'] };

  // ── Java ──────────────────────────────────────────────────────────────────
  if (
    p.includes('java') || p.includes('spring') || p.includes('spring boot') ||
    p.includes('maven') || p.includes('gradle') || p.includes('quarkus') ||
    p.includes('micronaut') || p.includes('jakarta')
  )
    return { lang: 'java', framework: 'spring', extras: ['sql', 'xml', 'yaml', 'sh', 'dockerfile'] };

  // ── C# / .NET ─────────────────────────────────────────────────────────────
  if (
    p.includes('c#') || p.includes('dotnet') || p.includes('.net') ||
    p.includes('asp.net') || p.includes('blazor') || p.includes('unity') ||
    p.includes('xamarin') || p.includes('maui')
  )
    return { lang: 'csharp', framework: 'dotnet', extras: ['sql', 'xml', 'sh', 'yaml', 'json'] };

  // ── Roblox / Luau ─────────────────────────────────────────────────────────
  if (p.includes('roblox') || p.includes('luau') || p.includes('roblox studio'))
    return { lang: 'luau', framework: 'roblox', extras: ['json', 'toml', 'md'] };

  // ── Lua ───────────────────────────────────────────────────────────────────
  if (p.includes('lua') || p.includes('love2d') || p.includes('löve') || p.includes('neovim plugin'))
    return { lang: 'lua', framework: 'lua', extras: ['sh', 'md', 'makefile'] };

  // ── PHP ───────────────────────────────────────────────────────────────────
  if (
    p.includes('php') || p.includes('laravel') || p.includes('symfony') ||
    p.includes('wordpress') || p.includes('drupal') || p.includes('composer')
  )
    return { lang: 'php', framework: 'laravel', extras: ['sql', 'css', 'html', 'sh', 'yaml'] };

  // ── Ruby ──────────────────────────────────────────────────────────────────
  if (
    p.includes('ruby') || p.includes('rails') || p.includes('sinatra') ||
    p.includes('rspec') || p.includes('bundler') || p.includes('rack')
  )
    return { lang: 'ruby', framework: 'rails', extras: ['sql', 'html', 'css', 'sh', 'yaml'] };

  // ── Swift / iOS ───────────────────────────────────────────────────────────
  if (
    p.includes('swift') || p.includes('ios') || p.includes('swiftui') ||
    p.includes('xcode') || p.includes('macos app') || p.includes('iphone') ||
    p.includes('ipad') || p.includes('watchos') || p.includes('tvos')
  )
    return { lang: 'swift', framework: 'swiftui', extras: ['json', 'yaml', 'md'] };

  // ── Kotlin / Android ──────────────────────────────────────────────────────
  if (
    p.includes('kotlin') || p.includes('android') || p.includes('jetpack') ||
    p.includes('compose') || p.includes('ktor') || p.includes('android studio')
  )
    return { lang: 'kotlin', framework: 'android', extras: ['xml', 'sql', 'sh', 'yaml', 'json'] };

  // ── C / C++ ───────────────────────────────────────────────────────────────
  if (
    p.includes('c++') || p.includes('cpp') || p.includes('cmake') ||
    p.includes('opengl') || p.includes('game engine') || p.includes('directx') ||
    p.includes('vulkan') || p.includes('sfml') || p.includes('raylib')
  )
    return { lang: 'cpp', framework: 'cpp', extras: ['c', 'h', 'cmake', 'sh', 'makefile'] };

  if (
    p.includes(' c ') || p.includes('embedded') || p.includes('arduino') ||
    p.includes('microcontroller') || p.includes('firmware') || p.includes('stm32') ||
    p.includes('raspberry') || p.includes('avr') || p.includes('arm ')
  )
    return { lang: 'c', framework: 'c', extras: ['h', 'makefile', 'sh', 'ld'] };

  // ── Dart / Flutter ────────────────────────────────────────────────────────
  if (p.includes('flutter') || p.includes('dart'))
    return { lang: 'dart', framework: 'flutter', extras: ['yaml', 'sh', 'json', 'md'] };

  // ── Scala ─────────────────────────────────────────────────────────────────
  if (p.includes('scala') || p.includes('akka') || p.includes('play framework') || p.includes('sbt'))
    return { lang: 'scala', framework: 'scala', extras: ['sql', 'sh', 'yaml', 'xml'] };

  // ── Haskell ───────────────────────────────────────────────────────────────
  if (p.includes('haskell') || p.includes('cabal') || p.includes('stack ') || p.includes('ghc'))
    return { lang: 'haskell', framework: 'haskell', extras: ['yaml', 'sh', 'cabal', 'md'] };

  // ── Elixir ────────────────────────────────────────────────────────────────
  if (p.includes('elixir') || p.includes('phoenix') || p.includes('mix ') || p.includes('ecto'))
    return { lang: 'elixir', framework: 'phoenix', extras: ['sql', 'html', 'css', 'sh', 'yaml'] };

  // ── Solidity / Blockchain ─────────────────────────────────────────────────
  if (
    p.includes('solidity') || p.includes('blockchain') || p.includes('ethereum') ||
    p.includes('web3') || p.includes('smart contract') || p.includes('defi') ||
    p.includes('nft') || p.includes('hardhat') || p.includes('foundry')
  )
    return { lang: 'sol', framework: 'solidity', extras: ['ts', 'json', 'sh', 'yaml'] };

  // ── DevOps / Infrastructure ───────────────────────────────────────────────
  if (
    p.includes('docker') || p.includes('kubernetes') || p.includes('k8s') ||
    p.includes('terraform') || p.includes('ansible') || p.includes('devops') ||
    p.includes('ci/cd') || p.includes('helm') || p.includes('jenkins') ||
    p.includes('github actions') || p.includes('argocd') || p.includes('pulumi')
  )
    return { lang: 'yaml', framework: 'devops', extras: ['sh', 'dockerfile', 'tf', 'json', 'md'] };

  // ── React Native / Expo ───────────────────────────────────────────────────
  if (p.includes('react native') || p.includes('expo'))
    return { lang: 'tsx', framework: 'react-native', extras: ['ts', 'json', 'sh', 'yaml'] };

  // ── Next.js / React ───────────────────────────────────────────────────────
  if (
    p.includes('next') || p.includes('react') || p.includes('frontend') ||
    p.includes('website') || p.includes('web app') || p.includes('saas') ||
    p.includes('dashboard') || p.includes('landing page') || p.includes('portfolio') ||
    p.includes('blog') || p.includes('e-commerce') || p.includes('ecommerce')
  )
    return { lang: 'tsx', framework: 'nextjs', extras: ['ts', 'css', 'sql', 'sh', 'yaml'] };

  // ── Vue / Nuxt ────────────────────────────────────────────────────────────
  if (p.includes('vue') || p.includes('nuxt') || p.includes('vuex') || p.includes('pinia'))
    return { lang: 'vue', framework: 'nuxt', extras: ['ts', 'css', 'sh', 'yaml'] };

  // ── Svelte / SvelteKit ────────────────────────────────────────────────────
  if (p.includes('svelte') || p.includes('sveltekit'))
    return { lang: 'svelte', framework: 'sveltekit', extras: ['ts', 'css', 'sh', 'yaml'] };

  // ── Node.js / Express ─────────────────────────────────────────────────────
  if (
    p.includes('node') || p.includes('express') || p.includes('api') ||
    p.includes('backend') || p.includes('server') || p.includes('rest') ||
    p.includes('graphql') || p.includes('websocket') || p.includes('socket.io')
  )
    return { lang: 'ts', framework: 'node', extras: ['sql', 'sh', 'yaml', 'json', 'dockerfile'] };

  // ── Database ──────────────────────────────────────────────────────────────
  if (
    p.includes('database') || p.includes('sql') || p.includes('postgres') ||
    p.includes('mysql') || p.includes('mongodb') || p.includes('redis') ||
    p.includes('elasticsearch') || p.includes('cassandra')
  )
    return { lang: 'sql', framework: 'database', extras: ['ts', 'sh', 'yaml', 'json'] };

  // ── Game Dev (Godot) ──────────────────────────────────────────────────────
  if (p.includes('godot') || p.includes('gdscript') || p.includes('godot 4'))
    return { lang: 'gdscript', framework: 'godot', extras: ['sh', 'yaml', 'json', 'md'] };

  // ── Assembly ──────────────────────────────────────────────────────────────
  if (p.includes('assembly') || p.includes('asm ') || p.includes('nasm') || p.includes('x86'))
    return { lang: 'asm', framework: 'assembly', extras: ['c', 'makefile', 'sh', 'md'] };

  // ── R ─────────────────────────────────────────────────────────────────────
  if (p.includes(' r ') || p.includes('rstudio') || p.includes('tidyverse') || p.includes('ggplot'))
    return { lang: 'r', framework: 'r', extras: ['sh', 'yaml', 'md', 'rmd'] };

  // ── Default ───────────────────────────────────────────────────────────────
  return { lang: 'tsx', framework: 'nextjs', extras: ['ts', 'css', 'sql', 'sh'] };
}

// ─────────────────────────────────────────────────────────────────────────────
// File pool types
// ─────────────────────────────────────────────────────────────────────────────

type FileDef = [string, string]; // [filepath, extension]

// ─────────────────────────────────────────────────────────────────────────────
// Language name map for prompts
// ─────────────────────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  // Web
  tsx:        'React TypeScript (TSX)',
  ts:         'TypeScript',
  js:         'JavaScript',
  jsx:        'React JavaScript (JSX)',
  vue:        'Vue.js Single File Component',
  svelte:     'Svelte Component',
  html:       'HTML',
  css:        'CSS',
  scss:       'SCSS',
  sass:       'SASS',
  less:       'LESS',
  // Backend languages
  python:     'Python',
  py:         'Python',
  rust:       'Rust',
  rs:         'Rust',
  go:         'Go',
  java:       'Java',
  csharp:     'C#',
  cs:         'C#',
  cpp:        'C++',
  c:          'C',
  swift:      'Swift',
  kotlin:     'Kotlin',
  kt:         'Kotlin',
  ruby:       'Ruby',
  rb:         'Ruby',
  php:        'PHP',
  scala:      'Scala',
  haskell:    'Haskell',
  hs:         'Haskell',
  elixir:     'Elixir',
  ex:         'Elixir',
  dart:       'Dart/Flutter',
  // Game / scripting
  lua:        'Lua',
  luau:       'Luau (Roblox Studio)',
  gdscript:   'GDScript (Godot)',
  gd:         'GDScript (Godot)',
  // Systems
  asm:        'x86 Assembly (NASM)',
  r:          'R',
  rmd:        'R Markdown',
  // Blockchain
  sol:        'Solidity',
  // Data / Config
  sql:        'SQL',
  graphql:    'GraphQL Schema',
  yaml:       'YAML',
  toml:       'TOML',
  json:       'JSON',
  xml:        'XML',
  ini:        'INI Config',
  // DevOps
  dockerfile: 'Dockerfile',
  nginx:      'Nginx Config',
  tf:         'Terraform HCL',
  sh:         'Bash Shell Script',
  makefile:   'Makefile',
  cabal:      'Haskell Cabal',
  ld:         'Linker Script',
  cmake:      'CMake',
  // Docs
  md:         'Markdown',
  prisma:     'Prisma Schema',
  text:       'Plain Text',
  // Other
  proto:      'Protocol Buffers (protobuf)',
  wgsl:       'WGSL Shader',
  glsl:       'GLSL Shader',
  hlsl:       'HLSL Shader',
};

function getLangName(ext: string): string {
  return LANG_NAMES[ext] ?? ext.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// File pools — Python / FastAPI
// ─────────────────────────────────────────────────────────────────────────────

function getFilePools_FastAPI(): Record<number, FileDef[]> {
  return {
    1: [
      ['templates/index.html',             'html'],
      ['templates/base.html',              'html'],
      ['templates/dashboard.html',         'html'],
      ['templates/login.html',             'html'],
      ['templates/register.html',          'html'],
      ['templates/profile.html',           'html'],
      ['templates/settings.html',          'html'],
      ['templates/404.html',               'html'],
      ['static/css/style.css',             'css'],
      ['static/css/dashboard.css',         'css'],
      ['static/css/auth.css',              'css'],
      ['static/js/main.js',                'js'],
      ['static/js/auth.js',                'js'],
      ['static/js/dashboard.js',           'js'],
      ['templates/components/nav.html',    'html'],
      ['templates/components/footer.html', 'html'],
      ['templates/components/sidebar.html','html'],
      ['templates/emails/welcome.html',    'html'],
      ['templates/emails/reset.html',      'html'],
      ['static/js/utils.js',               'js'],
    ],
    2: [
      ['app/utils/helpers.py',          'python'],
      ['app/utils/validators.py',       'python'],
      ['app/utils/formatters.py',       'python'],
      ['app/utils/pagination.py',       'python'],
      ['app/utils/cache.py',            'python'],
      ['app/utils/email.py',            'python'],
      ['app/utils/file_handler.py',     'python'],
      ['app/utils/logger.py',           'python'],
      ['app/utils/response.py',         'python'],
      ['app/utils/constants.py',        'python'],
      ['app/utils/crypto.py',           'python'],
      ['app/utils/date_utils.py',       'python'],
      ['app/utils/string_utils.py',     'python'],
      ['app/utils/image_utils.py',      'python'],
      ['app/utils/notification.py',     'python'],
      ['app/utils/export.py',           'python'],
      ['app/utils/import_utils.py',     'python'],
      ['app/utils/search.py',           'python'],
      ['app/utils/geo.py',              'python'],
      ['app/utils/metrics.py',          'python'],
    ],
    3: [
      ['app/main.py',                           'python'],
      ['app/api/v1/router.py',                  'python'],
      ['app/api/v1/endpoints/users.py',         'python'],
      ['app/api/v1/endpoints/auth.py',          'python'],
      ['app/api/v1/endpoints/items.py',         'python'],
      ['app/api/v1/endpoints/health.py',        'python'],
      ['app/api/v1/endpoints/upload.py',        'python'],
      ['app/api/v1/endpoints/search.py',        'python'],
      ['app/api/v1/endpoints/admin.py',         'python'],
      ['app/api/v1/endpoints/metrics.py',       'python'],
      ['app/api/v1/endpoints/notifications.py', 'python'],
      ['app/api/v1/endpoints/settings.py',      'python'],
      ['app/api/v1/endpoints/export.py',        'python'],
      ['app/api/v1/endpoints/webhooks.py',      'python'],
      ['app/api/v1/endpoints/reports.py',       'python'],
      ['app/api/dependencies.py',               'python'],
      ['app/websockets/handler.py',             'python'],
      ['app/websockets/manager.py',             'python'],
      ['app/api/middleware.py',                 'python'],
      ['app/api/v2/router.py',                  'python'],
    ],
    4: [
      ['app/db/database.py',              'python'],
      ['app/db/models.py',                'python'],
      ['app/models/user.py',              'python'],
      ['app/models/item.py',              'python'],
      ['app/models/session.py',           'python'],
      ['app/models/audit.py',             'python'],
      ['app/models/notification.py',      'python'],
      ['app/db/session.py',               'python'],
      ['app/db/base.py',                  'python'],
      ['app/db/seed.py',                  'python'],
      ['alembic/env.py',                  'python'],
      ['alembic/versions/001_init.sql',   'sql'],
      ['alembic/versions/002_users.sql',  'sql'],
      ['alembic/versions/003_items.sql',  'sql'],
      ['alembic/versions/004_sessions.sql','sql'],
      ['alembic.ini',                     'ini'],
      ['app/db/repository.py',            'python'],
      ['app/db/crud.py',                  'python'],
      ['app/db/queries.py',               'python'],
      ['app/db/pool.py',                  'python'],
    ],
    5: [
      ['app/core/security.py',          'python'],
      ['app/core/auth.py',              'python'],
      ['app/core/jwt.py',               'python'],
      ['app/core/oauth2.py',            'python'],
      ['app/core/permissions.py',       'python'],
      ['app/core/rate_limit.py',        'python'],
      ['app/schemas/auth.py',           'python'],
      ['app/services/auth_service.py',  'python'],
      ['app/middleware/auth.py',        'python'],
      ['app/middleware/cors.py',        'python'],
      ['app/core/csrf.py',              'python'],
      ['app/core/encryption.py',        'python'],
      ['app/core/password.py',          'python'],
      ['app/core/audit.py',             'python'],
      ['app/core/2fa.py',               'python'],
      ['app/core/ip_filter.py',         'python'],
      ['app/services/oauth_service.py', 'python'],
      ['app/core/api_keys.py',          'python'],
      ['app/core/rbac.py',              'python'],
      ['app/middleware/security.py',    'python'],
    ],
    6: [
      ['app/core/config.py',           'python'],
      ['app/core/settings.py',         'python'],
      ['app/core/events.py',           'python'],
      ['app/core/exceptions.py',       'python'],
      ['app/schemas/user.py',          'python'],
      ['app/schemas/item.py',          'python'],
      ['app/schemas/response.py',      'python'],
      ['app/schemas/pagination.py',    'python'],
      ['app/schemas/base.py',          'python'],
      ['app/schemas/token.py',         'python'],
      ['app/schemas/filters.py',       'python'],
      ['app/schemas/validators.py',    'python'],
      ['app/schemas/common.py',        'python'],
      ['app/core/types.py',            'python'],
      ['app/core/constants.py',        'python'],
      ['app/core/serializers.py',      'python'],
      ['app/core/errors.py',           'python'],
      ['app/schemas/notification.py',  'python'],
      ['app/schemas/report.py',        'python'],
      ['app/core/enums.py',            'python'],
    ],
    7: [
      ['Dockerfile',                       'dockerfile'],
      ['Dockerfile.prod',                  'dockerfile'],
      ['docker-compose.yml',               'yaml'],
      ['docker-compose.prod.yml',          'yaml'],
      ['docker-compose.dev.yml',           'yaml'],
      ['.github/workflows/deploy.yml',     'yaml'],
      ['.github/workflows/test.yml',       'yaml'],
      ['.github/workflows/lint.yml',       'yaml'],
      ['.github/workflows/security.yml',   'yaml'],
      ['nginx/nginx.conf',                 'nginx'],
      ['nginx/ssl.conf',                   'nginx'],
      ['nginx/proxy.conf',                 'nginx'],
      ['scripts/start.sh',                 'sh'],
      ['scripts/migrate.sh',               'sh'],
      ['scripts/deploy.sh',                'sh'],
      ['scripts/backup.sh',                'sh'],
      ['scripts/health-check.sh',          'sh'],
      ['render.yaml',                      'yaml'],
      ['k8s/deployment.yaml',              'yaml'],
      ['k8s/service.yaml',                 'yaml'],
    ],
    8: [
      ['requirements.txt',         'text'],
      ['requirements-dev.txt',     'text'],
      ['requirements-prod.txt',    'text'],
      ['.env.example',             'text'],
      ['pyproject.toml',           'toml'],
      ['setup.py',                 'python'],
      ['setup.cfg',                'ini'],
      ['.gitignore',               'text'],
      ['pytest.ini',               'ini'],
      ['mypy.ini',                 'ini'],
      ['.flake8',                  'ini'],
      ['Makefile',                 'makefile'],
      ['.pre-commit-config.yaml',  'yaml'],
      ['.editorconfig',            'text'],
      ['codecov.yml',              'yaml'],
      ['sonar-project.properties', 'text'],
      ['pyproject.toml',           'toml'],
      ['.dockerignore',            'text'],
      ['logging.ini',              'ini'],
      ['gunicorn.conf.py',         'python'],
    ],
    9: [
      ['app/tasks/background.py',       'python'],
      ['app/tasks/celery_app.py',       'python'],
      ['app/tasks/email_tasks.py',      'python'],
      ['app/tasks/cleanup.py',          'python'],
      ['app/tasks/report_tasks.py',     'python'],
      ['app/tasks/image_tasks.py',      'python'],
      ['app/tasks/export_tasks.py',     'python'],
      ['app/tasks/notification_tasks.py','python'],
      ['app/tasks/worker.py',           'python'],
      ['app/tasks/scheduler.py',        'python'],
      ['app/services/notification.py',  'python'],
      ['app/core/scheduler.py',         'python'],
      ['app/core/redis.py',             'python'],
      ['app/core/queue.py',             'python'],
      ['app/workers/email_worker.py',   'python'],
      ['app/workers/data_worker.py',    'python'],
      ['app/events/handlers.py',        'python'],
      ['app/events/publishers.py',      'python'],
      ['app/events/subscribers.py',     'python'],
      ['app/core/kafka.py',             'python'],
    ],
    10: [
      ['app/admin/dashboard.py',        'python'],
      ['app/admin/routes.py',           'python'],
      ['app/admin/middleware.py',       'python'],
      ['app/services/analytics.py',     'python'],
      ['app/services/metrics.py',       'python'],
      ['app/services/audit.py',         'python'],
      ['app/core/logging.py',           'python'],
      ['app/core/monitoring.py',        'python'],
      ['app/core/tracing.py',           'python'],
      ['app/middleware/logging.py',     'python'],
      ['app/utils/debug.py',            'python'],
      ['app/utils/profiler.py',         'python'],
      ['app/services/reporting.py',     'python'],
      ['app/core/health.py',            'python'],
      ['app/core/telemetry.py',         'python'],
      ['app/admin/views.py',            'python'],
      ['app/services/dashboard.py',     'python'],
      ['app/core/alerting.py',          'python'],
      ['app/utils/query_analyzer.py',   'python'],
      ['app/core/performance.py',       'python'],
    ],
    11: [
      ['tests/conftest.py',           'python'],
      ['tests/test_auth.py',          'python'],
      ['tests/test_users.py',         'python'],
      ['tests/test_items.py',         'python'],
      ['tests/test_health.py',        'python'],
      ['tests/test_security.py',      'python'],
      ['tests/test_db.py',            'python'],
      ['tests/test_api.py',           'python'],
      ['tests/test_tasks.py',         'python'],
      ['tests/test_websockets.py',    'python'],
      ['tests/factories.py',          'python'],
      ['tests/utils.py',              'python'],
      ['tests/mocks.py',              'python'],
      ['tests/fixtures.py',           'python'],
      ['tests/test_middleware.py',    'python'],
      ['tests/test_validators.py',    'python'],
      ['tests/test_services.py',      'python'],
      ['tests/test_admin.py',         'python'],
      ['tests/integration/test_e2e.py','python'],
      ['tests/load/test_performance.py','python'],
    ],
    12: [
      ['README.md',                  'md'],
      ['docs/API.md',                'md'],
      ['docs/SETUP.md',              'md'],
      ['docs/DEPLOYMENT.md',         'md'],
      ['docs/ARCHITECTURE.md',       'md'],
      ['docs/AUTHENTICATION.md',     'md'],
      ['docs/DATABASE.md',           'md'],
      ['docs/CONFIGURATION.md',      'md'],
      ['docs/TESTING.md',            'md'],
      ['docs/PERFORMANCE.md',        'md'],
      ['docs/SECURITY.md',           'md'],
      ['docs/WEBSOCKETS.md',         'md'],
      ['docs/ADMIN.md',              'md'],
      ['docs/TASKS.md',              'md'],
      ['CONTRIBUTING.md',            'md'],
      ['CHANGELOG.md',               'md'],
      ['SECURITY.md',                'md'],
      ['CODE_OF_CONDUCT.md',         'md'],
      ['docs/ROADMAP.md',            'md'],
      ['docs/FAQ.md',                'md'],
    ],
    13: [
      ['app/core/cache.py',               'python'],
      ['app/middleware/cache.py',         'python'],
      ['app/core/pagination.py',          'python'],
      ['app/core/connection_pool.py',     'python'],
      ['app/middleware/compression.py',   'python'],
      ['app/core/async_utils.py',         'python'],
      ['app/services/search.py',          'python'],
      ['app/services/cdn.py',             'python'],
      ['app/utils/batch.py',              'python'],
      ['app/utils/profiler.py',           'python'],
      ['app/core/lazy_loading.py',        'python'],
      ['app/db/query_optimizer.py',       'python'],
      ['app/core/prefetch.py',            'python'],
      ['app/utils/streaming.py',          'python'],
      ['app/core/circuit_breaker.py',     'python'],
      ['app/middleware/gzip.py',          'python'],
      ['app/core/request_coalescing.py',  'python'],
      ['app/utils/memory_optimizer.py',   'python'],
      ['app/core/db_pool.py',             'python'],
      ['app/utils/concurrent.py',         'python'],
    ],
    14: [
      ['openapi.yaml',                     'yaml'],
      ['openapi.json',                     'json'],
      ['asyncapi.yaml',                    'yaml'],
      ['app/schemas/validators.py',        'python'],
      ['app/core/errors.py',               'python'],
      ['app/middleware/validation.py',     'python'],
      ['app/schemas/common.py',            'python'],
      ['app/api/v1/docs.py',               'python'],
      ['app/core/serializers.py',          'python'],
      ['app/schemas/filters.py',           'python'],
      ['app/core/types.py',                'python'],
      ['app/api/versioning.py',            'python'],
      ['app/schemas/request.py',           'python'],
      ['app/schemas/response_models.py',   'python'],
      ['app/middleware/error_handler.py',  'python'],
      ['app/core/transformer.py',          'python'],
      ['app/api/graphql/schema.py',        'python'],
      ['app/api/graphql/resolvers.py',     'python'],
      ['app/api/graphql/types.py',         'python'],
      ['app/api/webhooks/handlers.py',     'python'],
    ],
    15: [
      ['app/seo/sitemap.py',          'python'],
      ['app/seo/robots.py',           'python'],
      ['app/seo/meta.py',             'python'],
      ['app/seo/schema.py',           'python'],
      ['app/seo/og.py',               'python'],
      ['app/middleware/seo.py',       'python'],
      ['app/analytics/ga.py',         'python'],
      ['app/analytics/tracking.py',   'python'],
      ['app/analytics/events.py',     'python'],
      ['app/analytics/funnels.py',    'python'],
      ['static/robots.txt',           'text'],
      ['static/sitemap.xml',          'xml'],
      ['app/analytics/mixpanel.py',   'python'],
      ['app/analytics/segment.py',    'python'],
      ['app/seo/structured_data.py',  'python'],
      ['app/analytics/ab_test.py',    'python'],
      ['app/seo/canonical.py',        'python'],
      ['app/analytics/heatmap.py',    'python'],
      ['app/seo/breadcrumbs.py',      'python'],
      ['app/analytics/retention.py',  'python'],
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// File pools — Python / Django
// ─────────────────────────────────────────────────────────────────────────────

function getFilePools_Django(): Record<number, FileDef[]> {
  return {
    1: [
      ['templates/base.html',              'html'],
      ['templates/home/index.html',        'html'],
      ['templates/users/login.html',       'html'],
      ['templates/users/register.html',    'html'],
      ['templates/dashboard/main.html',    'html'],
      ['templates/dashboard/stats.html',   'html'],
      ['templates/users/profile.html',     'html'],
      ['templates/users/settings.html',    'html'],
      ['templates/emails/welcome.html',    'html'],
      ['templates/emails/reset.html',      'html'],
      ['static/css/style.css',             'css'],
      ['static/css/dashboard.css',         'css'],
      ['static/css/auth.css',              'css'],
      ['static/js/main.js',                'js'],
      ['static/js/dashboard.js',           'js'],
      ['templates/components/nav.html',    'html'],
      ['templates/components/footer.html', 'html'],
      ['templates/components/sidebar.html','html'],
      ['templates/404.html',               'html'],
      ['templates/500.html',               'html'],
    ],
    2: [
      ['core/utils.py',                     'python'],
      ['core/helpers.py',                   'python'],
      ['core/validators.py',                'python'],
      ['core/decorators.py',                'python'],
      ['core/mixins.py',                    'python'],
      ['core/managers.py',                  'python'],
      ['core/signals.py',                   'python'],
      ['core/middleware.py',                'python'],
      ['core/context_processors.py',        'python'],
      ['core/templatetags/filters.py',      'python'],
      ['core/templatetags/tags.py',         'python'],
      ['core/services.py',                  'python'],
      ['core/selectors.py',                 'python'],
      ['core/forms.py',                     'python'],
      ['core/widgets.py',                   'python'],
      ['core/renderers.py',                 'python'],
      ['core/pagination.py',                'python'],
      ['core/exceptions.py',                'python'],
      ['core/email.py',                     'python'],
      ['core/storage.py',                   'python'],
    ],
    3: [
      ['config/urls.py',           'python'],
      ['users/views.py',           'python'],
      ['users/urls.py',            'python'],
      ['api/views.py',             'python'],
      ['api/urls.py',              'python'],
      ['api/serializers.py',       'python'],
      ['api/viewsets.py',          'python'],
      ['api/filters.py',           'python'],
      ['api/permissions.py',       'python'],
      ['api/throttling.py',        'python'],
      ['dashboard/views.py',       'python'],
      ['dashboard/urls.py',        'python'],
      ['core/views.py',            'python'],
      ['api/routers.py',           'python'],
      ['api/renderers.py',         'python'],
      ['api/parsers.py',           'python'],
      ['api/pagination.py',        'python'],
      ['api/exceptions.py',        'python'],
      ['api/schemas.py',           'python'],
      ['api/v2/views.py',          'python'],
    ],
    4: [
      ['users/models.py',                           'python'],
      ['core/models.py',                            'python'],
      ['dashboard/models.py',                       'python'],
      ['users/admin.py',                            'python'],
      ['core/admin.py',                             'python'],
      ['users/managers.py',                         'python'],
      ['users/migrations/0001_initial.py',          'python'],
      ['dashboard/migrations/0001_initial.py',      'python'],
      ['core/migrations/0001_initial.py',           'python'],
      ['users/migrations/0002_add_profile.py',      'python'],
      ['db/initial_data.sql',                       'sql'],
      ['db/indexes.sql',                            'sql'],
      ['db/seed_data.sql',                          'sql'],
      ['db/views.sql',                              'sql'],
      ['core/querysets.py',                         'python'],
      ['core/db_router.py',                         'python'],
      ['core/indexes.py',                           'python'],
      ['users/receivers.py',                        'python'],
      ['core/fixtures/initial.json',                'json'],
      ['core/data_migrations/001_populate.py',      'python'],
    ],
    5: [
      ['users/auth.py',                 'python'],
      ['core/permissions.py',           'python'],
      ['core/authentication.py',        'python'],
      ['users/backends.py',             'python'],
      ['users/tokens.py',               'python'],
      ['core/oauth.py',                 'python'],
      ['config/security.py',            'python'],
      ['config/auth.py',                'python'],
      ['api/permissions.py',            'python'],
      ['core/throttling.py',            'python'],
      ['users/2fa.py',                  'python'],
      ['core/jwt_auth.py',              'python'],
      ['users/password_validators.py',  'python'],
      ['core/audit.py',                 'python'],
      ['core/ip_filter.py',             'python'],
      ['users/social_auth.py',          'python'],
      ['core/csrf.py',                  'python'],
      ['core/content_security.py',      'python'],
      ['users/login_attempts.py',       'python'],
      ['core/rbac.py',                  'python'],
    ],
    6: [
      ['config/settings/base.py',   'python'],
      ['config/settings/prod.py',   'python'],
      ['config/settings/dev.py',    'python'],
      ['config/settings/test.py',   'python'],
      ['config/wsgi.py',            'python'],
      ['config/asgi.py',            'python'],
      ['config/celery.py',          'python'],
      ['core/apps.py',              'python'],
      ['users/apps.py',             'python'],
      ['dashboard/apps.py',         'python'],
      ['core/constants.py',         'python'],
      ['core/enums.py',             'python'],
      ['core/types.py',             'python'],
      ['core/registry.py',          'python'],
      ['core/startup.py',           'python'],
      ['core/checks.py',            'python'],
      ['core/receivers.py',         'python'],
      ['core/routing.py',           'python'],
      ['config/channels.py',        'python'],
      ['core/service_locator.py',   'python'],
    ],
    7: [
      ['Dockerfile',                        'dockerfile'],
      ['docker-compose.yml',                'yaml'],
      ['docker-compose.prod.yml',           'yaml'],
      ['.github/workflows/deploy.yml',      'yaml'],
      ['.github/workflows/test.yml',        'yaml'],
      ['nginx/nginx.conf',                  'nginx'],
      ['scripts/start.sh',                  'sh'],
      ['scripts/migrate.sh',                'sh'],
      ['scripts/collectstatic.sh',          'sh'],
      ['scripts/setup.sh',                  'sh'],
      ['scripts/backup.sh',                 'sh'],
      ['render.yaml',                       'yaml'],
      ['Procfile',                          'text'],
      ['k8s/deployment.yaml',               'yaml'],
      ['k8s/service.yaml',                  'yaml'],
      ['k8s/ingress.yaml',                  'yaml'],
      ['k8s/configmap.yaml',                'yaml'],
      ['.github/workflows/security.yml',    'yaml'],
      ['scripts/health-check.sh',           'sh'],
      ['terraform/main.tf',                 'tf'],
    ],
    8: [
      ['requirements.txt',          'text'],
      ['requirements/base.txt',     'text'],
      ['requirements/prod.txt',     'text'],
      ['requirements/dev.txt',      'text'],
      ['requirements/test.txt',     'text'],
      ['.env.example',              'text'],
      ['pyproject.toml',            'toml'],
      ['setup.cfg',                 'ini'],
      ['.gitignore',                'text'],
      ['Makefile',                  'makefile'],
      ['manage.py',                 'python'],
      ['.pre-commit-config.yaml',   'yaml'],
      ['.editorconfig',             'text'],
      ['codecov.yml',               'yaml'],
      ['pytest.ini',                'ini'],
      ['mypy.ini',                  'ini'],
      ['.flake8',                   'ini'],
      ['.dockerignore',             'text'],
      ['sonar-project.properties',  'text'],
      ['tox.ini',                   'ini'],
    ],
    9: [
      ['core/tasks.py',               'python'],
      ['users/tasks.py',              'python'],
      ['dashboard/tasks.py',          'python'],
      ['core/schedulers.py',          'python'],
      ['core/events.py',              'python'],
      ['core/webhooks.py',            'python'],
      ['core/email.py',               'python'],
      ['core/notifications.py',       'python'],
      ['core/receivers.py',           'python'],
      ['core/signals.py',             'python'],
      ['core/async_tasks.py',         'python'],
      ['core/periodic_tasks.py',      'python'],
      ['core/event_bus.py',           'python'],
      ['core/message_broker.py',      'python'],
      ['core/ws_consumers.py',        'python'],
      ['core/push_notifications.py',  'python'],
      ['core/sms.py',                 'python'],
      ['core/slack_bot.py',           'python'],
      ['core/discord_bot.py',         'python'],
      ['core/webhook_processor.py',   'python'],
    ],
    10: [
      ['core/logging.py',          'python'],
      ['core/monitoring.py',       'python'],
      ['core/metrics.py',          'python'],
      ['core/health.py',           'python'],
      ['core/audit.py',            'python'],
      ['core/debug.py',            'python'],
      ['dashboard/analytics.py',   'python'],
      ['dashboard/charts.py',      'python'],
      ['dashboard/reports.py',     'python'],
      ['users/analytics.py',       'python'],
      ['core/tracing.py',          'python'],
      ['core/profiler.py',         'python'],
      ['core/error_reporting.py',  'python'],
      ['core/performance.py',      'python'],
      ['core/telemetry.py',        'python'],
      ['core/sentry.py',           'python'],
      ['core/datadog.py',          'python'],
      ['core/newrelic.py',         'python'],
      ['core/alerting.py',         'python'],
      ['dashboard/kpis.py',        'python'],
    ],
    11: [
      ['tests/test_models.py',       'python'],
      ['tests/test_views.py',        'python'],
      ['tests/test_api.py',          'python'],
      ['tests/test_auth.py',         'python'],
      ['tests/test_tasks.py',        'python'],
      ['tests/test_signals.py',      'python'],
      ['tests/test_forms.py',        'python'],
      ['tests/test_permissions.py',  'python'],
      ['tests/test_middleware.py',   'python'],
      ['tests/test_validators.py',   'python'],
      ['tests/conftest.py',          'python'],
      ['tests/factories.py',         'python'],
      ['tests/utils.py',             'python'],
      ['tests/mocks.py',             'python'],
      ['tests/fixtures.py',          'python'],
      ['tests/integration/test_e2e.py','python'],
      ['tests/test_admin.py',        'python'],
      ['tests/test_serializers.py',  'python'],
      ['tests/test_services.py',     'python'],
      ['tests/test_email.py',        'python'],
    ],
    12: [
      ['README.md',                'md'],
      ['docs/SETUP.md',            'md'],
      ['docs/API.md',              'md'],
      ['docs/MODELS.md',           'md'],
      ['docs/DEPLOYMENT.md',       'md'],
      ['docs/ARCHITECTURE.md',     'md'],
      ['docs/AUTHENTICATION.md',   'md'],
      ['docs/TESTING.md',          'md'],
      ['docs/CONFIGURATION.md',    'md'],
      ['docs/PERFORMANCE.md',      'md'],
      ['docs/SECURITY.md',         'md'],
      ['docs/ADMIN.md',            'md'],
      ['docs/SIGNALS.md',          'md'],
      ['docs/TASKS.md',            'md'],
      ['CONTRIBUTING.md',          'md'],
      ['CHANGELOG.md',             'md'],
      ['SECURITY.md',              'md'],
      ['CODE_OF_CONDUCT.md',       'md'],
      ['docs/ROADMAP.md',          'md'],
      ['docs/FAQ.md',              'md'],
    ],
    13: [
      ['core/cache.py',             'python'],
      ['dashboard/cache.py',        'python'],
      ['core/pagination.py',        'python'],
      ['core/queryset.py',          'python'],
      ['core/db_router.py',         'python'],
      ['core/indexes.py',           'python'],
      ['core/compression.py',       'python'],
      ['core/prefetch.py',          'python'],
      ['core/select_related.py',    'python'],
      ['core/optimizations.py',     'python'],
      ['core/lazy_loading.py',      'python'],
      ['core/connection_pool.py',   'python'],
      ['core/read_replica.py',      'python'],
      ['core/query_cache.py',       'python'],
      ['core/batch_processor.py',   'python'],
      ['core/streaming.py',         'python'],
      ['core/debounce.py',          'python'],
      ['core/throttle.py',          'python'],
      ['core/cdn.py',               'python'],
      ['core/async_orm.py',         'python'],
    ],
    14: [
      ['api/serializers.py',        'python'],
      ['api/schema.py',             'python'],
      ['api/filters.py',            'python'],
      ['api/pagination.py',         'python'],
      ['api/renderers.py',          'python'],
      ['api/parsers.py',            'python'],
      ['api/exceptions.py',         'python'],
      ['core/validators.py',        'python'],
      ['core/exceptions.py',        'python'],
      ['core/types.py',             'python'],
      ['openapi.yaml',              'yaml'],
      ['openapi.json',              'json'],
      ['api/openapi.py',            'python'],
      ['api/versioning.py',         'python'],
      ['api/negotiation.py',        'python'],
      ['api/graphql/schema.py',     'python'],
      ['api/graphql/types.py',      'python'],
      ['api/graphql/queries.py',    'python'],
      ['api/graphql/mutations.py',  'python'],
      ['api/websocket/consumers.py','python'],
    ],
    15: [
      ['core/seo.py',               'python'],
      ['core/sitemap.py',           'python'],
      ['core/meta.py',              'python'],
      ['core/tracking.py',          'python'],
      ['core/analytics.py',         'python'],
      ['core/structured_data.py',   'python'],
      ['templates/seo/meta.html',   'html'],
      ['templates/seo/og.html',     'html'],
      ['static/robots.txt',         'text'],
      ['static/sitemap.xml',        'xml'],
      ['core/ga4.py',               'python'],
      ['core/ab_testing.py',        'python'],
      ['core/conversion.py',        'python'],
      ['core/heatmap.py',           'python'],
      ['core/user_journey.py',      'python'],
      ['core/attribution.py',       'python'],
      ['core/search_console.py',    'python'],
      ['core/page_speed.py',        'python'],
      ['core/social_meta.py',       'python'],
      ['core/canonical.py',         'python'],
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// File pools — Rust
// ─────────────────────────────────────────────────────────────────────────────

function getFilePools_Rust(): Record<number, FileDef[]> {
  return {
    1: [
      ['src/handlers/mod.rs',          'rust'],
      ['src/handlers/pages.rs',        'rust'],
      ['src/handlers/assets.rs',       'rust'],
      ['src/templates/index.html',     'html'],
      ['src/templates/base.html',      'html'],
      ['src/templates/layout.html',    'html'],
      ['src/templates/dashboard.html', 'html'],
      ['src/templates/login.html',     'html'],
      ['src/templates/error.html',     'html'],
      ['src/static/style.css',         'css'],
      ['src/static/dashboard.css',     'css'],
      ['src/static/auth.css',          'css'],
      ['src/static/main.js',           'js'],
      ['src/static/dashboard.js',      'js'],
      ['src/static/utils.js',          'js'],
      ['src/ui/components.rs',         'rust'],
      ['src/ui/forms.rs',              'rust'],
      ['src/ui/layouts.rs',            'rust'],
      ['src/ui/partials.rs',           'rust'],
      ['src/ui/themes.rs',             'rust'],
    ],
    2: [
      ['src/utils/mod.rs',         'rust'],
      ['src/utils/helpers.rs',     'rust'],
      ['src/utils/validators.rs',  'rust'],
      ['src/utils/formatters.rs',  'rust'],
      ['src/utils/pagination.rs',  'rust'],
      ['src/utils/crypto.rs',      'rust'],
      ['src/utils/email.rs',       'rust'],
      ['src/utils/cache.rs',       'rust'],
      ['src/utils/logger.rs',      'rust'],
      ['src/utils/errors.rs',      'rust'],
      ['src/utils/string.rs',      'rust'],
      ['src/utils/date.rs',        'rust'],
      ['src/utils/file.rs',        'rust'],
      ['src/utils/http.rs',        'rust'],
      ['src/utils/image.rs',       'rust'],
      ['src/utils/retry.rs',       'rust'],
      ['src/utils/throttle.rs',    'rust'],
      ['src/utils/uuid.rs',        'rust'],
      ['src/utils/serializer.rs',  'rust'],
      ['src/utils/parser.rs',      'rust'],
    ],
    3: [
      ['src/main.rs',                  'rust'],
      ['src/lib.rs',                   'rust'],
      ['src/routes/mod.rs',            'rust'],
      ['src/routes/users.rs',          'rust'],
      ['src/routes/auth.rs',           'rust'],
      ['src/routes/items.rs',          'rust'],
      ['src/routes/health.rs',         'rust'],
      ['src/routes/admin.rs',          'rust'],
      ['src/routes/upload.rs',         'rust'],
      ['src/routes/webhooks.rs',       'rust'],
      ['src/handlers/users.rs',        'rust'],
      ['src/handlers/auth.rs',         'rust'],
      ['src/handlers/items.rs',        'rust'],
      ['src/handlers/admin.rs',        'rust'],
      ['src/middleware/mod.rs',        'rust'],
      ['src/middleware/logger.rs',     'rust'],
      ['src/middleware/cors.rs',       'rust'],
      ['src/middleware/auth.rs',       'rust'],
      ['src/server.rs',                'rust'],
      ['src/app.rs',                   'rust'],
    ],
    4: [
      ['src/db/mod.rs',            'rust'],
      ['src/db/pool.rs',           'rust'],
      ['src/db/queries.rs',        'rust'],
      ['src/db/migrations.rs',     'rust'],
      ['src/db/seed.rs',           'rust'],
      ['src/db/transaction.rs',    'rust'],
      ['src/models/mod.rs',        'rust'],
      ['src/models/user.rs',       'rust'],
      ['src/models/item.rs',       'rust'],
      ['src/models/session.rs',    'rust'],
      ['src/models/audit.rs',      'rust'],
      ['migrations/001_init.sql',  'sql'],
      ['migrations/002_users.sql', 'sql'],
      ['migrations/003_items.sql', 'sql'],
      ['migrations/004_sessions.sql','sql'],
      ['migrations/005_audit.sql', 'sql'],
      ['src/repository/mod.rs',    'rust'],
      ['src/repository/user.rs',   'rust'],
      ['src/repository/item.rs',   'rust'],
      ['src/db/query_builder.rs',  'rust'],
    ],
    5: [
      ['src/auth/mod.rs',               'rust'],
      ['src/auth/jwt.rs',               'rust'],
      ['src/auth/password.rs',          'rust'],
      ['src/auth/oauth.rs',             'rust'],
      ['src/auth/session.rs',           'rust'],
      ['src/auth/tokens.rs',            'rust'],
      ['src/auth/permissions.rs',       'rust'],
      ['src/auth/rbac.rs',              'rust'],
      ['src/auth/2fa.rs',               'rust'],
      ['src/auth/api_keys.rs',          'rust'],
      ['src/middleware/auth.rs',        'rust'],
      ['src/middleware/rate_limit.rs',  'rust'],
      ['src/middleware/cors.rs',        'rust'],
      ['src/middleware/csrf.rs',        'rust'],
      ['src/middleware/security.rs',    'rust'],
      ['src/crypto/mod.rs',             'rust'],
      ['src/crypto/hashing.rs',         'rust'],
      ['src/crypto/encryption.rs',      'rust'],
      ['src/crypto/signing.rs',         'rust'],
      ['src/crypto/kdf.rs',             'rust'],
    ],
    6: [
      ['src/config/mod.rs',          'rust'],
      ['src/config/app.rs',          'rust'],
      ['src/config/database.rs',     'rust'],
      ['src/config/auth.rs',         'rust'],
      ['src/config/server.rs',       'rust'],
      ['src/config/redis.rs',        'rust'],
      ['src/config/storage.rs',      'rust'],
      ['src/config/email.rs',        'rust'],
      ['src/state/mod.rs',           'rust'],
      ['src/state/app_state.rs',     'rust'],
      ['src/state/cache.rs',         'rust'],
      ['src/state/metrics.rs',       'rust'],
      ['src/state/session.rs',       'rust'],
      ['src/types/mod.rs',           'rust'],
      ['src/types/errors.rs',        'rust'],
      ['src/types/result.rs',        'rust'],
      ['src/types/pagination.rs',    'rust'],
      ['src/constants.rs',           'rust'],
      ['src/env.rs',                 'rust'],
      ['src/feature_flags.rs',       'rust'],
    ],
    7: [
      ['Dockerfile',                       'dockerfile'],
      ['Dockerfile.prod',                  'dockerfile'],
      ['docker-compose.yml',               'yaml'],
      ['docker-compose.prod.yml',          'yaml'],
      ['.github/workflows/deploy.yml',     'yaml'],
      ['.github/workflows/test.yml',       'yaml'],
      ['.github/workflows/lint.yml',       'yaml'],
      ['.github/workflows/release.yml',    'yaml'],
      ['nginx/nginx.conf',                 'nginx'],
      ['nginx/ssl.conf',                   'nginx'],
      ['scripts/start.sh',                 'sh'],
      ['scripts/build.sh',                 'sh'],
      ['scripts/migrate.sh',               'sh'],
      ['scripts/deploy.sh',                'sh'],
      ['scripts/benchmark.sh',             'sh'],
      ['render.yaml',                      'yaml'],
      ['k8s/deployment.yaml',              'yaml'],
      ['k8s/service.yaml',                 'yaml'],
      ['k8s/ingress.yaml',                 'yaml'],
      ['k8s/configmap.yaml',               'yaml'],
    ],
    8: [
      ['Cargo.toml',              'toml'],
      ['Cargo.lock',              'toml'],
      ['.env.example',            'text'],
      ['.gitignore',              'text'],
      ['rustfmt.toml',            'toml'],
      ['clippy.toml',             'toml'],
      ['Makefile',                'makefile'],
      ['.cargo/config.toml',      'toml'],
      ['build.rs',                'rust'],
      ['Cross.toml',              'toml'],
      ['.pre-commit-config.yaml', 'yaml'],
      ['deny.toml',               'toml'],
      ['codecov.yml',             'yaml'],
      ['sonar-project.properties','text'],
      ['.editorconfig',           'text'],
      ['release.toml',            'toml'],
      ['workspace.toml',          'toml'],
      ['audit.toml',              'toml'],
      ['Taskfile.yml',            'yaml'],
      ['.dockerignore',           'text'],
    ],
    9: [
      ['src/tasks/mod.rs',            'rust'],
      ['src/tasks/background.rs',     'rust'],
      ['src/tasks/email.rs',          'rust'],
      ['src/tasks/cleanup.rs',        'rust'],
      ['src/tasks/scheduler.rs',      'rust'],
      ['src/tasks/notifications.rs',  'rust'],
      ['src/tasks/reports.rs',        'rust'],
      ['src/tasks/exports.rs',        'rust'],
      ['src/workers/mod.rs',          'rust'],
      ['src/workers/processor.rs',    'rust'],
      ['src/workers/queue.rs',        'rust'],
      ['src/workers/pool.rs',         'rust'],
      ['src/workers/consumer.rs',     'rust'],
      ['src/events/mod.rs',           'rust'],
      ['src/events/publisher.rs',     'rust'],
      ['src/events/subscriber.rs',    'rust'],
      ['src/events/handlers.rs',      'rust'],
      ['src/queue/redis.rs',          'rust'],
      ['src/queue/kafka.rs',          'rust'],
      ['src/queue/rabbitmq.rs',       'rust'],
    ],
    10: [
      ['src/metrics/mod.rs',         'rust'],
      ['src/metrics/collector.rs',   'rust'],
      ['src/metrics/prometheus.rs',  'rust'],
      ['src/metrics/health.rs',      'rust'],
      ['src/metrics/counters.rs',    'rust'],
      ['src/logging/mod.rs',         'rust'],
      ['src/logging/middleware.rs',  'rust'],
      ['src/logging/tracing.rs',     'rust'],
      ['src/logging/structured.rs',  'rust'],
      ['src/admin/mod.rs',           'rust'],
      ['src/admin/routes.rs',        'rust'],
      ['src/admin/handlers.rs',      'rust'],
      ['src/admin/dashboard.rs',     'rust'],
      ['src/telemetry/mod.rs',       'rust'],
      ['src/telemetry/opentelemetry.rs','rust'],
      ['src/debug/mod.rs',           'rust'],
      ['src/debug/inspector.rs',     'rust'],
      ['src/profiling/mod.rs',       'rust'],
      ['src/profiling/flamegraph.rs','rust'],
      ['src/alerting/mod.rs',        'rust'],
    ],
    11: [
      ['tests/integration/auth.rs',    'rust'],
      ['tests/integration/users.rs',   'rust'],
      ['tests/integration/items.rs',   'rust'],
      ['tests/integration/health.rs',  'rust'],
      ['tests/integration/admin.rs',   'rust'],
      ['tests/unit/models.rs',         'rust'],
      ['tests/unit/utils.rs',          'rust'],
      ['tests/unit/auth.rs',           'rust'],
      ['tests/unit/validators.rs',     'rust'],
      ['tests/unit/services.rs',       'rust'],
      ['tests/common/mod.rs',          'rust'],
      ['tests/common/fixtures.rs',     'rust'],
      ['tests/common/helpers.rs',      'rust'],
      ['tests/common/mocks.rs',        'rust'],
      ['benches/api.rs',               'rust'],
      ['benches/db.rs',                'rust'],
      ['benches/crypto.rs',            'rust'],
      ['benches/serialization.rs',     'rust'],
      ['tests/e2e/flow.rs',            'rust'],
      ['tests/load/stress.rs',         'rust'],
    ],
    12: [
      ['README.md',                 'md'],
      ['docs/API.md',               'md'],
      ['docs/SETUP.md',             'md'],
      ['docs/ARCHITECTURE.md',      'md'],
      ['docs/DEPLOYMENT.md',        'md'],
      ['docs/PERFORMANCE.md',       'md'],
      ['docs/SECURITY.md',          'md'],
      ['docs/CONFIGURATION.md',     'md'],
      ['docs/TESTING.md',           'md'],
      ['docs/DATABASE.md',          'md'],
      ['CONTRIBUTING.md',           'md'],
      ['CHANGELOG.md',              'md'],
      ['SECURITY.md',               'md'],
      ['CODE_OF_CONDUCT.md',        'md'],
      ['docs/ROADMAP.md',           'md'],
      ['docs/FAQ.md',               'md'],
      ['docs/BENCHMARKS.md',        'md'],
      ['docs/CRATES.md',            'md'],
      ['docs/ASYNC.md',             'md'],
      ['docs/ERROR_HANDLING.md',    'md'],
    ],
    13: [
      ['src/cache/mod.rs',           'rust'],
      ['src/cache/redis.rs',         'rust'],
      ['src/cache/memory.rs',        'rust'],
      ['src/cache/strategies.rs',    'rust'],
      ['src/cache/lru.rs',           'rust'],
      ['src/cache/ttl.rs',           'rust'],
      ['src/utils/compression.rs',   'rust'],
      ['src/utils/async_utils.rs',   'rust'],
      ['src/utils/batch.rs',         'rust'],
      ['src/utils/pool.rs',          'rust'],
      ['src/db/connection_pool.rs',  'rust'],
      ['src/db/query_builder.rs',    'rust'],
      ['src/db/read_replica.rs',     'rust'],
      ['src/middleware/cache.rs',    'rust'],
      ['src/middleware/compress.rs', 'rust'],
      ['benches/performance.rs',     'rust'],
      ['benches/memory.rs',          'rust'],
      ['src/simd/mod.rs',            'rust'],
      ['src/zero_copy/mod.rs',       'rust'],
      ['src/lockfree/mod.rs',        'rust'],
    ],
    14: [
      ['src/schemas/mod.rs',        'rust'],
      ['src/schemas/user.rs',       'rust'],
      ['src/schemas/item.rs',       'rust'],
      ['src/schemas/response.rs',   'rust'],
      ['src/schemas/error.rs',      'rust'],
      ['src/schemas/pagination.rs', 'rust'],
      ['src/schemas/auth.rs',       'rust'],
      ['src/schemas/request.rs',    'rust'],
      ['src/validators/mod.rs',     'rust'],
      ['src/validators/user.rs',    'rust'],
      ['src/validators/item.rs',    'rust'],
      ['src/validators/common.rs',  'rust'],
      ['openapi.yaml',              'yaml'],
      ['openapi.json',              'json'],
      ['src/openapi/mod.rs',        'rust'],
      ['src/graphql/mod.rs',        'rust'],
      ['src/graphql/schema.rs',     'rust'],
      ['src/graphql/resolvers.rs',  'rust'],
      ['src/grpc/mod.rs',           'rust'],
      ['proto/service.proto',       'proto'],
    ],
    15: [
      ['src/seo/mod.rs',           'rust'],
      ['src/seo/sitemap.rs',       'rust'],
      ['src/seo/robots.rs',        'rust'],
      ['src/seo/meta.rs',          'rust'],
      ['src/seo/schema.rs',        'rust'],
      ['src/seo/og.rs',            'rust'],
      ['src/seo/canonical.rs',     'rust'],
      ['src/analytics/mod.rs',     'rust'],
      ['src/analytics/tracker.rs', 'rust'],
      ['src/analytics/ga.rs',      'rust'],
      ['src/analytics/events.rs',  'rust'],
      ['src/analytics/funnels.rs', 'rust'],
      ['static/robots.txt',        'text'],
      ['static/sitemap.xml',       'xml'],
      ['src/analytics/ab_test.rs', 'rust'],
      ['src/analytics/cohort.rs',  'rust'],
      ['src/seo/breadcrumbs.rs',   'rust'],
      ['src/seo/structured_data.rs','rust'],
      ['src/analytics/heatmap.rs', 'rust'],
      ['src/analytics/retention.rs','rust'],
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// File pools — Go
// ─────────────────────────────────────────────────────────────────────────────

function getFilePools_Go(): Record<number, FileDef[]> {
  return {
    1: [
      ['templates/index.html',          'html'],
      ['templates/layout.html',         'html'],
      ['templates/dashboard.html',      'html'],
      ['templates/login.html',          'html'],
      ['templates/register.html',       'html'],
      ['templates/profile.html',        'html'],
      ['templates/settings.html',       'html'],
      ['templates/error.html',          'html'],
      ['templates/components/nav.html', 'html'],
      ['templates/components/footer.html','html'],
      ['templates/emails/welcome.html', 'html'],
      ['static/css/style.css',          'css'],
      ['static/css/dashboard.css',      'css'],
      ['static/css/auth.css',           'css'],
      ['static/js/main.js',             'js'],
      ['static/js/dashboard.js',        'js'],
      ['static/js/utils.js',            'js'],
      ['static/js/api.js',              'js'],
      ['internal/ui/renderer.go',       'go'],
      ['internal/ui/helpers.go',        'go'],
    ],
    2: [
      ['internal/utils/helpers.go',    'go'],
      ['internal/utils/validator.go',  'go'],
      ['internal/utils/response.go',   'go'],
      ['internal/utils/pagination.go', 'go'],
      ['internal/utils/email.go',      'go'],
      ['internal/utils/cache.go',      'go'],
      ['internal/utils/errors.go',     'go'],
      ['internal/utils/strings.go',    'go'],
      ['internal/utils/time.go',       'go'],
      ['internal/utils/file.go',       'go'],
      ['internal/utils/image.go',      'go'],
      ['internal/utils/http.go',       'go'],
      ['internal/utils/uuid.go',       'go'],
      ['internal/utils/retry.go',      'go'],
      ['internal/utils/crypto.go',     'go'],
      ['pkg/utils/logger.go',          'go'],
      ['pkg/utils/tracer.go',          'go'],
      ['pkg/utils/metrics.go',         'go'],
      ['pkg/utils/config.go',          'go'],
      ['pkg/utils/file.go',            'go'],
    ],
    3: [
      ['cmd/server/main.go',               'go'],
      ['cmd/worker/main.go',               'go'],
      ['cmd/migrate/main.go',              'go'],
      ['internal/handlers/user.go',        'go'],
      ['internal/handlers/auth.go',        'go'],
      ['internal/handlers/item.go',        'go'],
      ['internal/handlers/health.go',      'go'],
      ['internal/handlers/admin.go',       'go'],
      ['internal/handlers/upload.go',      'go'],
      ['internal/handlers/webhook.go',     'go'],
      ['internal/handlers/search.go',      'go'],
      ['internal/handlers/export.go',      'go'],
      ['internal/router/router.go',        'go'],
      ['internal/router/api.go',           'go'],
      ['internal/router/middleware.go',    'go'],
      ['internal/middleware/auth.go',      'go'],
      ['internal/middleware/logger.go',    'go'],
      ['internal/middleware/cors.go',      'go'],
      ['internal/middleware/rate_limit.go','go'],
      ['internal/middleware/recovery.go',  'go'],
    ],
    4: [
      ['internal/db/db.go',              'go'],
      ['internal/db/migrations.go',      'go'],
      ['internal/db/seed.go',            'go'],
      ['internal/db/transaction.go',     'go'],
      ['internal/models/user.go',        'go'],
      ['internal/models/item.go',        'go'],
      ['internal/models/session.go',     'go'],
      ['internal/models/audit.go',       'go'],
      ['internal/repository/user.go',    'go'],
      ['internal/repository/item.go',    'go'],
      ['internal/repository/session.go', 'go'],
      ['internal/repository/base.go',    'go'],
      ['migrations/001_init.sql',        'sql'],
      ['migrations/002_users.sql',       'sql'],
      ['migrations/003_items.sql',       'sql'],
      ['migrations/004_sessions.sql',    'sql'],
      ['migrations/005_audit.sql',       'sql'],
      ['internal/db/query_builder.go',   'go'],
      ['internal/db/pool.go',            'go'],
      ['internal/db/read_replica.go',    'go'],
    ],
    5: [
      ['internal/auth/jwt.go',               'go'],
      ['internal/auth/password.go',          'go'],
      ['internal/auth/oauth.go',             'go'],
      ['internal/auth/session.go',           'go'],
      ['internal/auth/tokens.go',            'go'],
      ['internal/auth/permissions.go',       'go'],
      ['internal/auth/rbac.go',              'go'],
      ['internal/auth/2fa.go',               'go'],
      ['internal/auth/api_keys.go',          'go'],
      ['internal/middleware/auth.go',        'go'],
      ['internal/middleware/rate_limit.go',  'go'],
      ['internal/middleware/cors.go',        'go'],
      ['internal/middleware/csrf.go',        'go'],
      ['internal/middleware/security.go',    'go'],
      ['pkg/crypto/hashing.go',             'go'],
      ['pkg/crypto/encryption.go',          'go'],
      ['pkg/crypto/signing.go',             'go'],
      ['internal/auth/social.go',           'go'],
      ['internal/auth/audit.go',            'go'],
      ['internal/auth/ip_filter.go',        'go'],
    ],
    6: [
      ['internal/config/config.go',    'go'],
      ['internal/config/database.go',  'go'],
      ['internal/config/server.go',    'go'],
      ['internal/config/redis.go',     'go'],
      ['internal/config/auth.go',      'go'],
      ['internal/config/email.go',     'go'],
      ['internal/config/storage.go',   'go'],
      ['internal/config/app.go',       'go'],
      ['internal/store/user_store.go', 'go'],
      ['internal/store/item_store.go', 'go'],
      ['internal/store/cache.go',      'go'],
      ['internal/store/session.go',    'go'],
      ['internal/store/redis.go',      'go'],
      ['internal/store/memory.go',     'go'],
      ['internal/types/user.go',       'go'],
      ['internal/types/response.go',   'go'],
      ['internal/types/errors.go',     'go'],
      ['internal/types/pagination.go', 'go'],
      ['internal/constants/app.go',    'go'],
      ['internal/feature_flags.go',    'go'],
    ],
    7: [
      ['Dockerfile',                        'dockerfile'],
      ['Dockerfile.prod',                   'dockerfile'],
      ['docker-compose.yml',                'yaml'],
      ['docker-compose.prod.yml',           'yaml'],
      ['.github/workflows/deploy.yml',      'yaml'],
      ['.github/workflows/test.yml',        'yaml'],
      ['.github/workflows/lint.yml',        'yaml'],
      ['.github/workflows/release.yml',     'yaml'],
      ['nginx/nginx.conf',                  'nginx'],
      ['nginx/ssl.conf',                    'nginx'],
      ['scripts/start.sh',                  'sh'],
      ['scripts/build.sh',                  'sh'],
      ['scripts/migrate.sh',                'sh'],
      ['scripts/deploy.sh',                 'sh'],
      ['scripts/health-check.sh',           'sh'],
      ['Makefile',                          'makefile'],
      ['render.yaml',                       'yaml'],
      ['k8s/deployment.yaml',               'yaml'],
      ['k8s/service.yaml',                  'yaml'],
      ['k8s/ingress.yaml',                  'yaml'],
    ],
    8: [
      ['go.mod',                    'go'],
      ['go.sum',                    'go'],
      ['.env.example',              'text'],
      ['.gitignore',                'text'],
      ['.golangci.yml',             'yaml'],
      ['air.toml',                  'toml'],
      ['Makefile',                  'makefile'],
      ['.goreleaser.yml',           'yaml'],
      ['codecov.yml',               'yaml'],
      ['sonar-project.properties',  'text'],
      ['Taskfile.yml',              'yaml'],
      ['.pre-commit-config.yaml',   'yaml'],
      ['.editorconfig',             'text'],
      ['.dockerignore',             'text'],
      ['buf.yaml',                  'yaml'],
      ['buf.gen.yaml',              'yaml'],
      ['atlas.hcl',                 'text'],
      ['wire.go',                   'go'],
      ['wire_gen.go',               'go'],
      ['mockery.yaml',              'yaml'],
    ],
    9: [
      ['internal/jobs/scheduler.go',    'go'],
      ['internal/jobs/email.go',        'go'],
      ['internal/jobs/cleanup.go',      'go'],
      ['internal/jobs/reports.go',      'go'],
      ['internal/jobs/notifications.go','go'],
      ['internal/jobs/exports.go',      'go'],
      ['internal/jobs/backup.go',       'go'],
      ['internal/jobs/sync.go',         'go'],
      ['internal/workers/pool.go',      'go'],
      ['internal/workers/processor.go', 'go'],
      ['internal/workers/queue.go',     'go'],
      ['internal/workers/consumer.go',  'go'],
      ['internal/events/publisher.go',  'go'],
      ['internal/events/subscriber.go', 'go'],
      ['internal/events/handlers.go',   'go'],
      ['pkg/queue/redis_queue.go',      'go'],
      ['pkg/queue/kafka.go',            'go'],
      ['pkg/queue/rabbitmq.go',         'go'],
      ['internal/cron/runner.go',       'go'],
      ['internal/cron/tasks.go',        'go'],
    ],
    10: [
      ['internal/metrics/metrics.go',     'go'],
      ['internal/metrics/health.go',      'go'],
      ['internal/metrics/prometheus.go',  'go'],
      ['internal/metrics/counters.go',    'go'],
      ['internal/logging/logger.go',      'go'],
      ['internal/logging/middleware.go',  'go'],
      ['internal/logging/structured.go',  'go'],
      ['internal/admin/handlers.go',      'go'],
      ['internal/admin/middleware.go',    'go'],
      ['internal/admin/routes.go',        'go'],
      ['internal/admin/dashboard.go',     'go'],
      ['internal/tracing/tracer.go',      'go'],
      ['internal/tracing/opentelemetry.go','go'],
      ['internal/profiling/pprof.go',     'go'],
      ['internal/debug/inspector.go',     'go'],
      ['internal/alerting/alerts.go',     'go'],
      ['internal/alerting/pagerduty.go',  'go'],
      ['internal/dashboard/kpis.go',      'go'],
      ['internal/reporting/generator.go', 'go'],
      ['internal/audit/logger.go',        'go'],
    ],
    11: [
      ['tests/integration/auth_test.go',    'go'],
      ['tests/integration/user_test.go',    'go'],
      ['tests/integration/item_test.go',    'go'],
      ['tests/integration/health_test.go',  'go'],
      ['tests/integration/admin_test.go',   'go'],
      ['tests/unit/handlers_test.go',       'go'],
      ['tests/unit/models_test.go',         'go'],
      ['tests/unit/utils_test.go',          'go'],
      ['tests/unit/auth_test.go',           'go'],
      ['tests/unit/services_test.go',       'go'],
      ['tests/helpers/fixtures.go',         'go'],
      ['tests/helpers/setup.go',            'go'],
      ['tests/helpers/mocks.go',            'go'],
      ['tests/helpers/matchers.go',         'go'],
      ['tests/e2e/api_test.go',             'go'],
      ['tests/e2e/flow_test.go',            'go'],
      ['tests/bench/api_bench_test.go',     'go'],
      ['tests/bench/db_bench_test.go',      'go'],
      ['tests/load/stress_test.go',         'go'],
      ['tests/contract/api_test.go',        'go'],
    ],
    12: [
      ['README.md',               'md'],
      ['docs/API.md',             'md'],
      ['docs/SETUP.md',           'md'],
      ['CONTRIBUTING.md',         'md'],
      ['docs/ARCHITECTURE.md',    'md'],
      ['docs/DEPLOYMENT.md',      'md'],
      ['docs/CONFIGURATION.md',   'md'],
      ['docs/SECURITY.md',        'md'],
      ['docs/PERFORMANCE.md',     'md'],
      ['docs/DATABASE.md',        'md'],
      ['docs/TESTING.md',         'md'],
      ['docs/EVENTS.md',          'md'],
      ['docs/METRICS.md',         'md'],
      ['CHANGELOG.md',            'md'],
      ['SECURITY.md',             'md'],
      ['CODE_OF_CONDUCT.md',      'md'],
      ['docs/ROADMAP.md',         'md'],
      ['docs/FAQ.md',             'md'],
      ['docs/ADR/001-arch.md',    'md'],
      ['docs/ADR/002-db.md',      'md'],
    ],
    13: [
      ['internal/cache/redis.go',      'go'],
      ['internal/cache/memory.go',     'go'],
      ['internal/cache/strategies.go', 'go'],
      ['internal/cache/lru.go',        'go'],
      ['internal/cache/ttl.go',        'go'],
      ['pkg/db/pool.go',               'go'],
      ['internal/utils/compress.go',   'go'],
      ['internal/utils/batch.go',      'go'],
      ['internal/db/query_builder.go', 'go'],
      ['internal/db/read_replica.go',  'go'],
      ['pkg/profiler/profiler.go',     'go'],
      ['internal/utils/stream.go',     'go'],
      ['internal/utils/pipeline.go',   'go'],
      ['internal/middleware/cache.go', 'go'],
      ['internal/utils/parallel.go',   'go'],
      ['tests/bench/api_bench_test.go','go'],
      ['tests/bench/cache_bench_test.go','go'],
      ['internal/utils/pool.go',       'go'],
      ['internal/utils/lazy.go',       'go'],
      ['internal/utils/circuit.go',    'go'],
    ],
    14: [
      ['internal/dto/user_dto.go',      'go'],
      ['internal/dto/item_dto.go',      'go'],
      ['internal/dto/response_dto.go',  'go'],
      ['internal/dto/pagination.go',    'go'],
      ['internal/dto/auth_dto.go',      'go'],
      ['internal/dto/error_dto.go',     'go'],
      ['internal/dto/request_dto.go',   'go'],
      ['internal/validators/user.go',   'go'],
      ['internal/validators/item.go',   'go'],
      ['internal/validators/common.go', 'go'],
      ['openapi.yaml',                  'yaml'],
      ['openapi.json',                  'json'],
      ['proto/service.proto',           'proto'],
      ['proto/user.proto',              'proto'],
      ['internal/grpc/server.go',       'go'],
      ['internal/grpc/handlers.go',     'go'],
      ['internal/graphql/schema.go',    'go'],
      ['internal/graphql/resolvers.go', 'go'],
      ['internal/graphql/types.go',     'go'],
      ['internal/websocket/handler.go', 'go'],
    ],
    15: [
      ['internal/seo/sitemap.go',      'go'],
      ['internal/seo/robots.go',       'go'],
      ['internal/seo/meta.go',         'go'],
      ['internal/seo/schema.go',       'go'],
      ['internal/seo/og.go',           'go'],
      ['internal/seo/canonical.go',    'go'],
      ['internal/analytics/tracker.go','go'],
      ['internal/analytics/ga.go',     'go'],
      ['internal/analytics/events.go', 'go'],
      ['internal/analytics/funnels.go','go'],
      ['internal/analytics/ab_test.go','go'],
      ['internal/analytics/cohort.go', 'go'],
      ['internal/analytics/retention.go','go'],
      ['static/robots.txt',            'text'],
      ['static/sitemap.xml',           'xml'],
      ['internal/seo/structured.go',   'go'],
      ['internal/seo/breadcrumbs.go',  'go'],
      ['internal/analytics/heatmap.go','go'],
      ['internal/analytics/session.go','go'],
      ['internal/analytics/segment.go','go'],
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// File pools — Luau / Roblox
// ─────────────────────────────────────────────────────────────────────────────

function getFilePools_Luau(): Record<number, FileDef[]> {
  return {
    1: [
      ['src/StarterGui/MainGui.luau',            'luau'],
      ['src/StarterGui/HudGui.luau',             'luau'],
      ['src/StarterGui/MenuGui.luau',            'luau'],
      ['src/StarterGui/ShopGui.luau',            'luau'],
      ['src/StarterGui/InventoryGui.luau',       'luau'],
      ['src/StarterGui/NotificationGui.luau',    'luau'],
      ['src/StarterGui/LoadingGui.luau',         'luau'],
      ['src/StarterGui/SettingsGui.luau',        'luau'],
      ['src/StarterGui/LeaderboardGui.luau',     'luau'],
      ['src/StarterGui/ChatGui.luau',            'luau'],
      ['src/StarterGui/QuestGui.luau',           'luau'],
      ['src/StarterGui/MapGui.luau',             'luau'],
      ['src/StarterGui/CurrencyGui.luau',        'luau'],
      ['src/StarterGui/FriendsGui.luau',         'luau'],
      ['src/StarterGui/AchievementGui.luau',     'luau'],
      ['src/StarterGui/TutorialGui.luau',        'luau'],
      ['src/StarterGui/TradeGui.luau',           'luau'],
      ['src/StarterGui/CraftingGui.luau',        'luau'],
      ['src/StarterGui/PetGui.luau',             'luau'],
      ['src/StarterGui/GuildGui.luau',           'luau'],
    ],
    2: [
      ['src/StarterPlayerScripts/LocalMain.luau',        'luau'],
      ['src/StarterPlayerScripts/CameraController.luau', 'luau'],
      ['src/StarterPlayerScripts/InputHandler.luau',     'luau'],
      ['src/StarterPlayerScripts/UIController.luau',     'luau'],
      ['src/StarterPlayerScripts/SoundController.luau',  'luau'],
      ['src/StarterPlayerScripts/ShopController.luau',   'luau'],
      ['src/StarterPlayerScripts/InventoryClient.luau',  'luau'],
      ['src/StarterPlayerScripts/AnimationClient.luau',  'luau'],
      ['src/StarterPlayerScripts/EffectsClient.luau',    'luau'],
      ['src/StarterPlayerScripts/NetworkClient.luau',    'luau'],
      ['src/StarterPlayerScripts/QuestClient.luau',      'luau'],
      ['src/StarterPlayerScripts/ChatClient.luau',       'luau'],
      ['src/StarterPlayerScripts/PetClient.luau',        'luau'],
      ['src/StarterPlayerScripts/TradeClient.luau',      'luau'],
      ['src/StarterPlayerScripts/CraftingClient.luau',   'luau'],
      ['src/StarterPlayerScripts/GuildClient.luau',      'luau'],
      ['src/StarterPlayerScripts/MapController.luau',    'luau'],
      ['src/StarterPlayerScripts/TutorialClient.luau',   'luau'],
      ['src/StarterPlayerScripts/NotificationClient.luau','luau'],
      ['src/StarterPlayerScripts/AchievementClient.luau','luau'],
    ],
    3: [
      ['src/ServerScriptService/Server.luau',            'luau'],
      ['src/ServerScriptService/DataHandler.luau',       'luau'],
      ['src/ServerScriptService/RemoteHandler.luau',     'luau'],
      ['src/ServerScriptService/PlayerHandler.luau',     'luau'],
      ['src/ServerScriptService/ShopHandler.luau',       'luau'],
      ['src/ServerScriptService/AdminHandler.luau',      'luau'],
      ['src/ServerScriptService/GameLoop.luau',          'luau'],
      ['src/ServerScriptService/MatchmakingServer.luau', 'luau'],
      ['src/ServerScriptService/EventHandler.luau',      'luau'],
      ['src/ServerScriptService/AntiCheat.luau',         'luau'],
      ['src/ServerScriptService/QuestHandler.luau',      'luau'],
      ['src/ServerScriptService/ChatHandler.luau',       'luau'],
      ['src/ServerScriptService/PetHandler.luau',        'luau'],
      ['src/ServerScriptService/TradeHandler.luau',      'luau'],
      ['src/ServerScriptService/CraftingHandler.luau',   'luau'],
      ['src/ServerScriptService/GuildHandler.luau',      'luau'],
      ['src/ServerScriptService/EnemyHandler.luau',      'luau'],
      ['src/ServerScriptService/LootHandler.luau',       'luau'],
      ['src/ServerScriptService/WorldHandler.luau',      'luau'],
      ['src/ServerScriptService/WeatherHandler.luau',    'luau'],
    ],
    4: [
      ['src/ServerScriptService/DataStore.luau',         'luau'],
      ['src/ServerScriptService/PlayerData.luau',        'luau'],
      ['src/ServerScriptService/SaveSystem.luau',        'luau'],
      ['src/ServerScriptService/LeaderboardData.luau',   'luau'],
      ['src/ServerScriptService/InventoryData.luau',     'luau'],
      ['src/ServerScriptService/CurrencyData.luau',      'luau'],
      ['src/ServerScriptService/SettingsData.luau',      'luau'],
      ['src/ServerScriptService/StatsData.luau',         'luau'],
      ['src/ServerScriptService/AchievementData.luau',   'luau'],
      ['src/ServerScriptService/ProfileService.luau',    'luau'],
      ['src/ServerScriptService/QuestData.luau',         'luau'],
      ['src/ServerScriptService/PetData.luau',           'luau'],
      ['src/ServerScriptService/GuildData.luau',         'luau'],
      ['src/ServerScriptService/FriendData.luau',        'luau'],
      ['src/ServerScriptService/CraftingData.luau',      'luau'],
      ['src/ServerScriptService/WorldData.luau',         'luau'],
      ['src/ServerScriptService/EnemyData.luau',         'luau'],
      ['src/ServerScriptService/LootTable.luau',         'luau'],
      ['src/ServerScriptService/BackpackData.luau',      'luau'],
      ['src/ServerScriptService/TransactionLog.luau',    'luau'],
    ],
    5: [
      ['src/ServerScriptService/BanSystem.luau',          'luau'],
      ['src/ServerScriptService/Permissions.luau',        'luau'],
      ['src/ServerScriptService/AntiExploit.luau',        'luau'],
      ['src/ServerScriptService/KickSystem.luau',         'luau'],
      ['src/ServerScriptService/RateLimiter.luau',        'luau'],
      ['src/ServerScriptService/SpamFilter.luau',         'luau'],
      ['src/ServerScriptService/ReportSystem.luau',       'luau'],
      ['src/ServerScriptService/ModerationLog.luau',      'luau'],
      ['src/ServerScriptService/TeleportSecurity.luau',   'luau'],
      ['src/ServerScriptService/ValidationServer.luau',   'luau'],
      ['src/ServerScriptService/SanityCheck.luau',        'luau'],
      ['src/ServerScriptService/CheatDetection.luau',     'luau'],
      ['src/ServerScriptService/InputValidation.luau',    'luau'],
      ['src/ServerScriptService/RemoteThrottle.luau',     'luau'],
      ['src/ServerScriptService/AdminRoles.luau',         'luau'],
      ['src/ServerScriptService/IPBan.luau',              'luau'],
      ['src/ServerScriptService/SessionValidator.luau',   'luau'],
      ['src/ServerScriptService/EconomyGuard.luau',       'luau'],
      ['src/ServerScriptService/TeleportValidator.luau',  'luau'],
      ['src/ServerScriptService/ChatFilter.luau',         'luau'],
    ],
    6: [
      ['src/ReplicatedStorage/Modules/GameConfig.luau',  'luau'],
      ['src/ReplicatedStorage/Modules/Constants.luau',   'luau'],
      ['src/ReplicatedStorage/Modules/SharedState.luau', 'luau'],
      ['src/ReplicatedStorage/Modules/Events.luau',      'luau'],
      ['src/ReplicatedStorage/Modules/Remotes.luau',     'luau'],
      ['src/ReplicatedStorage/Modules/Types.luau',       'luau'],
      ['src/ReplicatedStorage/Modules/Config.luau',      'luau'],
      ['src/ReplicatedStorage/Modules/Enums.luau',       'luau'],
      ['src/ReplicatedStorage/Modules/Assets.luau',      'luau'],
      ['src/ReplicatedStorage/Modules/Globals.luau',     'luau'],
      ['src/ReplicatedStorage/Modules/ItemConfig.luau',  'luau'],
      ['src/ReplicatedStorage/Modules/ShopConfig.luau',  'luau'],
      ['src/ReplicatedStorage/Modules/QuestConfig.luau', 'luau'],
      ['src/ReplicatedStorage/Modules/PetConfig.luau',   'luau'],
      ['src/ReplicatedStorage/Modules/EnemyConfig.luau', 'luau'],
      ['src/ReplicatedStorage/Modules/SkillConfig.luau', 'luau'],
      ['src/ReplicatedStorage/Modules/MapConfig.luau',   'luau'],
      ['src/ReplicatedStorage/Modules/SoundConfig.luau', 'luau'],
      ['src/ReplicatedStorage/Modules/UIConfig.luau',    'luau'],
      ['src/ReplicatedStorage/Modules/GameModes.luau',   'luau'],
    ],
    7: [
      ['README.md',                          'md'],
      ['docs/SETUP.md',                      'md'],
      ['docs/ARCHITECTURE.md',               'md'],
      ['docs/REMOTES.md',                    'md'],
      ['docs/DATASTORE.md',                  'md'],
      ['docs/MODULES.md',                    'md'],
      ['docs/GAME_DESIGN.md',                'md'],
      ['docs/MONETIZATION.md',               'md'],
      ['.github/workflows/test.yml',         'yaml'],
      ['.github/workflows/lint.yml',         'yaml'],
      ['scripts/build.sh',                   'sh'],
      ['scripts/deploy.sh',                  'sh'],
      ['scripts/test.sh',                    'sh'],
      ['aftman.toml',                        'toml'],
      ['selene.toml',                        'toml'],
      ['stylua.toml',                        'toml'],
      ['wally.toml',                         'toml'],
      ['default.project.json',               'json'],
      ['rokit.toml',                         'toml'],
      ['Makefile',                           'makefile'],
    ],
    8: [
      ['default.project.json',       'json'],
      ['aftman.toml',                'toml'],
      ['wally.toml',                 'toml'],
      ['wally.lock',                 'toml'],
      ['selene.toml',                'toml'],
      ['stylua.toml',                'toml'],
      ['.darklua.json',              'json'],
      ['.gitignore',                 'text'],
      ['Makefile',                   'makefile'],
      ['.github/workflows/ci.yml',   'yaml'],
      ['rokit.toml',                 'toml'],
      ['.luarc.json',                'json'],
      ['lune.toml',                  'toml'],
      ['jest.config.luau',           'luau'],
      ['darklua.config.json',        'json'],
      ['rojo.project.json',          'json'],
      ['.editorconfig',              'text'],
      ['moonwave.toml',              'toml'],
      ['pesde.yaml',                 'yaml'],
      ['wally-package-types.d.luau', 'luau'],
    ],
    9: [
      ['src/ReplicatedStorage/Modules/TweenHelper.luau',  'luau'],
      ['src/ReplicatedStorage/Modules/Particles.luau',    'luau'],
      ['src/ReplicatedStorage/Modules/Trails.luau',       'luau'],
      ['src/ReplicatedStorage/Modules/Billboard.luau',    'luau'],
      ['src/ReplicatedStorage/Modules/Highlight.luau',    'luau'],
      ['src/StarterPlayerScripts/Effects.luau',           'luau'],
      ['src/StarterPlayerScripts/Animations.luau',        'luau'],
      ['src/StarterPlayerScripts/ScreenEffects.luau',     'luau'],
      ['src/StarterPlayerScripts/CameraShake.luau',       'luau'],
      ['src/StarterPlayerScripts/Ragdoll.luau',           'luau'],
      ['src/StarterPlayerScripts/VFXManager.luau',        'luau'],
      ['src/StarterPlayerScripts/SoundEffects.luau',      'luau'],
      ['src/StarterPlayerScripts/WeatherEffects.luau',    'luau'],
      ['src/StarterPlayerScripts/LightingManager.luau',   'luau'],
      ['src/StarterPlayerScripts/ExplosionEffect.luau',   'luau'],
      ['src/ReplicatedStorage/Modules/SpringUtils.luau',  'luau'],
      ['src/ReplicatedStorage/Modules/EasingFunctions.luau','luau'],
      ['src/StarterPlayerScripts/FootstepSounds.luau',    'luau'],
      ['src/StarterPlayerScripts/EnvironmentFX.luau',     'luau'],
      ['src/StarterPlayerScripts/UIAnimations.luau',      'luau'],
    ],
    10: [
      ['src/ServerScriptService/Logger.luau',            'luau'],
      ['src/ServerScriptService/Debugger.luau',          'luau'],
      ['src/ServerScriptService/Analytics.luau',         'luau'],
      ['src/ServerScriptService/Metrics.luau',           'luau'],
      ['src/ServerScriptService/Performance.luau',       'luau'],
      ['src/ServerScriptService/Monitor.luau',           'luau'],
      ['src/ServerScriptService/Dashboard.luau',         'luau'],
      ['src/ServerScriptService/ErrorTracker.luau',      'luau'],
      ['src/ServerScriptService/CrashReporter.luau',     'luau'],
      ['src/ServerScriptService/PlayerAnalytics.luau',   'luau'],
      ['src/ReplicatedStorage/Modules/ErrorHandler.luau','luau'],
      ['src/ReplicatedStorage/Modules/Reporter.luau',    'luau'],
      ['src/ReplicatedStorage/Modules/Benchmark.luau',   'luau'],
      ['src/ServerScriptService/SessionTracker.luau',    'luau'],
      ['src/ServerScriptService/EconomyTracker.luau',    'luau'],
      ['src/ServerScriptService/FunnelAnalytics.luau',   'luau'],
      ['src/ServerScriptService/RetentionTracker.luau',  'luau'],
      ['src/ServerScriptService/ABTesting.luau',         'luau'],
      ['src/ServerScriptService/RemoteLogger.luau',      'luau'],
      ['src/ServerScriptService/MemoryTracker.luau',     'luau'],
    ],
    11: [
      ['tests/ServerTests.luau',       'luau'],
      ['tests/ClientTests.luau',       'luau'],
      ['tests/DataStoreTests.luau',    'luau'],
      ['tests/RemoteTests.luau',       'luau'],
      ['tests/ModuleTests.luau',       'luau'],
      ['tests/UtilTests.luau',         'luau'],
      ['tests/AuthTests.luau',         'luau'],
      ['tests/GameLoopTests.luau',     'luau'],
      ['tests/UITests.luau',           'luau'],
      ['tests/TestRunner.luau',        'luau'],
      ['tests/EconomyTests.luau',      'luau'],
      ['tests/QuestTests.luau',        'luau'],
      ['tests/PetTests.luau',          'luau'],
      ['tests/CombatTests.luau',       'luau'],
      ['tests/InventoryTests.luau',    'luau'],
      ['tests/ShopTests.luau',         'luau'],
      ['tests/SecurityTests.luau',     'luau'],
      ['tests/PerformanceTests.luau',  'luau'],
      ['tests/NetworkTests.luau',      'luau'],
      ['tests/IntegrationTests.luau',  'luau'],
    ],
    12: [
      ['README.md',               'md'],
      ['docs/ARCHITECTURE.md',    'md'],
      ['docs/API.md',             'md'],
      ['docs/SETUP.md',           'md'],
      ['docs/REMOTES.md',         'md'],
      ['docs/DATASTORE.md',       'md'],
      ['docs/MODULES.md',         'md'],
      ['docs/EVENTS.md',          'md'],
      ['docs/GAME_DESIGN.md',     'md'],
      ['docs/MONETIZATION.md',    'md'],
      ['docs/ANALYTICS.md',       'md'],
      ['docs/SECURITY.md',        'md'],
      ['docs/PERFORMANCE.md',     'md'],
      ['docs/TESTING.md',         'md'],
      ['CONTRIBUTING.md',         'md'],
      ['CHANGELOG.md',            'md'],
      ['docs/ROADMAP.md',         'md'],
      ['docs/FAQ.md',             'md'],
      ['docs/COMBAT.md',          'md'],
      ['docs/ECONOMY.md',         'md'],
    ],
    13: [
      ['src/ReplicatedStorage/Modules/Cache.luau',           'luau'],
      ['src/ReplicatedStorage/Modules/Pool.luau',            'luau'],
      ['src/ReplicatedStorage/Modules/LazyLoader.luau',      'luau'],
      ['src/ReplicatedStorage/Modules/Throttle.luau',        'luau'],
      ['src/ReplicatedStorage/Modules/Memoize.luau',         'luau'],
      ['src/ServerScriptService/MemoryOptimizer.luau',       'luau'],
      ['src/ServerScriptService/GarbageCollector.luau',      'luau'],
      ['src/ServerScriptService/BatchProcessor.luau',        'luau'],
      ['src/ServerScriptService/StreamingOptimizer.luau',    'luau'],
      ['src/ServerScriptService/LODSystem.luau',             'luau'],
      ['src/ServerScriptService/InstancePool.luau',          'luau'],
      ['src/ServerScriptService/PhysicsOptimizer.luau',      'luau'],
      ['src/ServerScriptService/NetworkOptimizer.luau',      'luau'],
      ['src/ReplicatedStorage/Modules/Deferred.luau',        'luau'],
      ['src/ReplicatedStorage/Modules/Signal.luau',          'luau'],
      ['src/ReplicatedStorage/Modules/Promise.luau',         'luau'],
      ['src/ServerScriptService/ChunkLoader.luau',           'luau'],
      ['src/ServerScriptService/AssetStreamer.luau',          'luau'],
      ['src/ReplicatedStorage/Modules/ObjectPool.luau',      'luau'],
      ['src/ServerScriptService/RenderBudget.luau',          'luau'],
    ],
    14: [
      ['src/ReplicatedStorage/Modules/RemoteDefinitions.luau','luau'],
      ['src/ReplicatedStorage/Modules/NetworkManager.luau',  'luau'],
      ['src/ReplicatedStorage/Modules/Middleware.luau',      'luau'],
      ['src/ReplicatedStorage/Modules/Schema.luau',          'luau'],
      ['src/ReplicatedStorage/Modules/Validator.luau',       'luau'],
      ['src/ReplicatedStorage/Modules/Protocol.luau',        'luau'],
      ['src/ReplicatedStorage/Modules/Serializer.luau',      'luau'],
      ['src/ServerScriptService/RemoteRouter.luau',          'luau'],
      ['src/ServerScriptService/APIGateway.luau',            'luau'],
      ['src/ServerScriptService/RequestHandler.luau',        'luau'],
      ['src/ServerScriptService/ResponseBuilder.luau',       'luau'],
      ['src/ServerScriptService/EventBus.luau',              'luau'],
      ['src/ReplicatedStorage/Modules/TypeChecker.luau',     'luau'],
      ['src/ReplicatedStorage/Modules/DataEncoder.luau',     'luau'],
      ['src/ServerScriptService/RemoteRateLimit.luau',       'luau'],
      ['src/ReplicatedStorage/Modules/PacketCompressor.luau','luau'],
      ['src/ServerScriptService/BandwidthManager.luau',      'luau'],
      ['src/ReplicatedStorage/Modules/StateSync.luau',       'luau'],
      ['src/ServerScriptService/ReplicationManager.luau',    'luau'],
      ['src/ReplicatedStorage/Modules/RPCSystem.luau',       'luau'],
    ],
    15: [
      ['docs/GAME_OVERVIEW.md',                        'md'],
      ['docs/MONETIZATION.md',                         'md'],
      ['docs/ANALYTICS.md',                            'md'],
      ['docs/MARKETING.md',                            'md'],
      ['docs/SEO.md',                                  'md'],
      ['docs/PLAYER_ACQUISITION.md',                   'md'],
      ['docs/RETENTION_STRATEGY.md',                   'md'],
      ['docs/ECONOMY_DESIGN.md',                       'md'],
      ['src/ServerScriptService/Analytics.luau',       'luau'],
      ['src/ServerScriptService/Monetization.luau',    'luau'],
      ['src/ServerScriptService/Telemetry.luau',       'luau'],
      ['src/ServerScriptService/ABTest.luau',          'luau'],
      ['src/ServerScriptService/UserResearch.luau',    'luau'],
      ['src/ServerScriptService/FunnelTracker.luau',   'luau'],
      ['src/ServerScriptService/RetentionSystem.luau', 'luau'],
      ['src/ServerScriptService/RewardSystem.luau',    'luau'],
      ['src/ServerScriptService/DailyRewards.luau',    'luau'],
      ['src/ServerScriptService/SeasonalEvent.luau',   'luau'],
      ['src/ServerScriptService/LiveOps.luau',         'luau'],
      ['src/ServerScriptService/PushNotify.luau',      'luau'],
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// File pools — Next.js (default)
// ─────────────────────────────────────────────────────────────────────────────

function getFilePools_NextJS(): Record<number, FileDef[]> {
  return {
    1: [
      ['src/components/ui/Button.tsx',         'tsx'],
      ['src/components/ui/Card.tsx',           'tsx'],
      ['src/components/ui/Modal.tsx',          'tsx'],
      ['src/components/ui/Input.tsx',          'tsx'],
      ['src/components/ui/Badge.tsx',          'tsx'],
      ['src/components/ui/Tooltip.tsx',        'tsx'],
      ['src/components/ui/Spinner.tsx',        'tsx'],
      ['src/components/ui/Avatar.tsx',         'tsx'],
      ['src/components/ui/Dropdown.tsx',       'tsx'],
      ['src/components/ui/Table.tsx',          'tsx'],
      ['src/components/ui/Tabs.tsx',           'tsx'],
      ['src/components/ui/Accordion.tsx',      'tsx'],
      ['src/components/ui/Checkbox.tsx',       'tsx'],
      ['src/components/ui/Radio.tsx',          'tsx'],
      ['src/components/ui/Switch.tsx',         'tsx'],
      ['src/components/ui/Select.tsx',         'tsx'],
      ['src/components/ui/Slider.tsx',         'tsx'],
      ['src/components/ui/Progress.tsx',       'tsx'],
      ['src/components/ui/Alert.tsx',          'tsx'],
      ['src/components/ui/Toast.tsx',          'tsx'],
      ['src/styles/globals.css',               'css'],
      ['src/styles/animations.css',            'css'],
      ['src/styles/tokens.css',                'css'],
      ['src/styles/typography.css',            'css'],
      ['src/styles/components.css',            'css'],
    ],
    2: [
      ['src/components/layout/Header.tsx',      'tsx'],
      ['src/components/layout/Footer.tsx',      'tsx'],
      ['src/components/layout/Sidebar.tsx',     'tsx'],
      ['src/components/layout/NavBar.tsx',      'tsx'],
      ['src/components/layout/PageWrapper.tsx', 'tsx'],
      ['src/components/layout/Container.tsx',   'tsx'],
      ['src/components/layout/MobileMenu.tsx',  'tsx'],
      ['src/components/layout/Breadcrumbs.tsx', 'tsx'],
      ['src/hooks/useDebounce.ts',              'ts'],
      ['src/hooks/useLocalStorage.ts',          'ts'],
      ['src/hooks/useMediaQuery.ts',            'ts'],
      ['src/hooks/useClickOutside.ts',          'ts'],
      ['src/hooks/useScrollPosition.ts',        'ts'],
      ['src/hooks/useWindowSize.ts',            'ts'],
      ['src/hooks/useKeyPress.ts',              'ts'],
      ['src/hooks/useInterval.ts',              'ts'],
      ['src/hooks/useTimeout.ts',               'ts'],
      ['src/hooks/useToggle.ts',                'ts'],
      ['src/hooks/useCounter.ts',               'ts'],
      ['src/hooks/usePrevious.ts',              'ts'],
      ['src/components/pages/Home.tsx',         'tsx'],
      ['src/components/pages/About.tsx',        'tsx'],
      ['src/components/pages/Contact.tsx',      'tsx'],
      ['src/components/pages/Settings.tsx',     'tsx'],
      ['src/components/pages/Dashboard.tsx',    'tsx'],
    ],
    3: [
      ['src/app/api/chat/route.ts',         'ts'],
      ['src/app/api/models/route.ts',       'ts'],
      ['src/app/api/auth/route.ts',         'ts'],
      ['src/app/api/users/route.ts',        'ts'],
      ['src/app/api/items/route.ts',        'ts'],
      ['src/app/api/health/route.ts',       'ts'],
      ['src/app/api/upload/route.ts',       'ts'],
      ['src/app/api/search/route.ts',       'ts'],
      ['src/app/api/download/route.ts',     'ts'],
      ['src/app/api/webhooks/route.ts',     'ts'],
      ['src/app/api/analytics/route.ts',    'ts'],
      ['src/app/api/notifications/route.ts','ts'],
      ['src/app/api/settings/route.ts',     'ts'],
      ['src/app/api/export/route.ts',       'ts'],
      ['src/middleware.ts',                 'ts'],
      ['src/lib/api/client.ts',             'ts'],
      ['src/lib/api/fetcher.ts',            'ts'],
      ['src/lib/api/endpoints.ts',          'ts'],
      ['src/lib/api/interceptors.ts',       'ts'],
      ['src/lib/api/errorHandler.ts',       'ts'],
      ['src/lib/models/openrouter.ts',      'ts'],
      ['src/lib/models/registry.ts',        'ts'],
      ['src/lib/websocket/client.ts',       'ts'],
      ['src/lib/websocket/handlers.ts',     'ts'],
      ['src/lib/sse/stream.ts',             'ts'],
    ],
    4: [
      ['prisma/schema.prisma',                      'prisma'],
      ['prisma/seed.ts',                            'ts'],
      ['src/db/migrations/001_init.sql',            'sql'],
      ['src/db/migrations/002_users.sql',           'sql'],
      ['src/db/migrations/003_sessions.sql',        'sql'],
      ['src/db/migrations/004_files.sql',           'sql'],
      ['src/db/migrations/005_audit.sql',           'sql'],
      ['src/db/queries/users.ts',                   'ts'],
      ['src/db/queries/items.ts',                   'ts'],
      ['src/db/queries/sessions.ts',                'ts'],
      ['src/db/queries/analytics.ts',               'ts'],
      ['src/lib/db.ts',                             'ts'],
      ['src/lib/dbClient.ts',                       'ts'],
      ['src/lib/dbPool.ts',                         'ts'],
      ['src/lib/dbHelpers.ts',                      'ts'],
      ['src/lib/dbTypes.ts',                        'ts'],
      ['src/lib/dbTransactions.ts',                 'ts'],
      ['src/db/repositories/UserRepository.ts',     'ts'],
      ['src/db/repositories/ProjectRepository.ts',  'ts'],
      ['src/db/repositories/FileRepository.ts',     'ts'],
    ],
    5: [
      ['src/lib/auth.ts',                    'ts'],
      ['src/lib/jwt.ts',                     'ts'],
      ['src/lib/rateLimit.ts',               'ts'],
      ['src/lib/oauth.ts',                   'ts'],
      ['src/lib/session.ts',                 'ts'],
      ['src/lib/encryption.ts',              'ts'],
      ['src/lib/csrf.ts',                    'ts'],
      ['src/lib/permissions.ts',             'ts'],
      ['src/lib/roles.ts',                   'ts'],
      ['src/lib/passwordHash.ts',            'ts'],
      ['src/middleware/withAuth.ts',         'ts'],
      ['src/middleware/withRateLimit.ts',    'ts'],
      ['src/middleware/withCors.ts',         'ts'],
      ['src/middleware/withValidation.ts',   'ts'],
      ['src/middleware/withLogging.ts',      'ts'],
      ['src/hooks/useAuth.ts',               'ts'],
      ['src/hooks/usePermissions.ts',        'ts'],
      ['src/hooks/useSession.ts',            'ts'],
      ['src/components/auth/LoginForm.tsx',  'tsx'],
      ['src/components/auth/RegisterForm.tsx','tsx'],
      ['src/components/auth/AuthGuard.tsx',  'tsx'],
      ['src/components/auth/OAuthButtons.tsx','tsx'],
      ['src/components/auth/TwoFactor.tsx',  'tsx'],
      ['src/components/auth/ForgotPassword.tsx','tsx'],
      ['src/components/auth/ResetPassword.tsx','tsx'],
    ],
    6: [
      ['src/store/appStore.ts',              'ts'],
      ['src/store/modelStore.ts',            'ts'],
      ['src/store/authStore.ts',             'ts'],
      ['src/store/uiStore.ts',               'ts'],
      ['src/store/userStore.ts',             'ts'],
      ['src/store/projectStore.ts',          'ts'],
      ['src/store/fileStore.ts',             'ts'],
      ['src/store/settingsStore.ts',         'ts'],
      ['src/store/notificationStore.ts',     'ts'],
      ['src/store/chatStore.ts',             'ts'],
      ['src/selectors/index.ts',             'ts'],
      ['src/selectors/authSelectors.ts',     'ts'],
      ['src/selectors/projectSelectors.ts',  'ts'],
      ['src/selectors/fileSelectors.ts',     'ts'],
      ['src/selectors/uiSelectors.ts',       'ts'],
      ['src/store/slices/generationSlice.ts','ts'],
      ['src/store/slices/agentSlice.ts',     'ts'],
      ['src/store/slices/editorSlice.ts',    'ts'],
      ['src/store/actions/generationActions.ts','ts'],
      ['src/store/actions/agentActions.ts',  'ts'],
      ['src/store/initialState.ts',          'ts'],
      ['src/store/rootReducer.ts',           'ts'],
      ['src/store/storeTypes.ts',            'ts'],
      ['src/store/middleware/logger.ts',     'ts'],
      ['src/store/middleware/persist.ts',    'ts'],
    ],
    7: [
      ['.github/workflows/deploy.yml',       'yaml'],
      ['.github/workflows/ci.yml',           'yaml'],
      ['.github/workflows/lint.yml',         'yaml'],
      ['.github/workflows/test.yml',         'yaml'],
      ['.github/workflows/release.yml',      'yaml'],
      ['.github/workflows/security.yml',     'yaml'],
      ['Dockerfile',                         'dockerfile'],
      ['Dockerfile.prod',                    'dockerfile'],
      ['docker-compose.yml',                 'yaml'],
      ['docker-compose.prod.yml',            'yaml'],
      ['.dockerignore',                      'text'],
      ['render.yaml',                        'yaml'],
      ['scripts/deploy.sh',                  'sh'],
      ['scripts/setup.sh',                   'sh'],
      ['scripts/migrate.sh',                 'sh'],
      ['scripts/health-check.sh',            'sh'],
      ['nginx.conf',                         'nginx'],
      ['k8s/deployment.yaml',                'yaml'],
      ['k8s/service.yaml',                   'yaml'],
      ['k8s/ingress.yaml',                   'yaml'],
      ['k8s/configmap.yaml',                 'yaml'],
      ['k8s/hpa.yaml',                       'yaml'],
      ['terraform/main.tf',                  'tf'],
      ['terraform/variables.tf',             'tf'],
      ['terraform/outputs.tf',               'tf'],
    ],
    8: [
      ['next.config.ts',           'ts'],
      ['tailwind.config.ts',       'ts'],
      ['tsconfig.json',            'json'],
      ['.eslintrc.js',             'js'],
      ['.prettierrc',              'json'],
      ['vitest.config.ts',         'ts'],
      ['jest.config.ts',           'ts'],
      ['postcss.config.js',        'js'],
      ['package.json',             'json'],
      ['.gitignore',               'text'],
      ['.env.example',             'text'],
      ['.editorconfig',            'text'],
      ['turbo.json',               'json'],
      ['.pre-commit-config.yaml',  'yaml'],
      ['codecov.yml',              'yaml'],
      ['sonar-project.properties', 'text'],
      ['src/types/index.ts',       'ts'],
      ['src/types/api.ts',         'ts'],
      ['src/types/models.ts',      'ts'],
      ['src/types/store.ts',       'ts'],
      ['src/types/agents.ts',      'ts'],
      ['src/types/files.ts',       'ts'],
      ['src/types/auth.ts',        'ts'],
      ['src/types/events.ts',      'ts'],
      ['src/types/components.ts',  'ts'],
    ],
    9: [
      ['src/components/canvas/AgentCanvas.tsx',    'tsx'],
      ['src/components/canvas/ParticleSystem.tsx', 'tsx'],
      ['src/components/canvas/NetworkGraph.tsx',   'tsx'],
      ['src/components/canvas/GlowEffect.tsx',     'tsx'],
      ['src/components/canvas/WaveAnimation.tsx',  'tsx'],
      ['src/components/canvas/MatrixRain.tsx',     'tsx'],
      ['src/components/video/VideoBackground.tsx', 'tsx'],
      ['src/components/video/VideoOverlay.tsx',    'tsx'],
      ['src/components/animations/FadeIn.tsx',     'tsx'],
      ['src/components/animations/SlideIn.tsx',    'tsx'],
      ['src/components/animations/ScaleIn.tsx',    'tsx'],
      ['src/components/animations/Stagger.tsx',    'tsx'],
      ['src/components/animations/Typewriter.tsx', 'tsx'],
      ['src/lib/animations.ts',                    'ts'],
      ['src/lib/particles.ts',                     'ts'],
      ['src/lib/easing.ts',                        'ts'],
      ['src/lib/springs.ts',                       'ts'],
      ['src/lib/motionVariants.ts',                'ts'],
      ['src/lib/gsapConfig.ts',                    'ts'],
      ['src/lib/webgl.ts',                         'ts'],
      ['src/lib/shaders.ts',                       'ts'],
      ['src/lib/tweening.ts',                      'ts'],
      ['src/hooks/useCanvas.ts',                   'ts'],
      ['src/hooks/useAnimation.ts',                'ts'],
      ['src/hooks/useRaf.ts',                      'ts'],
    ],
    10: [
      ['src/components/agents/AgentCard.tsx',          'tsx'],
      ['src/components/agents/AgentGrid.tsx',          'tsx'],
      ['src/components/agents/AgentStatus.tsx',        'tsx'],
      ['src/components/agents/AgentLog.tsx',           'tsx'],
      ['src/components/agents/AgentMetrics.tsx',       'tsx'],
      ['src/components/dashboard/MainDashboard.tsx',   'tsx'],
      ['src/components/dashboard/StatsPanel.tsx',      'tsx'],
      ['src/components/dashboard/ActivityFeed.tsx',    'tsx'],
      ['src/components/dashboard/LogViewer.tsx',       'tsx'],
      ['src/components/dashboard/Timeline.tsx',        'tsx'],
      ['src/components/dashboard/ProgressBar.tsx',     'tsx'],
      ['src/components/dashboard/FileCounter.tsx',     'tsx'],
      ['src/components/dashboard/ModelSelector.tsx',   'tsx'],
      ['src/components/dashboard/TokenUsage.tsx',      'tsx'],
      ['src/components/lines/ConnectionLines.tsx',     'tsx'],
      ['src/components/lines/DataFlow.tsx',            'tsx'],
      ['src/lib/utils/debug.ts',                       'ts'],
      ['src/lib/utils/logger.ts',                      'ts'],
      ['src/lib/utils/helpers.ts',                     'ts'],
      ['src/lib/utils/formatter.ts',                   'ts'],
      ['src/lib/utils/profiler.ts',                    'ts'],
      ['src/lib/utils/constants.ts',                   'ts'],
      ['src/lib/utils/errorReporter.ts',               'ts'],
      ['src/lib/utils/telemetry.ts',                   'ts'],
      ['src/lib/utils/analytics.ts',                   'ts'],
    ],
    11: [
      ['tests/api/chat.test.ts',              'ts'],
      ['tests/api/models.test.ts',            'ts'],
      ['tests/api/auth.test.ts',              'ts'],
      ['tests/api/users.test.ts',             'ts'],
      ['tests/api/download.test.ts',          'ts'],
      ['tests/components/Button.test.tsx',    'tsx'],
      ['tests/components/Modal.test.tsx',     'tsx'],
      ['tests/components/Header.test.tsx',    'tsx'],
      ['tests/components/AgentCard.test.tsx', 'tsx'],
      ['tests/hooks/useDebounce.test.ts',     'ts'],
      ['tests/hooks/useAuth.test.ts',         'ts'],
      ['tests/hooks/useLocalStorage.test.ts', 'ts'],
      ['tests/store/appStore.test.ts',        'ts'],
      ['tests/store/modelStore.test.ts',      'ts'],
      ['tests/store/authStore.test.ts',       'ts'],
      ['tests/lib/jwt.test.ts',               'ts'],
      ['tests/lib/rateLimit.test.ts',         'ts'],
      ['tests/lib/validators.test.ts',        'ts'],
      ['tests/setup.ts',                      'ts'],
      ['tests/mocks/handlers.ts',             'ts'],
      ['tests/mocks/server.ts',               'ts'],
      ['cypress/e2e/auth.cy.ts',              'ts'],
      ['cypress/e2e/dashboard.cy.ts',         'ts'],
      ['cypress/e2e/generation.cy.ts',        'ts'],
      ['cypress/support/commands.ts',         'ts'],
    ],
    12: [
      ['README.md',                'md'],
      ['docs/API.md',              'md'],
      ['docs/DEPLOY.md',           'md'],
      ['docs/ARCHITECTURE.md',     'md'],
      ['docs/AUTHENTICATION.md',   'md'],
      ['docs/DATABASE.md',         'md'],
      ['docs/TESTING.md',          'md'],
      ['docs/CONFIGURATION.md',    'md'],
      ['docs/PERFORMANCE.md',      'md'],
      ['docs/SECURITY.md',         'md'],
      ['docs/AGENTS.md',           'md'],
      ['docs/MODELS.md',           'md'],
      ['docs/WEBSOCKETS.md',       'md'],
      ['docs/WEBHOOKS.md',         'md'],
      ['docs/RATE_LIMITS.md',      'md'],
      ['CONTRIBUTING.md',          'md'],
      ['CHANGELOG.md',             'md'],
      ['SECURITY.md',              'md'],
      ['CODE_OF_CONDUCT.md',       'md'],
      ['docs/ROADMAP.md',          'md'],
      ['docs/FAQ.md',              'md'],
      ['docs/SELF_HOSTING.md',     'md'],
      ['docs/CUSTOMIZATION.md',    'md'],
      ['docs/INTEGRATIONS.md',     'md'],
      ['docs/GLOSSARY.md',         'md'],
    ],
    13: [
      ['src/components/preview/PreviewCanvas.tsx', 'tsx'],
      ['src/components/preview/CodeEditor.tsx',    'tsx'],
      ['src/components/preview/FileTree.tsx',      'tsx'],
      ['src/components/preview/FileDiff.tsx',      'tsx'],
      ['src/components/preview/SplitPane.tsx',     'tsx'],
      ['src/components/preview/TabBar.tsx',        'tsx'],
      ['src/components/preview/MiniMap.tsx',       'tsx'],
      ['src/components/preview/SearchBar.tsx',     'tsx'],
      ['src/components/preview/LineNumbers.tsx',   'tsx'],
      ['src/components/preview/StatusBar.tsx',     'tsx'],
      ['src/components/preview/ErrorPanel.tsx',    'tsx'],
      ['src/lib/performance.ts',                   'ts'],
      ['src/lib/codeHighlight.ts',                 'ts'],
      ['src/lib/codeParse.ts',                     'ts'],
      ['src/lib/codeFormat.ts',                    'ts'],
      ['src/lib/codeAnalyze.ts',                   'ts'],
      ['src/lib/virtualScroller.ts',               'ts'],
      ['src/lib/workers/formatWorker.ts',          'ts'],
      ['src/lib/workers/highlightWorker.ts',       'ts'],
      ['src/lib/workers/parseWorker.ts',           'ts'],
      ['src/hooks/useVirtual.ts',                  'ts'],
      ['src/hooks/useCodeEditor.ts',               'ts'],
      ['src/hooks/useFileTree.ts',                 'ts'],
      ['src/hooks/useSearch.ts',                   'ts'],
      ['src/hooks/useSplitPane.ts',                'ts'],
    ],
    14: [
      ['openapi.yaml',                    'yaml'],
      ['openapi.json',                    'json'],
      ['asyncapi.yaml',                   'yaml'],
      ['graphql/schema.graphql',          'graphql'],
      ['graphql/resolvers.ts',            'ts'],
      ['graphql/typeDefs.ts',             'ts'],
      ['graphql/context.ts',              'ts'],
      ['src/lib/validators.ts',           'ts'],
      ['src/lib/schema.ts',               'ts'],
      ['src/lib/sanitize.ts',             'ts'],
      ['src/lib/typeGuards.ts',           'ts'],
      ['src/lib/coerce.ts',               'ts'],
      ['src/lib/serialize.ts',            'ts'],
      ['src/lib/zod/userSchema.ts',       'ts'],
      ['src/lib/zod/authSchema.ts',       'ts'],
      ['src/lib/zod/apiSchema.ts',        'ts'],
      ['src/lib/zod/chatSchema.ts',       'ts'],
      ['src/lib/zod/fileSchema.ts',       'ts'],
      ['src/lib/zod/modelSchema.ts',      'ts'],
      ['src/lib/zod/agentSchema.ts',      'ts'],
      ['src/lib/transformers/user.ts',    'ts'],
      ['src/lib/transformers/response.ts','ts'],
      ['src/lib/transformers/error.ts',   'ts'],
      ['src/lib/assertions.ts',           'ts'],
      ['proto/service.proto',             'proto'],
    ],
    15: [
      ['src/app/sitemap.ts',           'ts'],
      ['src/app/robots.ts',            'ts'],
      ['src/app/manifest.ts',          'ts'],
      ['src/app/layout.tsx',           'tsx'],
      ['src/app/global-error.tsx',     'tsx'],
      ['src/app/not-found.tsx',        'tsx'],
      ['src/app/loading.tsx',          'tsx'],
      ['src/app/error.tsx',            'tsx'],
      ['src/app/opengraph-image.tsx',  'tsx'],
      ['src/lib/seo.ts',               'ts'],
      ['src/lib/analytics.ts',         'ts'],
      ['src/lib/structuredData.ts',    'ts'],
      ['src/lib/ogImage.ts',           'ts'],
      ['src/lib/webVitals.ts',         'ts'],
      ['src/lib/i18n.ts',              'ts'],
      ['src/lib/locale.ts',            'ts'],
      ['src/lib/gtm.ts',               'ts'],
      ['src/lib/hotjar.ts',            'ts'],
      ['src/lib/mixpanel.ts',          'ts'],
      ['src/lib/lighthouse.ts',        'ts'],
      ['src/lib/a11y.ts',              'ts'],
      ['src/lib/fontLoader.ts',        'ts'],
      ['src/lib/imageOptimizer.ts',    'ts'],
      ['src/lib/prefetch.ts',          'ts'],
      ['src/lib/webVitals.ts',         'ts'],
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DevOps pool
// ─────────────────────────────────────────────────────────────────────────────

function getFilePools_DevOps(): Record<number, FileDef[]> {
  return {
    1: [
      ['nginx/nginx.conf',             'nginx'],
      ['nginx/sites/app.conf',         'nginx'],
      ['nginx/ssl.conf',               'nginx'],
      ['nginx/security.conf',          'nginx'],
      ['nginx/gzip.conf',              'nginx'],
      ['nginx/proxy.conf',             'nginx'],
      ['nginx/cache.conf',             'nginx'],
      ['nginx/rate-limit.conf',        'nginx'],
      ['traefik/traefik.yml',          'yaml'],
      ['traefik/dynamic.yml',          'yaml'],
      ['traefik/middleware.yml',       'yaml'],
      ['haproxy/haproxy.cfg',          'text'],
      ['caddy/Caddyfile',              'text'],
      ['caddy/sites/app.caddy',        'text'],
      ['envoy/envoy.yaml',             'yaml'],
      ['istio/virtual-service.yaml',   'yaml'],
      ['istio/destination-rule.yaml',  'yaml'],
      ['linkerd/service-profile.yaml', 'yaml'],
      ['consul/config.json',           'json'],
      ['vault/config.hcl',             'text'],
    ],
    2: [
      ['scripts/setup.sh',            'sh'],
      ['scripts/install.sh',          'sh'],
      ['scripts/configure.sh',        'sh'],
      ['scripts/update.sh',           'sh'],
      ['scripts/backup.sh',           'sh'],
      ['scripts/restore.sh',          'sh'],
      ['scripts/health-check.sh',     'sh'],
      ['scripts/rotate-secrets.sh',   'sh'],
      ['scripts/cleanup.sh',          'sh'],
      ['scripts/init.sh',             'sh'],
      ['scripts/migrate.sh',          'sh'],
      ['scripts/seed.sh',             'sh'],
      ['scripts/rollback.sh',         'sh'],
      ['scripts/scale.sh',            'sh'],
      ['scripts/cert-renew.sh',       'sh'],
      ['scripts/db-backup.sh',        'sh'],
      ['scripts/log-rotate.sh',       'sh'],
      ['scripts/notify.sh',           'sh'],
      ['scripts/encrypt.sh',          'sh'],
      ['scripts/provision.sh',        'sh'],
    ],
    3: [
      ['.github/workflows/deploy.yml',     'yaml'],
      ['.github/workflows/ci.yml',         'yaml'],
      ['.github/workflows/test.yml',       'yaml'],
      ['.github/workflows/release.yml',    'yaml'],
      ['.github/workflows/security.yml',   'yaml'],
      ['.github/workflows/lint.yml',       'yaml'],
      ['.github/workflows/staging.yml',    'yaml'],
      ['.github/workflows/rollback.yml',   'yaml'],
      ['.github/workflows/notify.yml',     'yaml'],
      ['.github/workflows/cleanup.yml',    'yaml'],
      ['.github/workflows/dependency.yml', 'yaml'],
      ['.github/workflows/codeql.yml',     'yaml'],
      ['.github/workflows/performance.yml','yaml'],
      ['gitlab-ci.yml',                    'yaml'],
      ['Jenkinsfile',                      'text'],
      ['circleci/config.yml',              'yaml'],
      ['bitbucket-pipelines.yml',          'yaml'],
      ['azure-pipelines.yml',              'yaml'],
      ['buildkite/pipeline.yml',           'yaml'],
      ['drone.yml',                        'yaml'],
    ],
    4: [
      ['docker-compose.yml',           'yaml'],
      ['docker-compose.prod.yml',      'yaml'],
      ['docker-compose.dev.yml',       'yaml'],
      ['docker-compose.test.yml',      'yaml'],
      ['docker-compose.monitoring.yml','yaml'],
      ['docker-compose.db.yml',        'yaml'],
      ['Dockerfile',                   'dockerfile'],
      ['Dockerfile.prod',              'dockerfile'],
      ['Dockerfile.dev',               'dockerfile'],
      ['Dockerfile.test',              'dockerfile'],
      ['.dockerignore',                'text'],
      ['docker/entrypoint.sh',         'sh'],
      ['docker/healthcheck.sh',        'sh'],
      ['docker/init-db.sh',            'sh'],
      ['docker/wait-for-it.sh',        'sh'],
      ['podman-compose.yml',           'yaml'],
      ['compose.override.yml',         'yaml'],
      ['docker/secrets/README.md',     'md'],
      ['docker/configs/app.conf',      'text'],
      ['docker/volumes/README.md',     'md'],
    ],
    5: [
      ['terraform/main.tf',                  'tf'],
      ['terraform/variables.tf',             'tf'],
      ['terraform/outputs.tf',               'tf'],
      ['terraform/provider.tf',              'tf'],
      ['terraform/backend.tf',               'tf'],
      ['terraform/data.tf',                  'tf'],
      ['terraform/modules/vpc/main.tf',      'tf'],
      ['terraform/modules/eks/main.tf',      'tf'],
      ['terraform/modules/rds/main.tf',      'tf'],
      ['terraform/modules/s3/main.tf',       'tf'],
      ['terraform/modules/iam/main.tf',      'tf'],
      ['terraform/modules/cdn/main.tf',      'tf'],
      ['terraform/modules/dns/main.tf',      'tf'],
      ['terraform/modules/lb/main.tf',       'tf'],
      ['terraform/modules/monitoring/main.tf','tf'],
      ['pulumi/__main__.py',                 'python'],
      ['pulumi/Pulumi.yaml',                 'yaml'],
      ['cdk/lib/stack.ts',                   'ts'],
      ['cdk/bin/app.ts',                     'ts'],
      ['crossplane/composition.yaml',        'yaml'],
    ],
    6: [
      ['k8s/namespace.yaml',           'yaml'],
      ['k8s/deployment.yaml',          'yaml'],
      ['k8s/service.yaml',             'yaml'],
      ['k8s/ingress.yaml',             'yaml'],
      ['k8s/configmap.yaml',           'yaml'],
      ['k8s/secret.yaml',              'yaml'],
      ['k8s/hpa.yaml',                 'yaml'],
      ['k8s/pdb.yaml',                 'yaml'],
      ['k8s/networkpolicy.yaml',       'yaml'],
      ['k8s/serviceaccount.yaml',      'yaml'],
      ['k8s/persistentvolume.yaml',    'yaml'],
      ['k8s/cronjob.yaml',             'yaml'],
      ['k8s/job.yaml',                 'yaml'],
      ['k8s/daemonset.yaml',           'yaml'],
      ['k8s/statefulset.yaml',         'yaml'],
      ['helm/Chart.yaml',              'yaml'],
      ['helm/values.yaml',             'yaml'],
      ['helm/values-prod.yaml',        'yaml'],
      ['helm/templates/deployment.yaml','yaml'],
      ['helm/templates/service.yaml',  'yaml'],
    ],
    7: [
      ['ansible/playbook.yml',                           'yaml'],
      ['ansible/inventory/hosts.yml',                    'yaml'],
      ['ansible/group_vars/all.yml',                     'yaml'],
      ['ansible/host_vars/prod.yml',                     'yaml'],
      ['ansible/roles/app/tasks/main.yml',               'yaml'],
      ['ansible/roles/nginx/tasks/main.yml',             'yaml'],
      ['ansible/roles/db/tasks/main.yml',                'yaml'],
      ['ansible/roles/monitoring/tasks/main.yml',        'yaml'],
      ['ansible/roles/security/tasks/main.yml',          'yaml'],
      ['ansible/roles/app/handlers/main.yml',            'yaml'],
      ['ansible/roles/app/templates/app.conf.j2',        'text'],
      ['ansible/roles/app/vars/main.yml',                'yaml'],
      ['ansible/roles/db/vars/main.yml',                 'yaml'],
      ['ansible/roles/docker/tasks/main.yml',            'yaml'],
      ['ansible/roles/certbot/tasks/main.yml',           'yaml'],
      ['ansible/roles/firewall/tasks/main.yml',          'yaml'],
      ['ansible/roles/backup/tasks/main.yml',            'yaml'],
      ['ansible/roles/monitoring/templates/prometheus.j2','text'],
      ['ansible/collections/requirements.yml',           'yaml'],
      ['ansible/requirements.txt',                       'text'],
    ],
    8: [
      ['render.yaml',                  'yaml'],
      ['fly.toml',                     'toml'],
      ['railway.json',                 'json'],
      ['vercel.json',                  'json'],
      ['.env.example',                 'text'],
      ['.gitignore',                   'text'],
      ['Makefile',                     'makefile'],
      ['Taskfile.yml',                 'yaml'],
      ['.pre-commit-config.yaml',      'yaml'],
      ['sonar-project.properties',     'text'],
      ['codecov.yml',                  'yaml'],
      ['.editorconfig',                'text'],
      ['renovate.json',                'json'],
      ['dependabot.yml',               'yaml'],
      ['.github/CODEOWNERS',           'text'],
      ['.github/pull_request_template.md','md'],
      ['CHANGELOG.md',                 'md'],
      ['README.md',                    'md'],
      ['LICENSE',                      'text'],
      ['SECURITY.md',                  'md'],
    ],
    9: [
      ['prometheus/prometheus.yml',               'yaml'],
      ['prometheus/rules/alerts.yml',             'yaml'],
      ['prometheus/rules/recording.yml',          'yaml'],
      ['prometheus/rules/slo.yml',                'yaml'],
      ['grafana/dashboards/app.json',             'json'],
      ['grafana/dashboards/infra.json',           'json'],
      ['grafana/dashboards/db.json',              'json'],
      ['grafana/dashboards/k8s.json',             'json'],
      ['grafana/provisioning/datasources.yml',    'yaml'],
      ['grafana/provisioning/dashboards.yml',     'yaml'],
      ['alertmanager/alertmanager.yml',           'yaml'],
      ['alertmanager/templates/email.tmpl',       'text'],
      ['alertmanager/templates/slack.tmpl',       'text'],
      ['loki/loki.yaml',                          'yaml'],
      ['tempo/tempo.yaml',                        'yaml'],
      ['otel/otel-collector.yaml',                'yaml'],
      ['jaeger/jaeger.yml',                       'yaml'],
      ['vector/vector.toml',                      'toml'],
      ['fluentd/fluent.conf',                     'text'],
      ['elastic/logstash.conf',                   'text'],
    ],
    10: [
      ['scripts/monitor.sh',       'sh'],
      ['scripts/alert.sh',         'sh'],
      ['scripts/diagnostics.sh',   'sh'],
      ['scripts/log-analysis.sh',  'sh'],
      ['scripts/performance.sh',   'sh'],
      ['scripts/incident.sh',      'sh'],
      ['scripts/report.sh',        'sh'],
      ['scripts/trace.sh',         'sh'],
      ['scripts/profile.sh',       'sh'],
      ['scripts/debug.sh',         'sh'],
      ['scripts/flamegraph.sh',    'sh'],
      ['scripts/memory-dump.sh',   'sh'],
      ['scripts/network-check.sh', 'sh'],
      ['scripts/ssl-check.sh',     'sh'],
      ['scripts/uptime.sh',        'sh'],
      ['scripts/chaos.sh',         'sh'],
      ['scripts/synthetic.sh',     'sh'],
      ['scripts/benchmark.sh',     'sh'],
      ['scripts/load-test.sh',     'sh'],
      ['scripts/smoke-test.sh',    'sh'],
    ],
    11: [
      ['tests/smoke/health.sh',              'sh'],
      ['tests/smoke/endpoints.sh',           'sh'],
      ['tests/integration/api.sh',           'sh'],
      ['tests/integration/db.sh',            'sh'],
      ['tests/integration/auth.sh',          'sh'],
      ['tests/load/k6-script.js',            'js'],
      ['tests/load/artillery.yml',           'yaml'],
      ['tests/load/locust.py',               'python'],
      ['tests/security/zap.yaml',            'yaml'],
      ['tests/security/trivy.sh',            'sh'],
      ['tests/security/snyk.sh',             'sh'],
      ['tests/chaos/chaos-monkey.sh',        'sh'],
      ['tests/chaos/network-failure.sh',     'sh'],
      ['tests/chaos/pod-kill.sh',            'sh'],
      ['tests/contract/api.pact',            'json'],
      ['tests/accessibility/axe.js',         'js'],
      ['tests/visual/percy.js',              'js'],
      ['tests/performance/lighthouse.js',    'js'],
      ['tests/e2e/flow.sh',                  'sh'],
      ['tests/compliance/gdpr.sh',           'sh'],
    ],
    12: [
      ['README.md',                   'md'],
      ['docs/ARCHITECTURE.md',        'md'],
      ['docs/DEPLOYMENT.md',          'md'],
      ['docs/RUNBOOK.md',             'md'],
      ['docs/DISASTER_RECOVERY.md',   'md'],
      ['docs/MONITORING.md',          'md'],
      ['docs/SCALING.md',             'md'],
      ['docs/SECURITY.md',            'md'],
      ['docs/ONCALL.md',              'md'],
      ['docs/INCIDENT.md',            'md'],
      ['docs/NETWORK.md',             'md'],
      ['docs/SECRETS.md',             'md'],
      ['docs/COMPLIANCE.md',          'md'],
      ['docs/SLA.md',                 'md'],
      ['docs/BACKUP.md',              'md'],
      ['docs/PERFORMANCE.md',         'md'],
      ['CONTRIBUTING.md',             'md'],
      ['CHANGELOG.md',                'md'],
      ['docs/ROADMAP.md',             'md'],
      ['docs/ADR/001-infra.md',       'md'],
    ],
    13: [
      ['scripts/optimize-db.sh',     'sh'],
      ['scripts/cache-warmup.sh',     'sh'],
      ['scripts/cdn-purge.sh',        'sh'],
      ['scripts/compress-assets.sh',  'sh'],
      ['scripts/perf-test.sh',        'sh'],
      ['scripts/benchmark.sh',        'sh'],
      ['scripts/tune-kernel.sh',      'sh'],
      ['scripts/tune-postgres.sh',    'sh'],
      ['scripts/optimize-nginx.sh',   'sh'],
      ['nginx/cache.conf',            'nginx'],
      ['nginx/gzip.conf',             'nginx'],
      ['redis/redis.conf',            'text'],
      ['redis/redis-cluster.conf',    'text'],
      ['varnish/default.vcl',         'text'],
      ['pgbouncer/pgbouncer.ini',     'ini'],
      ['haproxy/balance.cfg',         'text'],
      ['memcached/memcached.conf',    'text'],
      ['cdn/cloudfront.json',         'json'],
      ['cdn/cloudflare-rules.json',   'json'],
      ['sysctl.conf',                 'text'],
    ],
    14: [
      ['api-gateway/kong.yml',              'yaml'],
      ['api-gateway/routes.yml',            'yaml'],
      ['api-gateway/plugins.yml',           'yaml'],
      ['api-gateway/rate-limit.yml',        'yaml'],
      ['api-gateway/auth.yml',              'yaml'],
      ['api-gateway/cors.yml',              'yaml'],
      ['api-gateway/logging.yml',           'yaml'],
      ['api-gateway/circuit-breaker.yml',   'yaml'],
      ['api-gateway/transform.yml',         'yaml'],
      ['api-gateway/cache.yml',             'yaml'],
      ['openapi.yaml',                      'yaml'],
      ['asyncapi.yaml',                     'yaml'],
      ['apigee/proxy.xml',                  'xml'],
      ['aws-api-gateway/swagger.json',      'json'],
      ['tyk/api.json',                      'json'],
      ['apisix/config.yaml',                'yaml'],
      ['dapr/components/pubsub.yaml',       'yaml'],
      ['dapr/components/statestore.yaml',   'yaml'],
      ['service-mesh/policy.yaml',          'yaml'],
      ['wasm/filter.go',                    'go'],
    ],
    15: [
      ['docs/STATUS_PAGE.md',            'md'],
      ['docs/SLA.md',                    'md'],
      ['docs/METRICS.md',                'md'],
      ['docs/ANALYTICS.md',              'md'],
      ['monitoring/synthetics.yml',      'yaml'],
      ['monitoring/lighthouse-ci.yml',   'yaml'],
      ['monitoring/web-vitals.yml',      'yaml'],
      ['monitoring/uptime-robot.json',   'json'],
      ['monitoring/pingdom.json',        'json'],
      ['monitoring/statuspage.json',     'json'],
      ['scripts/uptime-check.sh',        'sh'],
      ['scripts/seo-check.sh',           'sh'],
      ['scripts/accessibility.sh',       'sh'],
      ['scripts/performance-budget.sh',  'sh'],
      ['scripts/core-web-vitals.sh',     'sh'],
      ['scripts/broken-links.sh',        'sh'],
      ['analytics/ga4-config.json',      'json'],
      ['analytics/segment-config.json',  'json'],
      ['analytics/mixpanel-config.json', 'json'],
      ['analytics/hotjar-config.json',   'json'],
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic fallback pool
// ─────────────────────────────────────────────────────────────────────────────

function defaultPool(agentId: number, lang: string): FileDef[] {
  const extMap: Record<number, string> = {
    1: lang,  2: lang,  3: lang,  4: 'sql',
    5: lang,  6: lang,  7: 'sh',  8: 'yaml',
    9: lang,  10: lang, 11: lang, 12: 'md',
    13: lang, 14: 'yaml', 15: 'md',
  };
  const dirMap: Record<number, string> = {
    1:  'src/ui',         2:  'src/utils',    3:  'src/api',
    4:  'db',             5:  'src/auth',     6:  'src/config',
    7:  'scripts',        8:  'config',       9:  'src/animations',
    10: 'src/dashboard',  11: 'tests',        12: 'docs',
    13: 'src/preview',    14: 'src/schema',   15: 'src/seo',
  };
  const prefixMap: Record<number, string> = {
    1:  'component',  2:  'helper',    3:  'route',
    4:  'query',      5:  'auth',      6:  'config',
    7:  'script',     8:  'setup',     9:  'animation',
    10: 'panel',      11: 'test',      12: 'doc',
    13: 'preview',    14: 'schema',    15: 'seo',
  };

  const dir    = dirMap[agentId]    ?? 'src';
  const prefix = prefixMap[agentId] ?? 'file';
  const ext    = extMap[agentId]    ?? lang;

  return Array.from({ length: 20 }, (_, i) => [
    `${dir}/${prefix}_${i + 1}.${ext}`,
    ext,
  ] as FileDef);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main pool dispatcher
// ─────────────────────────────────────────────────────────────────────────────

function getFilePool(agentId: number, proj: ProjectType): FileDef[] {
  const { lang, framework } = proj;

  let pools: Record<number, FileDef[]>;

  if (lang === 'python' && framework === 'fastapi')   pools = getFilePools_FastAPI();
  else if (lang === 'python' && framework === 'django') pools = getFilePools_Django();
  else if (lang === 'python')                          pools = getFilePools_FastAPI();
  else if (lang === 'rust')                            pools = getFilePools_Rust();
  else if (lang === 'go')                              pools = getFilePools_Go();
  else if (lang === 'luau')                            pools = getFilePools_Luau();
  else if (lang === 'yaml' && framework === 'devops')  pools = getFilePools_DevOps();
  else                                                 pools = getFilePools_NextJS();

  return pools[agentId] ?? defaultPool(agentId, lang);
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve unique filename
// ─────────────────────────────────────────────────────────────────────────────

function resolveFilename(
  pool:      FileDef[],
  cursor:    number,
  usedPaths: Set<string>,
): { filename: string; ext: string; nextCursor: number } {
  for (let offset = 0; offset < pool.length; offset++) {
    const idx          = (cursor + offset) % pool.length;
    const [filename, ext] = pool[idx];
    if (!usedPaths.has(filename)) {
      return { filename, ext, nextCursor: idx + 1 };
    }
  }

  // Pool exhausted — suffix strategy
  const [baseName, baseExt] = pool[cursor % pool.length];
  const noExt = baseName.includes('.')
    ? baseName.slice(0, baseName.lastIndexOf('.'))
    : baseName;

  let counter = 2;
  while (true) {
    const candidate = `${noExt}_v${counter}.${baseExt}`;
    if (!usedPaths.has(candidate)) {
      return { filename: candidate, ext: baseExt, nextCursor: cursor + 1 };
    }
    counter++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip markdown fences
// ─────────────────────────────────────────────────────────────────────────────

function stripFences(raw: string): string {
  return raw
    .replace(/^```[\w-]*\r?\n?/, '')
    .replace(/\r?\n?```\s*$/, '')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Build file generation prompt
// ─────────────────────────────────────────────────────────────────────────────

function buildFilePrompt(
  projectDescription: string,
  filename:           string,
  ext:                string,
  agentName:          string,
  agentRole:          string,
): string {
  const langName = getLangName(ext);

  return `You are ${agentName}, a ${agentRole}.

PROJECT: ${projectDescription}

YOUR TASK: Generate the file "${filename}"
LANGUAGE: ${langName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES (breaking any = failure):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Output ONLY the raw ${langName} file content. Nothing else.
2. NO markdown code fences — no \`\`\` backticks anywhere.
3. NO explanations, NO preamble, NO "Here is...", NO "Sure!".
4. The language MUST be ${langName}. If the file is .py, write Python. If .rs, write Rust. If .luau, write Luau. NEVER default to TypeScript unless the file IS a .ts/.tsx file.
5. The code MUST be complete, production-ready, and fully functional.
6. Use proper ${langName} conventions: imports, exports, types, error handling.
7. The filename is "${filename}" — name your functions/classes/modules accordingly.
8. Make the code specifically relevant to: ${projectDescription}
9. Include meaningful implementation — not just stubs or TODO comments.
10. Follow ${langName} best practices and idioms.

BEGIN FILE CONTENT NOW:`;
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
  const stopRef    = useRef(false);

  // ── stop ──────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    stopRef.current = true;
    setIsGenerating(false);
    setActiveAgentId(null);
    setThinkingAgentId(null);
  }, [setIsGenerating, setActiveAgentId, setThinkingAgentId]);

  // ── start ─────────────────────────────────────────────────────────────────

  const start = useCallback(
    async (prompt: string, maxFiles = 50) => {
      stopRef.current = false;
      clearAll();
      setIsGenerating(true);
      setProgress(0);

      // ── Detect project type ────────────────────────────────────────────
      const projType = detectProjectType(prompt);

      // ── Model selection — OpenRouter ONLY, all models, round-robin ────
      const allModels = models.filter((m) => m.provider === 'openrouter');

      const fallbackModel = {
        provider: 'openrouter' as const,
        id:       'meta-llama/llama-3.3-70b-instruct:free',
      };

      // ── Pre-build pools for all agents ─────────────────────────────────
      const agentPools  = new Map<number, FileDef[]>();
      const poolCursors = new Map<number, number>();
      const usedPaths   = new Set<string>();

      for (const agent of AGENTS) {
        agentPools.set(agent.id, getFilePool(agent.id, projType));
      }

      // ── Main generation loop ───────────────────────────────────────────
      for (let i = 0; i < maxFiles; i++) {
        if (stopRef.current) break;

        const agent  = AGENTS[i % AGENTS.length];
        const pool   = agentPools.get(agent.id) ?? defaultPool(agent.id, projType.lang);
        const cursor = poolCursors.get(agent.id) ?? 0;

        const { filename, ext, nextCursor } = resolveFilename(pool, cursor, usedPaths);
        usedPaths.add(filename);
        poolCursors.set(agent.id, nextCursor);

        // UI state
        setActiveAgentId(agent.id);
        setThinkingAgentId(agent.id);
        setProgress(Math.round((i / maxFiles) * 100));

        let content = `// ${agent.name} — ${filename}\n// Generating…`;

        try {
          // Round-robin across ALL available OpenRouter models
          const modelForFile = allModels.length > 0
            ? allModels[i % allModels.length]
            : fallbackModel;

          const res = await fetch('/api/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider:  'openrouter',
              model:     modelForFile.id,
              system:    agent.system,
              messages: [{
                role:    'user',
                content: buildFilePrompt(prompt, filename, ext, agent.name, agent.role),
              }],
              maxTokens: 1400,
            }),
          });

          if (res.ok) {
            const data = await res.json() as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const raw = data?.choices?.[0]?.message?.content ?? content;
            content   = stripFences(raw);
          } else {
            const errData = await res.json().catch(() => ({})) as { error?: string };
            content = `# ${agent.name}: API error ${res.status}\n# ${errData?.error ?? 'Unknown error'}`;
          }
        } catch (err) {
          content = `# ${agent.name} error: ${
            err instanceof Error ? err.message : 'Unknown'
          }`;
        }

        setThinkingAgentId(null);
        if (stopRef.current) break;

        // ── Build file object ────────────────────────────────────────────
        const file: GeneratedFile = {
          id:         `f-${Date.now()}-${i}`,
          agentId:    agent.id,
          agentName:  agent.name,
          agentColor: agent.color,
          filename,
          content,
          language:   ext,
          timestamp:  Date.now(),
          linesAdded: content.split('\n').length,
        };

        // ── Build log entry ──────────────────────────────────────────────
        const snippet = content
          .split('\n')
          .find((l) => {
            const t = l.trim();
            return t.length > 0 && !t.startsWith('#') && !t.startsWith('//') && !t.startsWith('*');
          })
          ?.trim()
          .slice(0, 90)
          ?? content.split('\n')[0].trim().slice(0, 90);

        const log: LogEntry = {
          id:         `l-${Date.now()}-${i}`,
          agentId:    agent.id,
          agentName:  agent.name,
          agentColor: agent.color,
          filename,
          snippet,
          timestamp:  Date.now(),
          type:       randomItem([...LOG_TYPES]),
        };

        addGeneratedFile(file);
        addLogEntry(log);
      }

      // ── Done ────────────────────────────────────────────────────────────
      if (!stopRef.current) {
        setIsGenerating(false);
        setActiveAgentId(null);
        setThinkingAgentId(null);
        setSynthesized(true);
        setProgress(100);
      }
    },
    [
      models, clearAll,
      setIsGenerating, setActiveAgentId, setThinkingAgentId,
      setProgress, setSynthesized, addGeneratedFile, addLogEntry,
    ],
  );

  return { start, stop };
}