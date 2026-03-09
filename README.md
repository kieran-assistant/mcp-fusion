<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://site-assets.vinkius.com/vk/logo-v-black-square.png" width="80" height="80">
  <img src="https://site-assets.vinkius.com/vk/logo-v-black-square.png" style="border-radius:8px;background:#000000;padding:10px;border:1px solid #414141;" width="80" height="80" alt="Vurb.ts">
</picture>

# Vurb.ts

**The framework for AI-native MCP servers.**<br>
Type-safe tools, Presenters for LLM perception, governance lockfiles, and zero boilerplate.

[![npm version](https://img.shields.io/npm/v/vurb.svg?color=0ea5e9)](https://www.npmjs.com/package/vurb)
[![Downloads](https://img.shields.io/npm/dw/vurb)](https://www.npmjs.com/package/vurb)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP Standard](https://img.shields.io/badge/MCP-Standard-purple)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green)](LICENSE)

[Documentation](https://vurb.vinkius.com/) · [Quick Start](https://vurb.vinkius.com/quickstart-lightspeed) · [API Reference](https://vurb.vinkius.com/api/)

</div>

---

## Quick Start

```bash
npx Vurb.ts create my-server
cd my-server && Vurb.ts dev
```

14 files scaffolded in 6ms — file-based routing, Presenters, Prompts, middleware, Cursor integration, and tests. Ready to go.

## The MVA Pattern

<img width="994" height="224" alt="image" src="https://github.com/user-attachments/assets/c40e25d8-d748-4306-9f22-2c96465304cb" />


Vurb.ts separates three concerns that raw MCP servers mix into a single handler:

```
Model (Zod Schema) → View (Presenter) → Agent (LLM)
   validates            perceives          acts
```


The **handler** returns raw data. The **Presenter** shapes what the agent sees. The **middleware** governs access. Works with any MCP client — Cursor, Claude Desktop, Claude Code, Windsurf, Cline, VS Code + GitHub Copilot.

## Why Vurb.ts

- **Fluent API** — Semantic verbs (`f.query`, `f.mutation`, `f.action`) with type-chaining. Full IDE autocomplete in `.handle()` — zero manual interfaces.
- **Presenters** — Egress firewall for LLMs. Zod-validated schemas strip undeclared fields in RAM. JIT system rules, server-rendered UI, cognitive guardrails, and HATEOAS-style next actions.
- **Zero-Trust Sandbox** — V8 Isolate engine (`isolated-vm`). The LLM sends logic to your data instead of data to the LLM. Sealed execution — no `process`, `require`, `fs`, `net`.
- **File-Based Routing** — Drop a file in `src/tools/`, it becomes a tool. No central import file, no merge conflicts.
- **Testing** — In-memory pipeline testing without MCP transport. Schema validation, middleware, handler, presenter — all tested directly.
- **Governance** — Capability lockfile (`vurb.lock`), contract diffing, HMAC attestation, semantic probing, entitlement scanning, blast radius analysis.
- **State Sync** — RFC 7234-inspired cache-control for LLM agents. `invalidates()`, `cached()`, `stale()` — the agent knows whether its data is still valid.
- **Inspector** — Real-time terminal dashboard via Shadow Socket (IPC). Zero stdio interference. Live tool registry, traffic log, X-RAY deep inspection, Late Guillotine token metrics.
- **tRPC-Style Client** — Compile-time route validation with `InferRouter<typeof registry>`. Autocomplete for tool names, inputs, and responses.
- **Adapters** — Deploy to Vercel, Cloudflare Workers, or plain Node.js.

## Code Example

```typescript
import { initVurb } from 'Vurb.ts';

type AppContext = { db: PrismaClient; user: User };
const f = initVurb<AppContext>();

// Define a tool with one line
export default f.query('system.health')
    .describe('Returns server operational status')
    .returns(SystemPresenter)
    .handle(async (_, ctx) => ({
        status: 'healthy',
        uptime: process.uptime(),
        version: '1.0.0',
    }));
```

```typescript
// Presenter — the egress firewall
const SystemPresenter = createPresenter('System')
    .schema({
        status:  t.enum('healthy', 'degraded', 'down'),
        uptime:  t.number.describe('Seconds since boot'),
        version: t.string,
    })
    .rules(['Version follows semver. Compare with latest to suggest updates.']);
```

```typescript
// Self-healing errors — the LLM can recover
return f.error('NOT_FOUND', `Project "${input.id}" not found`)
    .suggest('Use projects.list to find valid IDs')
    .actions('projects.list', 'projects.search');
```

> **Full guide**: [Vurb.ts.vinkius.com/building-tools](https://vurb.vinkius.com/building-tools)

## Inspector — Real-Time Dashboard

```bash
npx Vurb.ts inspect        # Auto-discover and connect
npx Vurb.ts inspect --demo  # Built-in simulator
```

```
┌──────────────────────────────────────────────────────────────┐
│  ● LIVE: PID 12345  │  RAM: [█████░░░] 28MB  │  UP: 01:23  │
├───────────────────────┬──────────────────────────────────────┤
│  TOOL LIST            │  X-RAY: billing.create_invoice       │
│  ✓ billing.create     │   LATE GUILLOTINE:                   │
│  ✓ billing.get        │    DB Raw  : 4.2KB                   │
│  ✗ users.delete       │    Wire    : 1.1KB                   │
│  ✓ system.health      │    SAVINGS : ████████░░ 73.8%        │
├───────────────────────┴──────────────────────────────────────┤
│  19:32:01  ROUTE  billing.create    │  19:32:01  EXEC  ✓ 45ms│
└──────────────────────────────────────────────────────────────┘
```

Connects via **Shadow Socket** (Named Pipe / Unix Domain Socket) — no stdio interference, no port conflicts.

> **Docs**: [Vurb.ts.vinkius.com/inspector](https://vurb.vinkius.com/inspector)

## Ecosystem

### Adapters

| Package | Target |
|---|---|
| [`Vurb.ts-vercel`](https://vurb.vinkius.com/vercel-adapter) | Vercel Functions (Edge / Node.js) |
| [`Vurb.ts-cloudflare`](https://vurb.vinkius.com/cloudflare-adapter) | Cloudflare Workers — zero polyfills |

### Generators & Connectors

| Package | Source |
|---|---|
| [`Vurb.ts-openapi-gen`](https://vurb.vinkius.com/openapi-gen) | Generate typed tools from OpenAPI 3.x specs |
| [`Vurb.ts-prisma-gen`](https://vurb.vinkius.com/prisma-gen) | Generate CRUD tools from Prisma schemas |
| [`Vurb.ts-n8n`](https://vurb.vinkius.com/n8n-connector) | Auto-discover n8n workflows as tools |
| [`Vurb.ts-aws`](https://vurb.vinkius.com/aws-connector) | Auto-discover AWS Lambda & Step Functions |
| [`Vurb.ts-oauth`](https://vurb.vinkius.com/oauth) | RFC 8628 Device Flow authentication |
| [`Vurb.ts-jwt`](https://vurb.vinkius.com/jwt) | JWT verification — HS256/RS256/ES256 + JWKS |
| [`Vurb.ts-api-key`](https://vurb.vinkius.com/api-key) | API key validation with timing-safe comparison |
| [`Vurb.ts-testing`](https://vurb.vinkius.com/testing) | In-memory pipeline testing |
| [`mcp-Vurb.ts-inspector`](https://vurb.vinkius.com/inspector) | Real-time terminal dashboard |

## Documentation

Full guides, API reference, and cookbook recipes:

**[Vurb.ts.vinkius.com](https://vurb.vinkius.com/)**

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and PR guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[Apache 2.0](LICENSE)
