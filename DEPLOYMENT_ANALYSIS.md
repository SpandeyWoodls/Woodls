# Woodls Deployment Infrastructure Analysis

## 1. DOCKERFILE ANALYSIS

### Current Setup

- **Base Image**: `node:22-bookworm` (Debian-based, ~1.3GB)
- **Multi-stage**: No, single stage (monolithic approach)
- **Build Tools**: Bun + pnpm (requires both, adds complexity)

### Build Process

```dockerfile
1. Install Node 22 + Bun
2. Enable corepack for pnpm
3. Install optional APT packages (WOODLS_DOCKER_APT_PACKAGES arg)
4. Copy package files + pnpm-lock
5. pnpm install --frozen-lockfile
6. Optional browser install (Playwright + Chromium, ~300MB)
7. Copy source + run pnpm build + pnpm ui:build
8. Run as non-root 'node' user
```

### Optimization Opportunities

- **Multi-stage build**: Separate builder stage from runtime (can reduce final image 20-30%)
- **Base image**: Consider Alpine (node:22-alpine) for smaller footprint (~400MB vs 1.3GB)
- **Dependencies cleanup**: Remove build-time-only deps before final stage
- **Layer caching**: Move large expensive operations after less-changing files
- **Bun redundancy**: Choose one package manager (Bun OR pnpm, not both)

### Current Issues

- Browser installation (~300MB) only when explicitly requested with build arg
- No build cache optimization (pnpm install happens early with all source changes)
- APT packages cleaned up but node_modules not stripped of dev deps

### Environment Variables Used

- `WOODLS_DOCKER_APT_PACKAGES` - Optional extra system packages
- `WOODLS_INSTALL_BROWSER` - Browser automation flag
- `WOODLS_PREFER_PNPM` - Force pnpm for UI build (workaround for ARM/Synology)
- `NODE_ENV=production` - Set in runtime

---

## 2. DOCKER-COMPOSE ANALYSIS

### Services Defined

1. **woodls-gateway** (primary service)
   - Image: `${WOODLS_IMAGE:-woodls:local}`
   - Ports: 18789 (gateway), 18790 (bridge)
   - Bind: `${WOODLS_GATEWAY_BIND:-lan}` (defaults to LAN)
   - Restart: `unless-stopped`

2. **woodls-cli** (interactive CLI)
   - Same image
   - stdin/tty enabled for interactive use
   - Shares config/workspace with gateway

### Volume Mounts

- `${WOODLS_CONFIG_DIR}:/home/node/.woodls` - Config state
- `${WOODLS_WORKSPACE_DIR}:/home/node/.woodls/workspace` - Working files

### Environment Variables Passed

- `HOME`, `TERM`
- `WOODLS_GATEWAY_TOKEN` (auth)
- `CLAUDE_AI_SESSION_KEY`, `CLAUDE_WEB_SESSION_KEY`, `CLAUDE_WEB_COOKIE` (auth)

### Issues/Limitations

- No health checks defined
- No resource limits (memory, CPU)
- Bridge port (18790) exposed but no bridge service definition
- Two separate services sharing state could cause contention
- No service dependencies declared

---

## 3. FLY.IO CONFIGURATION

### Current Setup (fly.toml)

```
app = "woodls"
primary_region = "iad" (Eastern US)
build:
  - Uses Dockerfile as-is
processes:
  - app: node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan
vm:
  - shared-cpu-2x (2 vCPU)
  - 2048MB RAM
mounts:
  - source: woodls_data, destination: /data
```

### TLS/HTTPS

- `force_https = true` - Auto-redirects HTTP to HTTPS
- Auto-generated certificates (via Fly.io)
- No custom certificate configuration

### Scaling Configuration

- `auto_stop_machines = false` (keeps running for persistent connections)
- `auto_start_machines = true` (auto-restart on demand)
- `min_machines_running = 1`

### Port Mapping

- Internal port 3000 → External via Fly.io
- Note: docker-compose uses 18789, fly.toml uses 3000 (inconsistency!)

