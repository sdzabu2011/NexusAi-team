'use client';
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { useModelStore } from '@/store/modelStore';
import { AGENTS } from '@/constants/agents';
import { randomItem } from '@/lib/utils/helpers';
import type { GeneratedFile, LogEntry } from '@/types';

const LOG_TYPES = [
  'write', 'read', 'test', 'deploy', 'optimize', 'review',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Detect project type from prompt
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectType {
  lang:       string;   // primary language
  framework:  string;   // primary framework
  extras:     string[]; // extra languages/tools
}

function detectProjectType(prompt: string): ProjectType {
  const p = prompt.toLowerCase();

  // Python projects
  if (p.includes('fastapi') || p.includes('fast api')) {
    return { lang: 'python', framework: 'fastapi', extras: ['sql', 'docker', 'sh'] };
  }
  if (p.includes('django')) {
    return { lang: 'python', framework: 'django', extras: ['sql', 'html', 'css', 'sh'] };
  }
  if (p.includes('flask')) {
    return { lang: 'python', framework: 'flask', extras: ['sql', 'html', 'css', 'sh'] };
  }
  if (p.includes('python') || p.includes('pytorch') || p.includes('tensorflow') || p.includes('pandas') || p.includes('numpy') || p.includes('ml ') || p.includes('machine learning') || p.includes('data science')) {
    return { lang: 'python', framework: 'python', extras: ['sql', 'sh', 'yaml'] };
  }

  // Rust projects
  if (p.includes('rust') || p.includes('actix') || p.includes('axum') || p.includes('tokio') || p.includes('cargo')) {
    return { lang: 'rust', framework: 'rust', extras: ['sql', 'toml', 'sh', 'yaml'] };
  }

  // Go projects
  if (p.includes(' go ') || p.includes('golang') || p.includes('gin ') || p.includes('echo ') || p.includes('fiber ') || p.includes('gorm')) {
    return { lang: 'go', framework: 'go', extras: ['sql', 'sh', 'yaml', 'dockerfile'] };
  }

  // Java projects
  if (p.includes('java') || p.includes('spring') || p.includes('spring boot') || p.includes('maven') || p.includes('gradle')) {
    return { lang: 'java', framework: 'spring', extras: ['sql', 'xml', 'yaml', 'sh'] };
  }

  // C# / .NET
  if (p.includes('c#') || p.includes('dotnet') || p.includes('.net') || p.includes('asp.net') || p.includes('blazor')) {
    return { lang: 'csharp', framework: 'dotnet', extras: ['sql', 'xml', 'sh'] };
  }

  // Roblox / Lua / Luau
  if (p.includes('roblox') || p.includes('luau') || p.includes('roblox studio')) {
    return { lang: 'luau', framework: 'roblox', extras: ['lua'] };
  }
  if (p.includes('lua') || p.includes('love2d') || p.includes('löve')) {
    return { lang: 'lua', framework: 'lua', extras: ['sh'] };
  }

  // PHP
  if (p.includes('php') || p.includes('laravel') || p.includes('symfony') || p.includes('wordpress')) {
    return { lang: 'php', framework: 'laravel', extras: ['sql', 'css', 'html', 'sh'] };
  }

  // Ruby
  if (p.includes('ruby') || p.includes('rails') || p.includes('sinatra')) {
    return { lang: 'ruby', framework: 'rails', extras: ['sql', 'html', 'css', 'sh'] };
  }

  // Swift / iOS
  if (p.includes('swift') || p.includes('ios') || p.includes('swiftui') || p.includes('xcode')) {
    return { lang: 'swift', framework: 'swiftui', extras: ['json'] };
  }

  // Kotlin / Android
  if (p.includes('kotlin') || p.includes('android') || p.includes('jetpack')) {
    return { lang: 'kotlin', framework: 'android', extras: ['xml', 'sql', 'sh'] };
  }

  // C / C++
  if (p.includes('c++') || p.includes('cpp') || p.includes('cmake') || p.includes('opengl') || p.includes('game engine')) {
    return { lang: 'cpp', framework: 'cpp', extras: ['c', 'h', 'cmake', 'sh'] };
  }
  if (p.includes(' c ') || p.includes('embedded') || p.includes('arduino') || p.includes('microcontroller')) {
    return { lang: 'c', framework: 'c', extras: ['h', 'makefile', 'sh'] };
  }

  // DevOps / Infrastructure
  if (p.includes('docker') || p.includes('kubernetes') || p.includes('k8s') || p.includes('terraform') || p.includes('ansible') || p.includes('devops') || p.includes('ci/cd')) {
    return { lang: 'yaml', framework: 'devops', extras: ['sh', 'dockerfile', 'tf', 'json'] };
  }

  // Mobile / Flutter
  if (p.includes('flutter') || p.includes('dart')) {
    return { lang: 'dart', framework: 'flutter', extras: ['yaml', 'sh'] };
  }

  // React Native
  if (p.includes('react native') || p.includes('expo')) {
    return { lang: 'tsx', framework: 'react-native', extras: ['ts', 'json', 'sh'] };
  }

  // Next.js / React (default web)
  if (p.includes('next') || p.includes('react') || p.includes('frontend') || p.includes('website') || p.includes('web app') || p.includes('saas') || p.includes('dashboard')) {
    return { lang: 'tsx', framework: 'nextjs', extras: ['ts', 'css', 'sql', 'sh'] };
  }

  // Node.js / Express
  if (p.includes('node') || p.includes('express') || p.includes('api') || p.includes('backend') || p.includes('server') || p.includes('rest')) {
    return { lang: 'ts', framework: 'node', extras: ['sql', 'sh', 'yaml', 'json'] };
  }

  // Database focused
  if (p.includes('database') || p.includes('sql') || p.includes('postgres') || p.includes('mysql') || p.includes('mongodb')) {
    return { lang: 'sql', framework: 'database', extras: ['ts', 'sh', 'yaml'] };
  }

  // Blockchain / Solidity
  if (p.includes('solidity') || p.includes('blockchain') || p.includes('ethereum') || p.includes('web3') || p.includes('smart contract')) {
    return { lang: 'sol', framework: 'solidity', extras: ['ts', 'json', 'sh'] };
  }

  // Default: Next.js
  return { lang: 'tsx', framework: 'nextjs', extras: ['ts', 'css', 'sql', 'sh'] };
}

// ─────────────────────────────────────────────────────────────────────────────
// File name pools per agent per project type
// Each entry = [path, language_extension]
// ─────────────────────────────────────────────────────────────────────────────

type FileDef = [string, string]; // [filename, ext]

function getFilePool(agentId: number, proj: ProjectType): FileDef[] {
  const { lang, framework } = proj;

  // ── Python / FastAPI ──────────────────────────────────────────────────────
  if (lang === 'python' && framework === 'fastapi') {
    const pools: Record<number, FileDef[]> = {
      1:  [ // UI/UX — HTML templates or Jinja2
        ['templates/index.html',        'html'],
        ['templates/base.html',         'html'],
        ['templates/dashboard.html',    'html'],
        ['templates/login.html',        'html'],
        ['templates/register.html',     'html'],
        ['static/css/style.css',        'css'],
        ['static/css/dashboard.css',    'css'],
        ['static/js/main.js',           'js'],
        ['static/js/auth.js',           'js'],
        ['templates/components/nav.html', 'html'],
      ],
      2:  [ // Frontend hooks → Python utilities
        ['app/utils/helpers.py',        'python'],
        ['app/utils/validators.py',     'python'],
        ['app/utils/formatters.py',     'python'],
        ['app/utils/pagination.py',     'python'],
        ['app/utils/cache.py',          'python'],
        ['app/utils/email.py',          'python'],
        ['app/utils/file_handler.py',   'python'],
        ['app/utils/logger.py',         'python'],
        ['app/utils/response.py',       'python'],
        ['app/utils/constants.py',      'python'],
      ],
      3:  [ // Backend / API routes
        ['app/main.py',                 'python'],
        ['app/api/v1/router.py',        'python'],
        ['app/api/v1/endpoints/users.py',    'python'],
        ['app/api/v1/endpoints/auth.py',     'python'],
        ['app/api/v1/endpoints/items.py',    'python'],
        ['app/api/v1/endpoints/health.py',   'python'],
        ['app/api/v1/endpoints/upload.py',   'python'],
        ['app/api/v1/endpoints/search.py',   'python'],
        ['app/api/dependencies.py',     'python'],
        ['app/api/v1/endpoints/admin.py',    'python'],
        ['app/websockets/handler.py',   'python'],
        ['app/api/v1/endpoints/metrics.py',  'python'],
      ],
      4:  [ // Database
        ['app/db/database.py',          'python'],
        ['app/db/models.py',            'python'],
        ['app/models/user.py',          'python'],
        ['app/models/item.py',          'python'],
        ['alembic/versions/001_init.sql', 'sql'],
        ['alembic/versions/002_users.sql','sql'],
        ['app/db/session.py',           'python'],
        ['app/db/base.py',              'python'],
        ['alembic/env.py',              'python'],
        ['alembic.ini',                 'ini'],
      ],
      5:  [ // Auth & Security
        ['app/core/security.py',        'python'],
        ['app/core/auth.py',            'python'],
        ['app/schemas/auth.py',         'python'],
        ['app/services/auth_service.py','python'],
        ['app/middleware/auth.py',      'python'],
        ['app/core/oauth2.py',          'python'],
        ['app/core/permissions.py',     'python'],
        ['app/core/rate_limit.py',      'python'],
        ['app/core/jwt.py',             'python'],
        ['app/middleware/cors.py',      'python'],
      ],
      6:  [ // State / Config
        ['app/core/config.py',          'python'],
        ['app/core/settings.py',        'python'],
        ['app/schemas/user.py',         'python'],
        ['app/schemas/item.py',         'python'],
        ['app/schemas/response.py',     'python'],
        ['app/schemas/pagination.py',   'python'],
        ['app/schemas/base.py',         'python'],
        ['app/core/events.py',          'python'],
        ['app/core/exceptions.py',      'python'],
        ['app/schemas/token.py',        'python'],
      ],
      7:  [ // DevOps
        ['Dockerfile',                  'dockerfile'],
        ['docker-compose.yml',          'yaml'],
        ['docker-compose.prod.yml',     'yaml'],
        ['.github/workflows/deploy.yml','yaml'],
        ['.github/workflows/test.yml',  'yaml'],
        ['nginx/nginx.conf',            'nginx'],
        ['scripts/start.sh',            'sh'],
        ['scripts/migrate.sh',          'sh'],
        ['scripts/deploy.sh',           'sh'],
        ['render.yaml',                 'yaml'],
      ],
      8:  [ // Config
        ['requirements.txt',            'text'],
        ['requirements-dev.txt',        'text'],
        ['.env.example',                'text'],
        ['pyproject.toml',              'toml'],
        ['setup.py',                    'python'],
        ['.gitignore',                  'text'],
        ['pytest.ini',                  'ini'],
        ['mypy.ini',                    'ini'],
        ['.flake8',                     'ini'],
        ['Makefile',                    'makefile'],
      ],
      9:  [ // Animations → FastAPI background tasks
        ['app/tasks/background.py',     'python'],
        ['app/tasks/celery_app.py',     'python'],
        ['app/tasks/email_tasks.py',    'python'],
        ['app/tasks/cleanup.py',        'python'],
        ['app/services/notification.py','python'],
        ['app/core/scheduler.py',       'python'],
        ['app/tasks/report_tasks.py',   'python'],
        ['app/tasks/worker.py',         'python'],
        ['app/core/redis.py',           'python'],
        ['app/tasks/image_tasks.py',    'python'],
      ],
      10: [ // Debug & Dashboard
        ['app/admin/dashboard.py',      'python'],
        ['app/services/analytics.py',   'python'],
        ['app/core/logging.py',         'python'],
        ['app/middleware/logging.py',   'python'],
        ['app/services/metrics.py',     'python'],
        ['app/admin/routes.py',         'python'],
        ['app/core/monitoring.py',      'python'],
        ['app/utils/debug.py',          'python'],
        ['app/services/audit.py',       'python'],
        ['app/admin/middleware.py',     'python'],
      ],
      11: [ // Testing
        ['tests/conftest.py',           'python'],
        ['tests/test_auth.py',          'python'],
        ['tests/test_users.py',         'python'],
        ['tests/test_items.py',         'python'],
        ['tests/test_health.py',        'python'],
        ['tests/test_security.py',      'python'],
        ['tests/factories.py',          'python'],
        ['tests/utils.py',              'python'],
        ['tests/test_db.py',            'python'],
        ['tests/test_api.py',           'python'],
      ],
      12: [ // Docs
        ['README.md',                   'md'],
        ['docs/API.md',                 'md'],
        ['docs/SETUP.md',               'md'],
        ['docs/DEPLOYMENT.md',          'md'],
        ['docs/ARCHITECTURE.md',        'md'],
        ['CONTRIBUTING.md',             'md'],
        ['docs/AUTHENTICATION.md',      'md'],
        ['docs/DATABASE.md',            'md'],
        ['CHANGELOG.md',                'md'],
        ['docs/CONFIGURATION.md',       'md'],
      ],
      13: [ // Performance
        ['app/core/cache.py',           'python'],
        ['app/middleware/cache.py',     'python'],
        ['app/services/search.py',      'python'],
        ['app/core/pagination.py',      'python'],
        ['app/utils/profiler.py',       'python'],
        ['app/core/connection_pool.py', 'python'],
        ['app/middleware/compression.py','python'],
        ['app/services/cdn.py',         'python'],
        ['app/core/async_utils.py',     'python'],
        ['app/utils/batch.py',          'python'],
      ],
      14: [ // API Design
        ['openapi.yaml',                'yaml'],
        ['app/schemas/validators.py',   'python'],
        ['app/core/errors.py',          'python'],
        ['app/middleware/validation.py','python'],
        ['app/schemas/common.py',       'python'],
        ['app/api/v1/docs.py',          'python'],
        ['app/core/serializers.py',     'python'],
        ['app/schemas/filters.py',      'python'],
        ['app/core/types.py',           'python'],
        ['app/api/versioning.py',       'python'],
      ],
      15: [ // SEO
        ['app/seo/sitemap.py',          'python'],
        ['app/seo/robots.py',           'python'],
        ['app/seo/meta.py',             'python'],
        ['app/analytics/ga.py',         'python'],
        ['app/seo/schema.py',           'python'],
        ['app/middleware/seo.py',       'python'],
        ['app/seo/og.py',               'python'],
        ['static/robots.txt',           'text'],
        ['static/sitemap.xml',          'xml'],
        ['app/analytics/tracking.py',   'python'],
      ],
    };
    return pools[agentId] ?? defaultPool(agentId, lang);
  }

  // ── Python / Django ───────────────────────────────────────────────────────
  if (lang === 'python' && framework === 'django') {
    const pools: Record<number, FileDef[]> = {
      1:  [
        ['templates/base.html',           'html'],
        ['templates/home/index.html',     'html'],
        ['templates/users/login.html',    'html'],
        ['templates/users/register.html', 'html'],
        ['templates/dashboard/main.html', 'html'],
        ['static/css/style.css',          'css'],
        ['static/css/dashboard.css',      'css'],
        ['static/js/main.js',             'js'],
        ['templates/components/nav.html', 'html'],
        ['static/js/dashboard.js',        'js'],
      ],
      2:  [
        ['core/utils.py',               'python'],
        ['core/helpers.py',             'python'],
        ['core/validators.py',          'python'],
        ['core/decorators.py',          'python'],
        ['core/mixins.py',              'python'],
        ['core/templatetags/filters.py','python'],
        ['core/managers.py',            'python'],
        ['core/signals.py',             'python'],
        ['core/middleware.py',          'python'],
        ['core/context_processors.py',  'python'],
      ],
      3:  [
        ['config/urls.py',              'python'],
        ['users/views.py',              'python'],
        ['users/urls.py',               'python'],
        ['api/views.py',                'python'],
        ['api/urls.py',                 'python'],
        ['api/serializers.py',          'python'],
        ['dashboard/views.py',          'python'],
        ['dashboard/urls.py',           'python'],
        ['core/views.py',               'python'],
        ['api/viewsets.py',             'python'],
      ],
      4:  [
        ['users/models.py',             'python'],
        ['core/models.py',              'python'],
        ['users/migrations/0001_initial.py', 'python'],
        ['dashboard/models.py',         'python'],
        ['db/initial_data.sql',         'sql'],
        ['users/admin.py',              'python'],
        ['dashboard/migrations/0001_initial.py', 'python'],
        ['core/migrations/0001_initial.py',      'python'],
        ['core/admin.py',               'python'],
        ['users/managers.py',           'python'],
      ],
      5:  [
        ['users/auth.py',               'python'],
        ['core/permissions.py',         'python'],
        ['core/authentication.py',      'python'],
        ['config/security.py',          'python'],
        ['users/backends.py',           'python'],
        ['api/permissions.py',          'python'],
        ['core/throttling.py',          'python'],
        ['users/tokens.py',             'python'],
        ['core/oauth.py',               'python'],
        ['config/auth.py',              'python'],
      ],
      6:  [
        ['config/settings/base.py',     'python'],
        ['config/settings/prod.py',     'python'],
        ['config/settings/dev.py',      'python'],
        ['config/wsgi.py',              'python'],
        ['config/asgi.py',              'python'],
        ['core/apps.py',                'python'],
        ['users/apps.py',               'python'],
        ['dashboard/apps.py',           'python'],
        ['core/constants.py',           'python'],
        ['config/celery.py',            'python'],
      ],
      7:  [
        ['Dockerfile',                  'dockerfile'],
        ['docker-compose.yml',          'yaml'],
        ['.github/workflows/deploy.yml','yaml'],
        ['nginx/nginx.conf',            'nginx'],
        ['scripts/start.sh',            'sh'],
        ['scripts/migrate.sh',          'sh'],
        ['scripts/collectstatic.sh',    'sh'],
        ['render.yaml',                 'yaml'],
        ['Procfile',                    'text'],
        ['scripts/setup.sh',            'sh'],
      ],
      8:  [
        ['requirements.txt',            'text'],
        ['requirements/base.txt',       'text'],
        ['requirements/prod.txt',       'text'],
        ['requirements/dev.txt',        'text'],
        ['.env.example',                'text'],
        ['pyproject.toml',              'toml'],
        ['setup.cfg',                   'ini'],
        ['.gitignore',                  'text'],
        ['Makefile',                    'makefile'],
        ['manage.py',                   'python'],
      ],
      9:  [
        ['core/tasks.py',               'python'],
        ['users/tasks.py',              'python'],
        ['core/signals.py',             'python'],
        ['core/receivers.py',           'python'],
        ['dashboard/tasks.py',          'python'],
        ['core/schedulers.py',          'python'],
        ['core/events.py',              'python'],
        ['core/webhooks.py',            'python'],
        ['core/email.py',               'python'],
        ['core/notifications.py',       'python'],
      ],
      10: [
        ['core/logging.py',             'python'],
        ['dashboard/analytics.py',      'python'],
        ['core/monitoring.py',          'python'],
        ['users/analytics.py',          'python'],
        ['core/metrics.py',             'python'],
        ['dashboard/charts.py',         'python'],
        ['core/audit.py',               'python'],
        ['core/debug.py',               'python'],
        ['dashboard/reports.py',        'python'],
        ['core/health.py',              'python'],
      ],
      11: [
        ['tests/test_models.py',        'python'],
        ['tests/test_views.py',         'python'],
        ['tests/test_api.py',           'python'],
        ['tests/test_auth.py',          'python'],
        ['tests/conftest.py',           'python'],
        ['tests/factories.py',          'python'],
        ['tests/test_forms.py',         'python'],
        ['tests/test_tasks.py',         'python'],
        ['tests/test_signals.py',       'python'],
        ['tests/utils.py',              'python'],
      ],
      12: [
        ['README.md',                   'md'],
        ['docs/SETUP.md',               'md'],
        ['docs/API.md',                 'md'],
        ['docs/MODELS.md',              'md'],
        ['docs/DEPLOYMENT.md',          'md'],
        ['CONTRIBUTING.md',             'md'],
        ['docs/ARCHITECTURE.md',        'md'],
        ['CHANGELOG.md',                'md'],
        ['docs/CONFIGURATION.md',       'md'],
        ['docs/TESTING.md',             'md'],
      ],
      13: [
        ['core/cache.py',               'python'],
        ['core/pagination.py',          'python'],
        ['core/optimizations.py',       'python'],
        ['dashboard/cache.py',          'python'],
        ['core/queryset.py',            'python'],
        ['core/db_router.py',           'python'],
        ['core/indexes.py',             'python'],
        ['core/compression.py',         'python'],
        ['core/prefetch.py',            'python'],
        ['core/select_related.py',      'python'],
      ],
      14: [
        ['api/serializers.py',          'python'],
        ['api/schema.py',               'python'],
        ['openapi.yaml',                'yaml'],
        ['core/validators.py',          'python'],
        ['api/filters.py',              'python'],
        ['api/pagination.py',           'python'],
        ['core/exceptions.py',          'python'],
        ['api/renderers.py',            'python'],
        ['api/parsers.py',              'python'],
        ['core/types.py',               'python'],
      ],
      15: [
        ['core/seo.py',                 'python'],
        ['templates/seo/meta.html',     'html'],
        ['static/robots.txt',           'text'],
        ['static/sitemap.xml',          'xml'],
        ['core/analytics.py',           'python'],
        ['core/sitemap.py',             'python'],
        ['core/meta.py',                'python'],
        ['templates/seo/og.html',       'html'],
        ['core/structured_data.py',     'python'],
        ['core/tracking.py',            'python'],
      ],
    };
    return pools[agentId] ?? defaultPool(agentId, lang);
  }

  // ── Rust ──────────────────────────────────────────────────────────────────
  if (lang === 'rust') {
    const pools: Record<number, FileDef[]> = {
      1:  [
        ['src/handlers/mod.rs',         'rust'],
        ['src/templates/index.html',    'html'],
        ['src/static/style.css',        'css'],
        ['src/handlers/pages.rs',       'rust'],
        ['src/templates/layout.html',   'html'],
        ['src/static/main.js',          'js'],
        ['src/handlers/assets.rs',      'rust'],
        ['src/templates/error.html',    'html'],
        ['src/static/dashboard.css',    'css'],
        ['src/templates/dashboard.html','html'],
      ],
      2:  [
        ['src/utils/mod.rs',            'rust'],
        ['src/utils/helpers.rs',        'rust'],
        ['src/utils/validators.rs',     'rust'],
        ['src/utils/formatters.rs',     'rust'],
        ['src/utils/pagination.rs',     'rust'],
        ['src/utils/crypto.rs',         'rust'],
        ['src/utils/email.rs',          'rust'],
        ['src/utils/cache.rs',          'rust'],
        ['src/utils/logger.rs',         'rust'],
        ['src/utils/errors.rs',         'rust'],
      ],
      3:  [
        ['src/main.rs',                 'rust'],
        ['src/routes/mod.rs',           'rust'],
        ['src/routes/users.rs',         'rust'],
        ['src/routes/auth.rs',          'rust'],
        ['src/routes/items.rs',         'rust'],
        ['src/routes/health.rs',        'rust'],
        ['src/handlers/users.rs',       'rust'],
        ['src/handlers/auth.rs',        'rust'],
        ['src/middleware/mod.rs',       'rust'],
        ['src/routes/admin.rs',         'rust'],
      ],
      4:  [
        ['src/db/mod.rs',               'rust'],
        ['src/models/user.rs',          'rust'],
        ['src/models/mod.rs',           'rust'],
        ['src/models/item.rs',          'rust'],
        ['migrations/001_init.sql',     'sql'],
        ['migrations/002_users.sql',    'sql'],
        ['src/db/pool.rs',              'rust'],
        ['src/db/queries.rs',           'rust'],
        ['migrations/003_items.sql',    'sql'],
        ['src/db/migrations.rs',        'rust'],
      ],
      5:  [
        ['src/auth/mod.rs',             'rust'],
        ['src/auth/jwt.rs',             'rust'],
        ['src/auth/password.rs',        'rust'],
        ['src/middleware/auth.rs',       'rust'],
        ['src/auth/oauth.rs',           'rust'],
        ['src/auth/permissions.rs',     'rust'],
        ['src/middleware/rate_limit.rs', 'rust'],
        ['src/auth/session.rs',         'rust'],
        ['src/middleware/cors.rs',       'rust'],
        ['src/auth/tokens.rs',          'rust'],
      ],
      6:  [
        ['src/config/mod.rs',           'rust'],
        ['src/config/app.rs',           'rust'],
        ['src/state/mod.rs',            'rust'],
        ['src/state/app_state.rs',      'rust'],
        ['src/config/database.rs',      'rust'],
        ['src/config/auth.rs',          'rust'],
        ['src/state/cache.rs',          'rust'],
        ['src/config/server.rs',        'rust'],
        ['src/state/metrics.rs',        'rust'],
        ['src/config/redis.rs',         'rust'],
      ],
      7:  [
        ['Dockerfile',                  'dockerfile'],
        ['docker-compose.yml',          'yaml'],
        ['.github/workflows/deploy.yml','yaml'],
        ['.github/workflows/test.yml',  'yaml'],
        ['nginx/nginx.conf',            'nginx'],
        ['scripts/start.sh',            'sh'],
        ['scripts/build.sh',            'sh'],
        ['render.yaml',                 'yaml'],
        ['scripts/migrate.sh',          'sh'],
        ['scripts/deploy.sh',           'sh'],
      ],
      8:  [
        ['Cargo.toml',                  'toml'],
        ['Cargo.lock',                  'toml'],
        ['.env.example',                'text'],
        ['.gitignore',                  'text'],
        ['rustfmt.toml',                'toml'],
        ['clippy.toml',                 'toml'],
        ['Makefile',                    'makefile'],
        ['.cargo/config.toml',          'toml'],
        ['build.rs',                    'rust'],
        ['Cross.toml',                  'toml'],
      ],
      9:  [
        ['src/tasks/mod.rs',            'rust'],
        ['src/tasks/background.rs',     'rust'],
        ['src/tasks/email.rs',          'rust'],
        ['src/tasks/cleanup.rs',        'rust'],
        ['src/workers/mod.rs',          'rust'],
        ['src/workers/processor.rs',    'rust'],
        ['src/tasks/scheduler.rs',      'rust'],
        ['src/workers/queue.rs',        'rust'],
        ['src/tasks/notifications.rs',  'rust'],
        ['src/workers/pool.rs',         'rust'],
      ],
      10: [
        ['src/metrics/mod.rs',          'rust'],
        ['src/metrics/collector.rs',    'rust'],
        ['src/logging/mod.rs',          'rust'],
        ['src/logging/middleware.rs',   'rust'],
        ['src/admin/mod.rs',            'rust'],
        ['src/admin/routes.rs',         'rust'],
        ['src/metrics/prometheus.rs',   'rust'],
        ['src/logging/tracing.rs',      'rust'],
        ['src/admin/handlers.rs',       'rust'],
        ['src/metrics/health.rs',       'rust'],
      ],
      11: [
        ['tests/integration/auth.rs',   'rust'],
        ['tests/integration/users.rs',  'rust'],
        ['tests/integration/items.rs',  'rust'],
        ['tests/unit/models.rs',        'rust'],
        ['tests/unit/utils.rs',         'rust'],
        ['tests/common/mod.rs',         'rust'],
        ['tests/common/fixtures.rs',    'rust'],
        ['benches/api.rs',              'rust'],
        ['tests/unit/auth.rs',          'rust'],
        ['tests/integration/health.rs', 'rust'],
      ],
      12: [
        ['README.md',                   'md'],
        ['docs/API.md',                 'md'],
        ['docs/SETUP.md',               'md'],
        ['docs/ARCHITECTURE.md',        'md'],
        ['CONTRIBUTING.md',             'md'],
        ['docs/DEPLOYMENT.md',          'md'],
        ['CHANGELOG.md',                'md'],
        ['docs/CONFIGURATION.md',       'md'],
        ['docs/PERFORMANCE.md',         'md'],
        ['docs/SECURITY.md',            'md'],
      ],
      13: [
        ['src/cache/mod.rs',            'rust'],
        ['src/cache/redis.rs',          'rust'],
        ['src/cache/memory.rs',         'rust'],
        ['src/db/pool.rs',              'rust'],
        ['src/utils/compression.rs',    'rust'],
        ['src/cache/strategies.rs',     'rust'],
        ['src/utils/async_utils.rs',    'rust'],
        ['src/db/query_builder.rs',     'rust'],
        ['benches/performance.rs',      'rust'],
        ['src/utils/batch.rs',          'rust'],
      ],
      14: [
        ['src/schemas/mod.rs',          'rust'],
        ['src/schemas/user.rs',         'rust'],
        ['src/schemas/item.rs',         'rust'],
        ['src/schemas/response.rs',     'rust'],
        ['openapi.yaml',                'yaml'],
        ['src/schemas/error.rs',        'rust'],
        ['src/validators/mod.rs',       'rust'],
        ['src/schemas/pagination.rs',   'rust'],
        ['src/validators/user.rs',      'rust'],
        ['src/schemas/auth.rs',         'rust'],
      ],
      15: [
        ['src/seo/mod.rs',              'rust'],
        ['src/seo/sitemap.rs',          'rust'],
        ['src/seo/robots.rs',           'rust'],
        ['src/seo/meta.rs',             'rust'],
        ['src/analytics/mod.rs',        'rust'],
        ['static/robots.txt',           'text'],
        ['static/sitemap.xml',          'xml'],
        ['src/analytics/tracker.rs',    'rust'],
        ['src/seo/schema.rs',           'rust'],
        ['src/seo/og.rs',               'rust'],
      ],
    };
    return pools[agentId] ?? defaultPool(agentId, lang);
  }

  // ── Go ────────────────────────────────────────────────────────────────────
  if (lang === 'go') {
    const pools: Record<number, FileDef[]> = {
      1:  [
        ['templates/index.html',        'html'],
        ['templates/layout.html',       'html'],
        ['templates/dashboard.html',    'html'],
        ['static/css/style.css',        'css'],
        ['static/js/main.js',           'js'],
        ['templates/login.html',        'html'],
        ['static/css/dashboard.css',    'css'],
        ['templates/components/nav.html','html'],
        ['static/js/dashboard.js',      'js'],
        ['templates/error.html',        'html'],
      ],
      2:  [
        ['internal/utils/helpers.go',   'go'],
        ['internal/utils/validator.go', 'go'],
        ['internal/utils/response.go',  'go'],
        ['internal/utils/pagination.go','go'],
        ['pkg/utils/crypto.go',         'go'],
        ['internal/utils/email.go',     'go'],
        ['pkg/utils/logger.go',         'go'],
        ['internal/utils/cache.go',     'go'],
        ['pkg/utils/file.go',           'go'],
        ['internal/utils/errors.go',    'go'],
      ],
      3:  [
        ['cmd/server/main.go',          'go'],
        ['internal/handlers/user.go',   'go'],
        ['internal/handlers/auth.go',   'go'],
        ['internal/handlers/item.go',   'go'],
        ['internal/handlers/health.go', 'go'],
        ['internal/router/router.go',   'go'],
        ['internal/middleware/auth.go', 'go'],
        ['internal/handlers/admin.go',  'go'],
        ['internal/router/api.go',      'go'],
        ['internal/handlers/upload.go', 'go'],
      ],
      4:  [
        ['internal/db/db.go',           'go'],
        ['internal/models/user.go',     'go'],
        ['internal/models/item.go',     'go'],
        ['internal/db/migrations.go',   'go'],
        ['migrations/001_init.sql',     'sql'],
        ['migrations/002_users.sql',    'sql'],
        ['internal/repository/user.go', 'go'],
        ['internal/repository/item.go', 'go'],
        ['internal/db/seed.go',         'go'],
        ['migrations/003_items.sql',    'sql'],
      ],
      5:  [
        ['internal/auth/jwt.go',        'go'],
        ['internal/auth/password.go',   'go'],
        ['internal/middleware/auth.go', 'go'],
        ['internal/auth/oauth.go',      'go'],
        ['internal/auth/session.go',    'go'],
        ['internal/middleware/rate_limit.go','go'],
        ['internal/auth/permissions.go','go'],
        ['internal/middleware/cors.go', 'go'],
        ['internal/auth/tokens.go',     'go'],
        ['internal/auth/rbac.go',       'go'],
      ],
      6:  [
        ['internal/config/config.go',   'go'],
        ['internal/config/database.go', 'go'],
        ['internal/config/server.go',   'go'],
        ['internal/store/user_store.go','go'],
        ['internal/store/item_store.go','go'],
        ['internal/config/redis.go',    'go'],
        ['internal/store/cache.go',     'go'],
        ['internal/config/auth.go',     'go'],
        ['internal/store/session.go',   'go'],
        ['internal/config/app.go',      'go'],
      ],
      7:  [
        ['Dockerfile',                  'dockerfile'],
        ['docker-compose.yml',          'yaml'],
        ['.github/workflows/deploy.yml','yaml'],
        ['.github/workflows/test.yml',  'yaml'],
        ['nginx/nginx.conf',            'nginx'],
        ['scripts/start.sh',            'sh'],
        ['scripts/build.sh',            'sh'],
        ['render.yaml',                 'yaml'],
        ['Makefile',                    'makefile'],
        ['scripts/migrate.sh',          'sh'],
      ],
      8:  [
        ['go.mod',                      'go'],
        ['go.sum',                      'go'],
        ['.env.example',                'text'],
        ['.gitignore',                  'text'],
        ['.golangci.yml',               'yaml'],
        ['air.toml',                    'toml'],
        ['Makefile',                    'makefile'],
        ['.goreleaser.yml',             'yaml'],
        ['codecov.yml',                 'yaml'],
        ['sonar-project.properties',    'text'],
      ],
      9:  [
        ['internal/jobs/scheduler.go',  'go'],
        ['internal/jobs/email.go',      'go'],
        ['internal/jobs/cleanup.go',    'go'],
        ['internal/workers/pool.go',    'go'],
        ['internal/workers/processor.go','go'],
        ['internal/jobs/notifications.go','go'],
        ['internal/workers/queue.go',   'go'],
        ['internal/jobs/reports.go',    'go'],
        ['pkg/queue/redis_queue.go',    'go'],
        ['internal/jobs/backup.go',     'go'],
      ],
      10: [
        ['internal/metrics/metrics.go', 'go'],
        ['internal/logging/logger.go',  'go'],
        ['internal/admin/handlers.go',  'go'],
        ['internal/admin/middleware.go','go'],
        ['internal/metrics/health.go',  'go'],
        ['internal/logging/middleware.go','go'],
        ['internal/admin/routes.go',    'go'],
        ['internal/metrics/prometheus.go','go'],
        ['internal/tracing/tracer.go',  'go'],
        ['internal/admin/dashboard.go', 'go'],
      ],
      11: [
        ['tests/integration/auth_test.go',  'go'],
        ['tests/integration/user_test.go',  'go'],
        ['tests/unit/handlers_test.go',     'go'],
        ['tests/unit/models_test.go',       'go'],
        ['tests/unit/utils_test.go',        'go'],
        ['tests/helpers/fixtures.go',       'go'],
        ['tests/helpers/setup.go',          'go'],
        ['tests/integration/item_test.go',  'go'],
        ['tests/unit/auth_test.go',         'go'],
        ['tests/e2e/api_test.go',           'go'],
      ],
      12: [
        ['README.md',                   'md'],
        ['docs/API.md',                 'md'],
        ['docs/SETUP.md',               'md'],
        ['CONTRIBUTING.md',             'md'],
        ['docs/ARCHITECTURE.md',        'md'],
        ['docs/DEPLOYMENT.md',          'md'],
        ['CHANGELOG.md',                'md'],
        ['docs/CONFIGURATION.md',       'md'],
        ['docs/SECURITY.md',            'md'],
        ['docs/PERFORMANCE.md',         'md'],
      ],
      13: [
        ['internal/cache/redis.go',     'go'],
        ['internal/cache/memory.go',    'go'],
        ['internal/cache/strategies.go','go'],
        ['pkg/db/pool.go',              'go'],
        ['internal/utils/compress.go',  'go'],
        ['internal/cache/lru.go',       'go'],
        ['pkg/profiler/profiler.go',    'go'],
        ['internal/db/query_builder.go','go'],
        ['tests/bench/api_bench_test.go','go'],
        ['internal/utils/batch.go',     'go'],
      ],
      14: [
        ['internal/dto/user_dto.go',    'go'],
        ['internal/dto/item_dto.go',    'go'],
        ['internal/dto/response_dto.go','go'],
        ['openapi.yaml',                'yaml'],
        ['internal/validators/user.go', 'go'],
        ['internal/validators/item.go', 'go'],
        ['internal/dto/pagination.go',  'go'],
        ['internal/dto/auth_dto.go',    'go'],
        ['internal/validators/common.go','go'],
        ['internal/dto/error_dto.go',   'go'],
      ],
      15: [
        ['internal/seo/sitemap.go',     'go'],
        ['internal/seo/robots.go',      'go'],
        ['internal/seo/meta.go',        'go'],
        ['static/robots.txt',           'text'],
        ['static/sitemap.xml',          'xml'],
        ['internal/analytics/tracker.go','go'],
        ['internal/seo/schema.go',      'go'],
        ['internal/analytics/ga.go',    'go'],
        ['internal/seo/og.go',          'go'],
        ['internal/analytics/events.go','go'],
      ],
    };
    return pools[agentId] ?? defaultPool(agentId, lang);
  }

  // ── Luau / Roblox ─────────────────────────────────────────────────────────
  if (lang === 'luau') {
    const pools: Record<number, FileDef[]> = {
      1:  [
        ['src/StarterGui/MainGui.luau',           'luau'],
        ['src/StarterGui/HudGui.luau',            'luau'],
        ['src/StarterGui/MenuGui.luau',           'luau'],
        ['src/StarterGui/ShopGui.luau',           'luau'],
        ['src/StarterGui/InventoryGui.luau',      'luau'],
        ['src/StarterGui/NotificationGui.luau',   'luau'],
        ['src/StarterGui/LoadingGui.luau',        'luau'],
        ['src/StarterGui/SettingsGui.luau',       'luau'],
        ['src/StarterGui/LeaderboardGui.luau',    'luau'],
        ['src/StarterGui/ChatGui.luau',           'luau'],
      ],
      2:  [
        ['src/StarterPlayerScripts/LocalMain.luau',       'luau'],
        ['src/StarterPlayerScripts/CameraController.luau','luau'],
        ['src/StarterPlayerScripts/InputHandler.luau',    'luau'],
        ['src/StarterPlayerScripts/UIController.luau',    'luau'],
        ['src/StarterPlayerScripts/SoundController.luau', 'luau'],
        ['src/StarterPlayerScripts/ShopController.luau',  'luau'],
        ['src/StarterPlayerScripts/InventoryClient.luau', 'luau'],
        ['src/StarterPlayerScripts/AnimationClient.luau', 'luau'],
        ['src/StarterPlayerScripts/EffectsClient.luau',   'luau'],
        ['src/StarterPlayerScripts/NetworkClient.luau',   'luau'],
      ],
      3:  [
        ['src/ServerScriptService/Server.luau',           'luau'],
        ['src/ServerScriptService/DataHandler.luau',      'luau'],
        ['src/ServerScriptService/RemoteHandler.luau',    'luau'],
        ['src/ServerScriptService/PlayerHandler.luau',    'luau'],
        ['src/ServerScriptService/ShopHandler.luau',      'luau'],
        ['src/ServerScriptService/AdminHandler.luau',     'luau'],
        ['src/ServerScriptService/GameLoop.luau',         'luau'],
        ['src/ServerScriptService/MatchmakingServer.luau','luau'],
        ['src/ServerScriptService/EventHandler.luau',     'luau'],
        ['src/ServerScriptService/AntiCheat.luau',        'luau'],
      ],
      4:  [
        ['src/ServerScriptService/DataStore.luau',        'luau'],
        ['src/ServerScriptService/PlayerData.luau',       'luau'],
        ['src/ServerScriptService/SaveSystem.luau',       'luau'],
        ['src/ServerScriptService/LeaderboardData.luau',  'luau'],
        ['src/ServerScriptService/InventoryData.luau',    'luau'],
        ['src/ServerScriptService/CurrencyData.luau',     'luau'],
        ['src/ServerScriptService/SettingsData.luau',     'luau'],
        ['src/ServerScriptService/StatsData.luau',        'luau'],
        ['src/ServerScriptService/AchievementData.luau',  'luau'],
        ['src/ServerScriptService/ProfileService.luau',   'luau'],
      ],
      5:  [
        ['src/ServerScriptService/BanSystem.luau',        'luau'],
        ['src/ServerScriptService/Permissions.luau',      'luau'],
        ['src/ServerScriptService/AntiExploit.luau',      'luau'],
        ['src/ServerScriptService/KickSystem.luau',       'luau'],
        ['src/ServerScriptService/RateLimiter.luau',      'luau'],
        ['src/ServerScriptService/SpamFilter.luau',       'luau'],
        ['src/ServerScriptService/ReportSystem.luau',     'luau'],
        ['src/ServerScriptService/ModerationLog.luau',    'luau'],
        ['src/ServerScriptService/TeleportSecurity.luau', 'luau'],
        ['src/ServerScriptService/ValidationServer.luau', 'luau'],
      ],
      6:  [
        ['src/ReplicatedStorage/Modules/GameConfig.luau', 'luau'],
        ['src/ReplicatedStorage/Modules/Constants.luau',  'luau'],
        ['src/ReplicatedStorage/Modules/SharedState.luau','luau'],
        ['src/ReplicatedStorage/Modules/Events.luau',     'luau'],
        ['src/ReplicatedStorage/Modules/Remotes.luau',    'luau'],
        ['src/ReplicatedStorage/Modules/Types.luau',      'luau'],
        ['src/ReplicatedStorage/Modules/Config.luau',     'luau'],
        ['src/ReplicatedStorage/Modules/Enums.luau',      'luau'],
        ['src/ReplicatedStorage/Modules/Assets.luau',     'luau'],
        ['src/ReplicatedStorage/Modules/Globals.luau',    'luau'],
      ],
      7:  [
        ['README.md',                                     'md'],
        ['docs/SETUP.md',                                 'md'],
        ['docs/ARCHITECTURE.md',                          'md'],
        ['.github/workflows/test.yml',                    'yaml'],
        ['scripts/build.sh',                              'sh'],
        ['aftman.toml',                                   'toml'],
        ['selene.toml',                                   'toml'],
        ['stylua.toml',                                   'toml'],
        ['wally.toml',                                    'toml'],
        ['default.project.json',                          'json'],
      ],
      8:  [
        ['default.project.json',                          'json'],
        ['aftman.toml',                                   'toml'],
        ['wally.toml',                                    'toml'],
        ['wally.lock',                                    'toml'],
        ['selene.toml',                                   'toml'],
        ['stylua.toml',                                   'toml'],
        ['.darklua.json',                                 'json'],
        ['.gitignore',                                    'text'],
        ['Makefile',                                      'makefile'],
        ['.github/workflows/ci.yml',                      'yaml'],
      ],
      9:  [
        ['src/ReplicatedStorage/Modules/TweenHelper.luau','luau'],
        ['src/StarterPlayerScripts/Effects.luau',         'luau'],
        ['src/ReplicatedStorage/Modules/Particles.luau',  'luau'],
        ['src/StarterPlayerScripts/Animations.luau',      'luau'],
        ['src/ReplicatedStorage/Modules/Trails.luau',     'luau'],
        ['src/StarterPlayerScripts/ScreenEffects.luau',   'luau'],
        ['src/ReplicatedStorage/Modules/Billboard.luau',  'luau'],
        ['src/StarterPlayerScripts/CameraShake.luau',     'luau'],
        ['src/ReplicatedStorage/Modules/Highlight.luau',  'luau'],
        ['src/StarterPlayerScripts/Ragdoll.luau',         'luau'],
      ],
      10: [
        ['src/ServerScriptService/Logger.luau',           'luau'],
        ['src/ServerScriptService/Debugger.luau',         'luau'],
        ['src/ReplicatedStorage/Modules/ErrorHandler.luau','luau'],
        ['src/ServerScriptService/Analytics.luau',        'luau'],
        ['src/ServerScriptService/Metrics.luau',          'luau'],
        ['src/ReplicatedStorage/Modules/Reporter.luau',   'luau'],
        ['src/ServerScriptService/Performance.luau',      'luau'],
        ['src/ServerScriptService/Monitor.luau',          'luau'],
        ['src/ReplicatedStorage/Modules/Benchmark.luau',  'luau'],
        ['src/ServerScriptService/Dashboard.luau',        'luau'],
      ],
      11: [
        ['tests/ServerTests.luau',                        'luau'],
        ['tests/ClientTests.luau',                        'luau'],
        ['tests/DataStoreTests.luau',                     'luau'],
        ['tests/RemoteTests.luau',                        'luau'],
        ['tests/ModuleTests.luau',                        'luau'],
        ['tests/UtilTests.luau',                          'luau'],
        ['tests/AuthTests.luau',                          'luau'],
        ['tests/GameLoopTests.luau',                      'luau'],
        ['tests/UITests.luau',                            'luau'],
        ['tests/TestRunner.luau',                         'luau'],
      ],
      12: [
        ['README.md',                                     'md'],
        ['docs/ARCHITECTURE.md',                          'md'],
        ['docs/API.md',                                   'md'],
        ['docs/SETUP.md',                                 'md'],
        ['docs/REMOTES.md',                               'md'],
        ['docs/DATASTORE.md',                             'md'],
        ['CONTRIBUTING.md',                               'md'],
        ['docs/MODULES.md',                               'md'],
        ['CHANGELOG.md',                                  'md'],
        ['docs/EVENTS.md',                                'md'],
      ],
      13: [
        ['src/ReplicatedStorage/Modules/Cache.luau',      'luau'],
        ['src/ServerScriptService/MemoryOptimizer.luau',  'luau'],
        ['src/ReplicatedStorage/Modules/Pool.luau',       'luau'],
        ['src/ServerScriptService/GarbageCollector.luau', 'luau'],
        ['src/ReplicatedStorage/Modules/LazyLoader.luau', 'luau'],
        ['src/ServerScriptService/BatchProcessor.luau',   'luau'],
        ['src/ReplicatedStorage/Modules/Throttle.luau',   'luau'],
        ['src/ServerScriptService/StreamingOptimizer.luau','luau'],
        ['src/ReplicatedStorage/Modules/Memoize.luau',    'luau'],
        ['src/ServerScriptService/LODSystem.luau',        'luau'],
      ],
      14: [
        ['src/ReplicatedStorage/Modules/RemoteDefinitions.luau','luau'],
        ['src/ReplicatedStorage/Modules/NetworkManager.luau',   'luau'],
        ['src/ReplicatedStorage/Modules/Middleware.luau',       'luau'],
        ['src/ServerScriptService/RemoteRouter.luau',           'luau'],
        ['src/ReplicatedStorage/Modules/Schema.luau',           'luau'],
        ['src/ServerScriptService/APIGateway.luau',             'luau'],
        ['src/ReplicatedStorage/Modules/Validator.luau',        'luau'],
        ['src/ServerScriptService/Serializer.luau',             'luau'],
        ['src/ReplicatedStorage/Modules/Protocol.luau',         'luau'],
        ['src/ServerScriptService/RequestHandler.luau',         'luau'],
      ],
      15: [
        ['docs/GAME_OVERVIEW.md',                         'md'],
        ['docs/MONETIZATION.md',                          'md'],
        ['docs/ANALYTICS.md',                             'md'],
        ['docs/MARKETING.md',                             'md'],
        ['src/ServerScriptService/Analytics.luau',        'luau'],
        ['src/ServerScriptService/Monetization.luau',     'luau'],
        ['src/ServerScriptService/Telemetry.luau',        'luau'],
        ['docs/SEO.md',                                   'md'],
        ['src/ServerScriptService/ABTest.luau',           'luau'],
        ['src/ServerScriptService/UserResearch.luau',     'luau'],
      ],
    };
    return pools[agentId] ?? defaultPool(agentId, lang);
  }

  // ── DevOps / Infrastructure ───────────────────────────────────────────────
  if (lang === 'yaml' && framework === 'devops') {
    const pools: Record<number, FileDef[]> = {
      1:  [
        ['nginx/nginx.conf',            'nginx'],
        ['nginx/sites/app.conf',        'nginx'],
        ['nginx/ssl.conf',              'nginx'],
        ['nginx/security.conf',         'nginx'],
        ['traefik/traefik.yml',         'yaml'],
        ['traefik/dynamic.yml',         'yaml'],
        ['nginx/gzip.conf',             'nginx'],
        ['nginx/proxy.conf',            'nginx'],
        ['haproxy/haproxy.cfg',         'text'],
        ['nginx/cache.conf',            'nginx'],
      ],
      2:  [
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
      ],
      3:  [
        ['.github/workflows/deploy.yml',    'yaml'],
        ['.github/workflows/ci.yml',        'yaml'],
        ['.github/workflows/test.yml',      'yaml'],
        ['.github/workflows/release.yml',   'yaml'],
        ['.github/workflows/security.yml',  'yaml'],
        ['.github/workflows/lint.yml',      'yaml'],
        ['.github/workflows/staging.yml',   'yaml'],
        ['.github/workflows/rollback.yml',  'yaml'],
        ['.github/workflows/notify.yml',    'yaml'],
        ['.github/workflows/cleanup.yml',   'yaml'],
      ],
      4:  [
        ['docker-compose.yml',          'yaml'],
        ['docker-compose.prod.yml',     'yaml'],
        ['docker-compose.dev.yml',      'yaml'],
        ['docker-compose.test.yml',     'yaml'],
        ['Dockerfile',                  'dockerfile'],
        ['Dockerfile.prod',             'dockerfile'],
        ['Dockerfile.dev',              'dockerfile'],
        ['.dockerignore',               'text'],
        ['docker-compose.monitoring.yml','yaml'],
        ['docker-compose.db.yml',       'yaml'],
      ],
      5:  [
        ['terraform/main.tf',           'tf'],
        ['terraform/variables.tf',      'tf'],
        ['terraform/outputs.tf',        'tf'],
        ['terraform/provider.tf',       'tf'],
        ['terraform/modules/vpc/main.tf','tf'],
        ['terraform/modules/eks/main.tf','tf'],
        ['terraform/modules/rds/main.tf','tf'],
        ['terraform/modules/s3/main.tf', 'tf'],
        ['terraform/backend.tf',        'tf'],
        ['terraform/data.tf',           'tf'],
      ],
      6:  [
        ['k8s/namespace.yaml',          'yaml'],
        ['k8s/deployment.yaml',         'yaml'],
        ['k8s/service.yaml',            'yaml'],
        ['k8s/ingress.yaml',            'yaml'],
        ['k8s/configmap.yaml',          'yaml'],
        ['k8s/secret.yaml',             'yaml'],
        ['k8s/hpa.yaml',                'yaml'],
        ['k8s/pdb.yaml',                'yaml'],
        ['k8s/networkpolicy.yaml',      'yaml'],
        ['k8s/serviceaccount.yaml',     'yaml'],
      ],
      7:  [
        ['ansible/playbook.yml',        'yaml'],
        ['ansible/inventory/hosts.yml', 'yaml'],
        ['ansible/roles/app/tasks/main.yml','yaml'],
        ['ansible/roles/nginx/tasks/main.yml','yaml'],
        ['ansible/roles/db/tasks/main.yml',  'yaml'],
        ['ansible/group_vars/all.yml',  'yaml'],
        ['ansible/host_vars/prod.yml',  'yaml'],
        ['ansible/roles/app/handlers/main.yml','yaml'],
        ['ansible/roles/monitoring/tasks/main.yml','yaml'],
        ['ansible/roles/security/tasks/main.yml','yaml'],
      ],
      8:  [
        ['render.yaml',                 'yaml'],
        ['fly.toml',                    'toml'],
        ['railway.json',                'json'],
        ['vercel.json',                 'json'],
        ['.env.example',                'text'],
        ['.gitignore',                  'text'],
        ['Makefile',                    'makefile'],
        ['.pre-commit-config.yaml',     'yaml'],
        ['sonar-project.properties',    'text'],
        ['codecov.yml',                 'yaml'],
      ],
      9:  [
        ['prometheus/prometheus.yml',   'yaml'],
        ['grafana/dashboards/app.json', 'json'],
        ['grafana/dashboards/infra.json','json'],
        ['alertmanager/alertmanager.yml','yaml'],
        ['prometheus/rules/alerts.yml', 'yaml'],
        ['grafana/provisioning/datasources.yml','yaml'],
        ['prometheus/rules/recording.yml','yaml'],
        ['grafana/dashboards/db.json',  'json'],
        ['alertmanager/templates/email.tmpl','text'],
        ['prometheus/rules/slo.yml',    'yaml'],
      ],
      10: [
        ['scripts/monitor.sh',          'sh'],
        ['scripts/alert.sh',            'sh'],
        ['scripts/diagnostics.sh',      'sh'],
        ['scripts/log-analysis.sh',     'sh'],
        ['scripts/performance.sh',      'sh'],
        ['scripts/incident.sh',         'sh'],
        ['scripts/report.sh',           'sh'],
        ['scripts/trace.sh',            'sh'],
        ['scripts/profile.sh',          'sh'],
        ['scripts/debug.sh',            'sh'],
      ],
      11: [
        ['tests/smoke/health.sh',       'sh'],
        ['tests/load/k6-script.js',     'js'],
        ['tests/security/zap.yaml',     'yaml'],
        ['tests/integration/api.sh',    'sh'],
        ['tests/chaos/chaos-monkey.sh', 'sh'],
        ['tests/smoke/endpoints.sh',    'sh'],
        ['tests/load/artillery.yml',    'yaml'],
        ['tests/security/trivy.sh',     'sh'],
        ['tests/integration/db.sh',     'sh'],
        ['tests/chaos/network-failure.sh','sh'],
      ],
      12: [
        ['README.md',                   'md'],
        ['docs/ARCHITECTURE.md',        'md'],
        ['docs/DEPLOYMENT.md',          'md'],
        ['docs/RUNBOOK.md',             'md'],
        ['docs/DISASTER_RECOVERY.md',   'md'],
        ['docs/MONITORING.md',          'md'],
        ['docs/SCALING.md',             'md'],
        ['CONTRIBUTING.md',             'md'],
        ['docs/SECURITY.md',            'md'],
        ['docs/ONCALL.md',              'md'],
      ],
      13: [
        ['scripts/optimize-db.sh',      'sh'],
        ['scripts/cache-warmup.sh',     'sh'],
        ['nginx/cache.conf',            'nginx'],
        ['redis/redis.conf',            'text'],
        ['scripts/cdn-purge.sh',        'sh'],
        ['varnish/default.vcl',         'text'],
        ['scripts/compress-assets.sh',  'sh'],
        ['scripts/perf-test.sh',        'sh'],
        ['scripts/benchmark.sh',        'sh'],
        ['scripts/tune-kernel.sh',      'sh'],
      ],
      14: [
        ['api-gateway/kong.yml',        'yaml'],
        ['api-gateway/routes.yml',      'yaml'],
        ['api-gateway/plugins.yml',     'yaml'],
        ['openapi.yaml',                'yaml'],
        ['asyncapi.yaml',               'yaml'],
        ['api-gateway/rate-limit.yml',  'yaml'],
        ['api-gateway/auth.yml',        'yaml'],
        ['api-gateway/cors.yml',        'yaml'],
        ['api-gateway/logging.yml',     'yaml'],
        ['api-gateway/circuit-breaker.yml','yaml'],
      ],
      15: [
        ['docs/STATUS_PAGE.md',         'md'],
        ['scripts/uptime-check.sh',     'sh'],
        ['monitoring/synthetics.yml',   'yaml'],
        ['docs/SLA.md',                 'md'],
        ['scripts/seo-check.sh',        'sh'],
        ['monitoring/lighthouse-ci.yml','yaml'],
        ['docs/METRICS.md',             'md'],
        ['monitoring/web-vitals.yml',   'yaml'],
        ['scripts/accessibility.sh',    'sh'],
        ['docs/ANALYTICS.md',           'md'],
      ],
    };
    return pools[agentId] ?? defaultPool(agentId, lang);
  }

  // ── Next.js / React (default) ─────────────────────────────────────────────
  return defaultNextjsPool(agentId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Next.js pool (original behavior)
// ─────────────────────────────────────────────────────────────────────────────

function defaultNextjsPool(agentId: number): FileDef[] {
  const pools: Record<number, FileDef[]> = {
    1:  [
      ['src/components/ui/Button.tsx',       'tsx'],
      ['src/components/ui/Card.tsx',         'tsx'],
      ['src/components/ui/Modal.tsx',        'tsx'],
      ['src/components/ui/Input.tsx',        'tsx'],
      ['src/components/ui/Badge.tsx',        'tsx'],
      ['src/components/ui/Tooltip.tsx',      'tsx'],
      ['src/components/ui/Spinner.tsx',      'tsx'],
      ['src/components/ui/Avatar.tsx',       'tsx'],
      ['src/components/ui/Dropdown.tsx',     'tsx'],
      ['src/components/ui/Table.tsx',        'tsx'],
      ['src/styles/globals.css',             'css'],
      ['src/styles/animations.css',          'css'],
      ['src/styles/tokens.css',              'css'],
    ],
    2:  [
      ['src/components/layout/Header.tsx',   'tsx'],
      ['src/components/layout/Footer.tsx',   'tsx'],
      ['src/components/layout/Sidebar.tsx',  'tsx'],
      ['src/hooks/useDebounce.ts',           'ts'],
      ['src/hooks/useLocalStorage.ts',       'ts'],
      ['src/hooks/useMediaQuery.ts',         'ts'],
      ['src/hooks/useClickOutside.ts',       'ts'],
      ['src/hooks/useScrollPosition.ts',     'ts'],
      ['src/hooks/useWindowSize.ts',         'ts'],
      ['src/components/pages/Home.tsx',      'tsx'],
    ],
    3:  [
      ['src/app/api/chat/route.ts',          'ts'],
      ['src/app/api/auth/route.ts',          'ts'],
      ['src/app/api/users/route.ts',         'ts'],
      ['src/app/api/items/route.ts',         'ts'],
      ['src/app/api/health/route.ts',        'ts'],
      ['src/lib/api/client.ts',              'ts'],
      ['src/lib/api/fetcher.ts',             'ts'],
      ['src/middleware.ts',                  'ts'],
      ['src/app/api/upload/route.ts',        'ts'],
      ['src/app/api/search/route.ts',        'ts'],
    ],
    4:  [
      ['prisma/schema.prisma',               'prisma'],
      ['src/db/migrations/001_init.sql',     'sql'],
      ['src/db/migrations/002_users.sql',    'sql'],
      ['src/db/queries/users.ts',            'ts'],
      ['src/db/queries/items.ts',            'ts'],
      ['src/lib/db.ts',                      'ts'],
      ['src/lib/dbClient.ts',                'ts'],
      ['prisma/seed.ts',                     'ts'],
      ['src/db/repositories/UserRepository.ts','ts'],
      ['src/db/migrations/003_add_sessions.sql','sql'],
    ],
    5:  [
      ['src/lib/auth.ts',                    'ts'],
      ['src/lib/jwt.ts',                     'ts'],
      ['src/lib/rateLimit.ts',               'ts'],
      ['src/lib/oauth.ts',                   'ts'],
      ['src/lib/session.ts',                 'ts'],
      ['src/lib/encryption.ts',              'ts'],
      ['src/middleware/withAuth.ts',         'ts'],
      ['src/hooks/useAuth.ts',               'ts'],
      ['src/components/auth/LoginForm.tsx',  'tsx'],
      ['src/components/auth/RegisterForm.tsx','tsx'],
    ],
    6:  [
      ['src/store/appStore.ts',              'ts'],
      ['src/store/authStore.ts',             'ts'],
      ['src/store/uiStore.ts',               'ts'],
      ['src/selectors/index.ts',             'ts'],
      ['src/store/userStore.ts',             'ts'],
      ['src/store/projectStore.ts',          'ts'],
      ['src/store/notificationStore.ts',     'ts'],
      ['src/store/settingsStore.ts',         'ts'],
      ['src/store/initialState.ts',          'ts'],
      ['src/store/storeTypes.ts',            'ts'],
    ],
    7:  [
      ['.github/workflows/deploy.yml',       'yaml'],
      ['Dockerfile',                         'dockerfile'],
      ['docker-compose.yml',                 'yaml'],
      ['render.yaml',                        'yaml'],
      ['.github/workflows/ci.yml',           'yaml'],
      ['scripts/deploy.sh',                  'sh'],
      ['scripts/setup.sh',                   'sh'],
      ['nginx.conf',                         'nginx'],
      ['k8s/deployment.yaml',                'yaml'],
      ['k8s/service.yaml',                   'yaml'],
    ],
    8:  [
      ['next.config.ts',                     'ts'],
      ['tailwind.config.ts',                 'ts'],
      ['tsconfig.json',                      'json'],
      ['.eslintrc.js',                       'js'],
      ['.prettierrc',                        'json'],
      ['vitest.config.ts',                   'ts'],
      ['postcss.config.js',                  'js'],
      ['package.json',                       'json'],
      ['.gitignore',                         'text'],
      ['.env.example',                       'text'],
    ],
    9:  [
      ['src/components/canvas/AgentCanvas.tsx',  'tsx'],
      ['src/lib/animations.ts',              'ts'],
      ['src/components/video/VideoBackground.tsx','tsx'],
      ['src/lib/particles.ts',               'ts'],
      ['src/components/canvas/ParticleSystem.tsx','tsx'],
      ['src/hooks/useCanvas.ts',             'ts'],
      ['src/lib/motionVariants.ts',          'ts'],
      ['src/components/animations/FadeIn.tsx','tsx'],
      ['src/lib/easing.ts',                  'ts'],
      ['src/components/animations/Typewriter.tsx','tsx'],
    ],
    10: [
      ['src/components/dashboard/MainDashboard.tsx','tsx'],
      ['src/components/dashboard/StatsPanel.tsx',  'tsx'],
      ['src/lib/utils/debug.ts',             'ts'],
      ['src/lib/utils/helpers.ts',           'ts'],
      ['src/lib/utils/logger.ts',            'ts'],
      ['src/components/dashboard/ActivityFeed.tsx','tsx'],
      ['src/components/dashboard/LogViewer.tsx',   'tsx'],
      ['src/lib/utils/formatter.ts',         'ts'],
      ['src/components/dashboard/Timeline.tsx',    'tsx'],
      ['src/lib/utils/profiler.ts',          'ts'],
    ],
    11: [
      ['tests/api/auth.test.ts',             'ts'],
      ['tests/api/users.test.ts',            'ts'],
      ['tests/components/Button.test.tsx',   'tsx'],
      ['tests/store/appStore.test.ts',       'ts'],
      ['cypress/e2e/auth.cy.ts',             'ts'],
      ['tests/hooks/useDebounce.test.ts',    'ts'],
      ['tests/lib/jwt.test.ts',              'ts'],
      ['tests/setup.ts',                     'ts'],
      ['tests/mocks/handlers.ts',            'ts'],
      ['cypress/e2e/dashboard.cy.ts',        'ts'],
    ],
    12: [
      ['README.md',                          'md'],
      ['docs/API.md',                        'md'],
      ['docs/DEPLOY.md',                     'md'],
      ['CONTRIBUTING.md',                    'md'],
      ['docs/ARCHITECTURE.md',               'md'],
      ['docs/CONFIGURATION.md',              'md'],
      ['CHANGELOG.md',                       'md'],
      ['docs/AUTHENTICATION.md',             'md'],
      ['docs/DATABASE.md',                   'md'],
      ['docs/TESTING.md',                    'md'],
    ],
    13: [
      ['src/components/preview/PreviewCanvas.tsx','tsx'],
      ['src/lib/performance.ts',             'ts'],
      ['src/components/preview/CodeEditor.tsx',   'tsx'],
      ['src/hooks/useVirtual.ts',            'ts'],
      ['src/lib/codeHighlight.ts',           'ts'],
      ['src/lib/workers/formatWorker.ts',    'ts'],
      ['src/components/preview/FileTree.tsx','tsx'],
      ['src/lib/virtualScroller.ts',         'ts'],
      ['src/hooks/useSearch.ts',             'ts'],
      ['src/lib/codeAnalyze.ts',             'ts'],
    ],
    14: [
      ['openapi.yaml',                       'yaml'],
      ['src/lib/validators.ts',              'ts'],
      ['src/lib/schema.ts',                  'ts'],
      ['src/lib/zod/userSchema.ts',          'ts'],
      ['src/lib/zod/authSchema.ts',          'ts'],
      ['src/lib/zod/apiSchema.ts',           'ts'],
      ['graphql/schema.graphql',             'graphql'],
      ['graphql/resolvers.ts',               'ts'],
      ['src/lib/sanitize.ts',                'ts'],
      ['src/lib/typeGuards.ts',              'ts'],
    ],
    15: [
      ['src/app/sitemap.ts',                 'ts'],
      ['src/app/robots.ts',                  'ts'],
      ['src/lib/seo.ts',                     'ts'],
      ['src/lib/analytics.ts',               'ts'],
      ['src/lib/structuredData.ts',          'ts'],
      ['src/app/layout.tsx',                 'tsx'],
      ['src/lib/ogImage.ts',                 'ts'],
      ['src/app/manifest.ts',                'ts'],
      ['src/lib/webVitals.ts',               'ts'],
      ['src/lib/i18n.ts',                    'ts'],
    ],
  };
  return pools[agentId] ?? defaultPool(agentId, 'ts');
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic fallback pool for unsupported project types
// ─────────────────────────────────────────────────────────────────────────────

function defaultPool(agentId: number, lang: string): FileDef[] {
  const extMap: Record<number, string> = {
    1: lang,  2: lang,  3: lang,  4: 'sql',
    5: lang,  6: lang,  7: 'sh',  8: 'yaml',
    9: lang,  10: lang, 11: lang, 12: 'md',
    13: lang, 14: 'yaml', 15: 'md',
  };
  const dirMap: Record<number, string> = {
    1: 'src/ui',        2: 'src/utils',   3: 'src/api',
    4: 'db',            5: 'src/auth',    6: 'src/config',
    7: 'scripts',       8: 'config',      9: 'src/animations',
    10: 'src/dashboard',11: 'tests',      12: 'docs',
    13: 'src/preview',  14: 'src/schema', 15: 'src/seo',
  };
  const prefixMap: Record<number, string> = {
    1: 'component', 2: 'helper',   3: 'route',
    4: 'query',     5: 'auth',     6: 'config',
    7: 'script',    8: 'setup',    9: 'animation',
    10: 'panel',    11: 'test',    12: 'doc',
    13: 'preview',  14: 'schema',  15: 'seo',
  };

  const dir    = dirMap[agentId]    ?? 'src';
  const prefix = prefixMap[agentId] ?? 'file';
  const ext    = extMap[agentId]    ?? lang;

  return Array.from({ length: 15 }, (_, i) => [
    `${dir}/${prefix}_${i + 1}.${ext}`,
    ext,
  ] as FileDef);
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve unique filename from pool
// ─────────────────────────────────────────────────────────────────────────────

function resolveFilename(
  pool:      FileDef[],
  cursor:    number,
  usedPaths: Set<string>,
): { filename: string; ext: string; nextCursor: number } {
  for (let offset = 0; offset < pool.length; offset++) {
    const idx  = (cursor + offset) % pool.length;
    const [filename, ext] = pool[idx];
    if (!usedPaths.has(filename)) {
      return { filename, ext, nextCursor: idx + 1 };
    }
  }

  // All pool entries used — generate unique suffixed name
  const [baseName, baseExt] = pool[cursor % pool.length];
  const noExt = baseName.includes('.')
    ? baseName.slice(0, baseName.lastIndexOf('.'))
    : baseName;

  let counter = 2;
  while (true) {
    const candidate = `${noExt}_${counter}.${baseExt}`;
    if (!usedPaths.has(candidate)) {
      return { filename: candidate, ext: baseExt, nextCursor: cursor + 1 };
    }
    counter++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Strip accidental markdown fences
// ─────────────────────────────────────────────────────────────────────────────

function stripFences(raw: string): string {
  return raw
    .replace(/^```[\w]*\r?\n?/, '')
    .replace(/\r?\n?```$/, '')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Build file prompt
// ─────────────────────────────────────────────────────────────────────────────

function buildFilePrompt(
  projectDescription: string,
  filename:           string,
  ext:                string,
  agentName:          string,
  agentRole:          string,
): string {
  const LANG_NAMES: Record<string, string> = {
    py: 'Python', rs: 'Rust', go: 'Go', java: 'Java',
    cs: 'C#', cpp: 'C++', c: 'C', swift: 'Swift',
    kt: 'Kotlin', rb: 'Ruby', php: 'PHP',
    lua: 'Lua', luau: 'Luau (Roblox)', dart: 'Dart/Flutter',
    ts: 'TypeScript', tsx: 'React TypeScript (TSX)',
    js: 'JavaScript', jsx: 'React JavaScript (JSX)',
    sql: 'SQL', html: 'HTML', css: 'CSS', scss: 'SCSS',
    sh: 'Bash Shell Script', yaml: 'YAML', toml: 'TOML',
    json: 'JSON', md: 'Markdown', tf: 'Terraform HCL',
    dockerfile: 'Dockerfile', prisma: 'Prisma Schema',
    graphql: 'GraphQL Schema', sol: 'Solidity',
    nginx: 'Nginx Config', ini: 'INI Config',
    makefile: 'Makefile', text: 'Plain Text',
    xml: 'XML',
  };

  const langName = LANG_NAMES[ext] ?? ext.toUpperCase();

  return `You are ${agentName}, a ${agentRole}.

Project: ${projectDescription}

Generate the file: ${filename}
Language: ${langName}

STRICT RULES — violating any rule makes the output unusable:
1. Write ONLY the raw ${langName} file content. Nothing else.
2. Do NOT use markdown code fences (no backticks, no \`\`\`).
3. Do NOT write any explanation, comments about the task, or preamble.
4. Do NOT write "Here is the file" or "Sure!" or any introduction.
5. The code MUST be in ${langName} — not TypeScript, not JavaScript unless that IS the language.
6. Make the code production-ready, complete, and relevant to the project.
7. Use proper ${langName} conventions, imports, and error handling.
8. The file path is "${filename}" — name functions/classes accordingly.

Write the ${langName} file content now:`;
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

  const stop = useCallback(() => {
    stopRef.current = true;
    setIsGenerating(false);
    setActiveAgentId(null);
    setThinkingAgentId(null);
  }, [setIsGenerating, setActiveAgentId, setThinkingAgentId]);

  const start = useCallback(
    async (prompt: string, maxFiles = 50) => {
      stopRef.current = false;
      clearAll();
      setIsGenerating(true);
      setProgress(0);

      // ── Detect project type from prompt ──────────────────────────────────
      const projType = detectProjectType(prompt);

      // ── Model selection ──────────────────────────────────────────────────
      const groqModels = models.filter((m) => m.provider === 'groq');
      const orModels   = models.filter((m) => m.provider === 'openrouter');
      const allModels  = [...groqModels, ...orModels];
      const fallbackModel = {
        provider: 'openrouter' as const,
        id:       'meta-llama/llama-3.3-70b-instruct:free',
      };

      // ── Per-agent pool cursors ────────────────────────────────────────────
      const usedPaths   = new Set<string>();
      const poolCursors = new Map<number, number>();

      // ── Pre-build pools for all agents ───────────────────────────────────
      const agentPools = new Map<number, FileDef[]>();
      for (const agent of AGENTS) {
        agentPools.set(agent.id, getFilePool(agent.id, projType));
      }

      // ── Main loop ────────────────────────────────────────────────────────
      for (let i = 0; i < maxFiles; i++) {
        if (stopRef.current) break;

        const agent  = AGENTS[i % AGENTS.length];
        const pool   = agentPools.get(agent.id) ?? defaultPool(agent.id, projType.lang);
        const cursor = poolCursors.get(agent.id) ?? 0;

        const { filename, ext, nextCursor } = resolveFilename(pool, cursor, usedPaths);
        usedPaths.add(filename);
        poolCursors.set(agent.id, nextCursor);

        setActiveAgentId(agent.id);
        setThinkingAgentId(agent.id);
        setProgress(Math.round((i / maxFiles) * 100));

        let content = `// ${agent.name} — ${filename}\n// Generating…`;

        try {
          const modelForFile = allModels.length > 0
            ? allModels[i % allModels.length]
            : fallbackModel;

          const res = await fetch('/api/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider:  modelForFile.provider,
              model:     modelForFile.id,
              system:    agent.system,
              messages: [{
                role:    'user',
                content: buildFilePrompt(prompt, filename, ext, agent.name, agent.role),
              }],
              maxTokens: 1200,
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
          content = `# ${agent.name} error: ${err instanceof Error ? err.message : 'Unknown'}`;
        }

        setThinkingAgentId(null);
        if (stopRef.current) break;

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

        const snippet = content
          .split('\n')
          .find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('//'))
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