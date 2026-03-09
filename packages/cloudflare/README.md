<p align="center">
  <h1 align="center">@vurb/cloudflare</h1>
  <p align="center">
    <strong>Cloudflare Workers Adapter</strong> — Deploy Vurb.ts servers to the edge with zero config
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@vurb/cloudflare"><img src="https://img.shields.io/npm/v/@vurb/cloudflare?color=blue" alt="npm" /></a>
  <a href="https://github.com/vinkius-labs/vurb.ts/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node" />
</p>

---

> Cloudflare Workers adapter for Vurb.ts. Deploys your MCP server to the edge — stateless JSON-RPC, cold-start caching, native env injection, zero polyfills.

## Quick Start

```typescript
// src/index.ts (Cloudflare Worker)
import { createCloudflareHandler } from '@vurb/cloudflare';
import { registry } from './registry.js';

export default {
    async fetch(req: Request, env: Env): Promise<Response> {
        const handler = createCloudflareHandler(registry, {
            contextFactory: () => ({
                db: env.DB,
                kv: env.KV_STORE,
            }),
        });
        return handler(req);
    },
};
```

## Features

| Feature | Description |
|---------|-------------|
| **Zero Polyfills** | Built for the WinterCG runtime, no Node.js shims |
| **Stateless JSON-RPC** | Each request is a standalone invocation, ideal for edge |
| **Cold-Start Caching** | Registry and Zod schemas compiled once per isolate |
| **Native Bindings** | Access KV, D1, R2, and Durable Objects via context |
| **Wrangler Ready** | Deploy with `wrangler deploy` |

## With D1 Database

```typescript
const handler = createCloudflareHandler(registry, {
    contextFactory: (env) => ({
        db: env.DB,          // D1 binding
        cache: env.KV_CACHE, // KV binding
        role: 'ADMIN',
    }),
});
```

## Installation

```bash
npm install @vurb/cloudflare
```

### Peer Dependencies

| Package | Version |
|---------|---------|
| `Vurb.ts` | `^2.0.0` |
| `@modelcontextprotocol/sdk` | `^1.12.0` |

## Requirements

- **Cloudflare Workers** (WinterCG runtime)
- **Vurb.ts** ≥ 2.0.0 (peer dependency)
- `wrangler` CLI for deployment

## License

[Apache-2.0](https://github.com/vinkius-labs/vurb.ts/blob/main/LICENSE)