### Issues/Limitations

- **Port mismatch**: Docker uses 18789/18790, Fly.io hardcoded to 3000
- **State directory**: Uses `/data` mount, not `~/.woodls` (must reconcile)
- **No multi-region**: Single region setup, no failover
- **Memory**: 2048MB shared for all processes
- **No scaling beyond 1 machine**: `min_machines_running = 1` locks to single instance

---

## 4. SYSTEMD SERVICE (woodls-auth-monitor.service)

### Purpose

- Monitor Woodls auth token expiry
- Send notifications before expiration

### Configuration

- Type: `oneshot` (runs once on schedule)
- ExecStart: `/home/admin/woodls/scripts/auth-monitor.sh`
- Environment vars: `WARN_HOURS=2`
- Optional: `NOTIFY_PHONE`, `NOTIFY_NTFY` for alerts

### Issues

- **Hardcoded paths**: `/home/admin/woodls/` not portable
- **No timer unit**: `oneshot` type needs accompanying .timer file to run periodically
- **No error handling**: Missing `OnFailure=` or restart behavior

---

## 5. LAUNCHD/MACOS (not found in codebase)

- No macOS launch agent configuration discovered
- Would need custom `.plist` files for background service
- Opportunity for expansion

---

## 6. ENVIRONMENT VARIABLES - COMPLETE LIST

### Gateway Configuration

- `WOODLS_GATEWAY_PORT` (default: 18789)
- `WOODLS_GATEWAY_BIND` (loopback|lan|auto|custom|tailnet, default: loopback)
- `WOODLS_GATEWAY_TOKEN` (auth token)
- `WOODLS_GATEWAY_PASSWORD` (auth password)
- `WOODLS_GATEWAY_URL` (public URL)
- `WOODLS_GATEWAY_LOCK` (lock file path)

### Bridge Configuration

- `WOODLS_BRIDGE_PORT` (default: 18790)
- `WOODLS_BRIDGE_HOST`
- `WOODLS_BRIDGE_ENABLED` (on/off)

### Browser Automation

- `WOODLS_BROWSER_ENABLED`
- `WOODLS_BROWSER_CDP_PORT`
- `WOODLS_BROWSER_VNC_PORT`
- `WOODLS_BROWSER_NOVNC_PORT`
- `WOODLS_BROWSER_CONTROL_MODULE`
- `WOODLS_BROWSER_HEADLESS` (true/false)
- `WOODLS_BROWSER_PROFILE_NAME`

### State & Configuration Paths

- `WOODLS_STATE_DIR` (default: ~/.woodls)
- `WOODLS_CONFIG_DIR` (default: WOODLS_STATE_DIR)
- `WOODLS_CONFIG_PATH` (default: WOODLS_STATE_DIR/woodls.json)
- `WOODLS_WORKSPACE_DIR` (default: WOODLS_STATE_DIR/workspace)
- `WOODLS_HOME` (override for home dir)
- `WOODLS_TMP_DIR`

### Build & Docker

- `WOODLS_DOCKER_APT_PACKAGES` (extra packages for build)
- `WOODLS_INSTALL_BROWSER` (pre-install Playwright)
- `WOODLS_PREFER_PNPM` (force pnpm over Bun for UI)
- `WOODLS_IMAGE` (docker-compose image name)
- `WOODLS_IMAGE_BACKEND` (backend image)

### AI Provider Keys

- `WOODLS_LIVE_ANTHROPIC_KEY` / `WOODLS_LIVE_ANTHROPIC_KEYS`
- `WOODLS_LIVE_OPENAI_KEY`
- `WOODLS_LIVE_GEMINI_KEY`
- `AI_GATEWAY_API_KEY`

### Control UI

- `WOODLS_CONTROL_UI_BASE_PATH` (default: /)
- `WOODLS_CONTROL_UI_ROOT` (filesystem root for UI assets)

### Security & Auth

- `WOODLS_GATEWAY_PASSWORD`
- `WOODLS_GATEWAY_TOKEN`
- Plus channel-specific auth (Telegram, Slack, Discord, etc.)

### Discovery & Networking

- `WOODLS_MDNS_HOSTNAME`
- `WOODLS_TAILNET_DNS`
- `WOODLS_WIDE_AREA_DOMAIN`
- `WOODLS_DISABLE_BONJOUR`

### Testing & Development

- `WOODLS_TEST_ENV`, `WOODLS_TEST_CONSOLE`, `WOODLS_TEST_WORKERS`
- `WOODLS_LIVE_` prefixed vars for live model testing
- `WOODLS_E2E_MODELS`, `WOODLS_E2E_VERBOSE`

### Other

- `WOODLS_BUNDLED_VERSION`, `WOODLS_VERSION`
- `WOODLS_NIX_MODE` (Nix integration)
- `WOODLS_WATCH_MODE`, `WOODLS_WATCH_COMMAND`
- `NODE_ENV` (production/development)
- `NODE_OPTIONS` (e.g., `--max-old-space-size=1536`)

**Total: 150+ environment variables** - massive configuration surface area!

---

## 7. STATE DIRECTORY STRUCTURE (~/.woodls/)

### Directory Resolution (src/config/paths.ts)

```
Order of precedence:
1. WOODLS_STATE_DIR env var
2. WOODLS_HOME / ~/.woodls (new default)
3. Legacy dirs: ~/.woodls-legacy (migrated automatically)
```

### Default Paths

- **State Dir**: `~/.woodls` (or WOODLS_STATE_DIR)
- **Config File**: `~/.woodls/woodls.json` (or WOODLS_CONFIG_PATH)
- **Lock Dir**: `/tmp/woodls-<uid>` (temporary)
- **OAuth Storage**: `~/.woodls/credentials/oauth.json`
- **Workspace**: `~/.woodls/workspace/` (agent working directory)
- **Canvas**: `~/.woodls/workspace/canvas/` (file serving)
- **Sessions**: `~/.woodls/sessions/` (JSONL session logs)
- **Settings**: `~/.woodls/settings/` (voicewake.json, etc.)
- **Media**: `~/.woodls/media/` (cached downloads, etc.)

### Storage Organization

```
~/.woodls/
├── woodls.json                      # Main config (JSON5)
├── credentials/
│   └── oauth.json                   # OAuth tokens for integrations
├── sessions/
│   ├── sess-<id>.jsonl             # Per-session message logs
│   └── ...
├── settings/
│   ├── voicewake.json              # Voice wake settings
│   └── ...
├── workspace/
│   ├── canvas/                      # Canvas file serving root
│   └── <agent-dirs>/               # Per-agent working dirs
├── media/
│   └── <cache-files>/              # Downloaded media, embeddings
└── logs/                            # (if enabled)
```

### Issues

- No `.gitignore` pattern defined in codebase (manual sync required)
- Credentials in plain JSON (no encryption at rest)
- Session logs accumulate indefinitely (backup/pruning needed)
- No atomic writes for config (potential corruption on crash)

---

## 8. CONFIG FILE FORMAT & SCHEMA

### Format: JSON5

- `~/.woodls/woodls.json`
- Supports comments, trailing commas, unquoted keys
- **Validation**: Zod schemas in `src/config/zod-schema.*.ts`

### Config Structure (Top-Level Keys)

```typescript
{
  // Global system settings
  woodls?: {
    hideControlUi?: boolean;
    disableBonjour?: boolean;
    agentConcurrentDefaults?: { ... };
  };

  // Gateway server settings
  gateway?: {
    port?: number;                    // Default: 18789
    bind?: "loopback" | "lan" | "auto" | "custom" | "tailnet";  // Default: loopback
    customBindHost?: string;
    auth?: { mode: "token" | "password" | "trusted-proxy"; token?: string; password?: string; };
    tls?: { enabled?: boolean; autoGenerate?: boolean; certPath?: string; keyPath?: string; caPath?: string; };
    controlUi?: { enabled?: boolean; basePath?: string; root?: string; allowedOrigins?: []; };
    tailscale?: { mode: "off" | "serve" | "funnel"; };
    trustedProxies?: string[];
    http?: { endpoints?: { chatCompletions?: { enabled?: boolean; }; responses?: { enabled?: boolean; }; }; };
  };

  // AI model providers & routing
  models?: { ... };
  agents?: [ ... ];

  // Channel integrations
  channels?: { ... };

  // Browser automation
  browser?: { enabled?: boolean; ... };

  // Canvas (file serving)
  canvasHost?: { enabled?: boolean; port?: number; root?: string; };

  // Hooks, plugins, tools
  hooks?: { modulePaths?: string[]; };
  plugins?: [ ... ];
  tools?: { alsoAllow?: string[]; ... };

  // Other
  talk?: { voiceId?: string; apiKey?: string; ... };
  discovery?: { mdns?: { mode?: "off" | "minimal" | "full"; }; wideArea?: { domain?: string; }; };
}
```

### Schema Files

- `zod-schema.core.ts` - Main gateway config
- `zod-schema.agent-*.ts` - Agent defaults & runtime
- `zod-schema.providers-core.ts` - AI provider routing (massive: 37KB)

### Validation & Defaults

- Strict validation via Zod
- Defaults in `src/config/defaults.ts` (12.4KB)
- UI hints in `src/config/schema.hints.ts`

### Issues

- Config is loaded from disk on each CLI call (no in-memory cache unless WOODLS_CONFIG_CACHE_MS set)
- Large provider routing config (~37KB) adds memory overhead
- No config versioning/migration docs for upgrades
- Complex nested structure hard to manage manually

---

## 9. PORT CONFIGURATION

### Default Ports

- **18789** - Gateway HTTP server (CLI, Control UI, API)
- **18790** - Bridge server (peer-to-peer tunneling)
- **18793** - Canvas Host (file serving, live-reload)
- **3000** - Fly.io deployment (override)

### Port Assignment Strategy

- All hardcoded (no dynamic allocation)
- No port conflict detection
- Can be overridden via env vars or config

### Issues

- **Port mismatch**: Docker-compose (18789) vs Fly.io (3000) inconsistency
- **No conflict detection**: Running multiple instances on same host causes port conflicts
- **No port binding fallback**: If port unavailable, process fails (no retry logic)

---

## 10. TLS/HTTPS SETUP

### Configuration (src/config/types.gateway.ts)

```typescript
gateway.tls?: {
  enabled?: boolean;                 // Enable TLS (default: auto)
  autoGenerate?: boolean;            // Self-signed cert if missing (default: true)
  certPath?: string;                 // Path to PEM certificate
  keyPath?: string;                  // Path to PEM private key
  caPath?: string;                   // Optional CA bundle for mTLS
}
```

### Auto-Generation

- Self-signed certificates auto-generated if missing
- No CA certificate validation by default
- Suitable for internal deployment

### Fly.io Integration

- Fly.io auto-generates certificates (via Let's Encrypt)
- `force_https = true` in fly.toml
- Custom domain support available

### Issues

- Self-signed certs cause browser warnings
- No automatic renewal for self-hosted deployments
- No mTLS documentation or examples
- Certificate paths must be explicitly provided

---

## 11. DEPLOYMENT PLATFORMS

### Currently Supported

1. **Docker** (via Dockerfile + docker-compose.yml)
2. **Fly.io** (via fly.toml)
3. **Systemd** (auth monitor service only)
4. **Local/Development** (node CLI directly)

### Not Yet Supported

- Kubernetes (no Helm charts, no manifests)
- AWS/Lambda (no serverless support)
- macOS (no launchd plist)
- Windows (no service wrapper)

---

## 12. ENVIRONMENT VARIABLE NAMING INCONSISTENCIES

### Current: WOODLS\_\*

All 150+ variables use `WOODLS_` prefix

### Breaking Changes for Woodls Rebranding

Every env var would need renaming:

- `WOODLS_` → `WOODLS_`
- Examples:
  - `WOODLS_GATEWAY_PORT` → `WOODLS_GATEWAY_PORT`
  - `WOODLS_STATE_DIR` → `WOODLS_STATE_DIR`
  - `WOODLS_CONFIG_PATH` → `WOODLS_CONFIG_PATH`
  - Etc. (150+ renames)

### Backward Compatibility Options

1. **Hard break**: Drop WOODLS\_ entirely (simplest, fastest)
2. **Graceful fallback**: Accept both WOODLS* and WOODLS* (complex)
3. **Deprecation period**: Support both with warnings (slowest)

**Recommendation**: Hard break (option 1) - Woodls is a distinct product fork

---

## DEPLOYMENT SUMMARY TABLE

| Aspect            | Current              | Woodls Needs          | Effort |
| ----------------- | -------------------- | --------------------- | ------ |
| Docker Base Image | node:22-bookworm     | Alpine or slim        | LOW    |
| Multi-stage Build | No                   | Yes (optimize size)   | LOW    |
| Package Manager   | Bun + pnpm           | Choose one            | LOW    |
| Default Port      | 18789 (inconsistent) | Standardize (3000?)   | LOW    |
| State Directory   | ~/.woodls            | ~/.woodls             | MEDIUM |
| Env Var Prefix    | WOODLS\_ (150+)      | WOODLS\_              | MEDIUM |
| Config File       | woodls.json          | woodls.json           | MEDIUM |
| TLS               | Self-signed          | Fly.io auto           | LOW    |
| Health Checks     | None                 | Add to docker-compose | LOW    |
| Resource Limits   | None                 | Add to docker-compose | LOW    |
| Setup Wizard      | None                 | Web-based UI          | HIGH   |
| Kubernetes        | Not supported        | Consider Helm         | MEDIUM |

---

## RECOMMENDATIONS FOR WOODLS MIGRATION

### Phase 1: Minimal Changes (1-2 weeks)

1. **Rename config/env vars**: All WOODLS* → WOODLS*
2. **Update paths**: ~/.woodls (already done)
3. **Update filenames**: woodls.json (already done)
4. **Port cleanup**: Standardize on 3000 (docker-compose + fly.toml)
5. **Docker optimization**: Add multi-stage build, Alpine base

### Phase 2: Deployment UX (2-4 weeks)

1. **One-command setup**: `woodls setup` or `docker run woodls:latest`
2. **Health checks**: Add liveness/readiness probes
3. **Resource limits**: Set memory/CPU in docker-compose
4. **Web setup wizard**: Interactive config UI (not just CLI)
5. **Systemd service generator**: Auto-create service files

### Phase 3: Multi-Platform (4-8 weeks)

1. **Kubernetes**: Create Helm chart (optional)
2. **macOS**: Create launchd plist generator
3. **Windows**: Create service wrapper
4. **Cloud**: AWS/Azure deployment guides

### Minimum Config for Launch

```json
{
  "gateway": {
    "auth": {
      "password": "required-for-security"
    }
  }
}
```

All other settings can use defaults.

---

## CRITICAL FINDINGS

1. **Port Inconsistency**: Docker-compose (18789) ≠ Fly.io (3000) → Fix before launch
2. **150+ Env Vars**: Massive configuration surface → Document, simplify, or hide behind wizard
3. **No Health Checks**: docker-compose missing health checks → Add liveness/readiness
4. **State Directory**: `.woodls` hardcoded everywhere → Global rename needed
5. **No Multi-stage Build**: Docker image larger than necessary → Optimize for faster deploys
6. **Credentials in Plain JSON**: No encryption at rest → Document security implications
7. **Config Cache Missing**: Config loaded on every CLI call → Performance concern for frequent ops
8. **No Error Recovery**: systemd service missing restart behavior → Add On-Failure handling
