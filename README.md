# Dese MCP Server Builder

Enterprise platform for generating, testing, validating, deploying, and managing Model Context Protocol (MCP) servers.

## Architecture

```
dese-mcp-server-builder/
├── apps/
│   ├── api/          # NestJS backend (REST API, job queues, storage)
│   └── web/          # Next.js 15 dashboard
├── packages/
│   ├── shared/       # Shared types, Zod schemas, constants
│   ├── database/     # Prisma schema and client
│   ├── mcp-core/     # MCP validation and utilities
│   ├── generator-core/    # Generator plugin interfaces
│   └── generator-openapi/ # OpenAPI → MCP generator
```

### Key Design Decisions

- **Monorepo with Turborepo + pnpm** — Shared types flow from `@dese-mcp/shared` to all packages. Generators are pluggable via `GeneratorRegistry`.
- **Async generation pipeline** — BullMQ processes generation jobs; validation is a separate gate before export.
- **S3-compatible artifact storage** — Generated files stored in object storage (MinIO locally) for versioning and export.
- **Validation gate** — Projects cannot be exported until MCP compliance validation passes.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

## Quick Start

```bash
# Start infrastructure
docker compose up -d

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Generate Prisma client and push schema
pnpm db:generate
pnpm db:push

# Build packages
pnpm build

# Start development
pnpm dev
```

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:4000
- **API Docs:** http://localhost:4000/api/docs
- **MinIO Console:** http://localhost:9001

## Core Workflow

1. **Create Project** — Choose input source (OpenAPI fully supported in v0.1)
2. **Generate** — Async job produces tools, resources, prompts, TypeScript server code, tests, Docker config, and docs
3. **Validate** — MCP compliance checker runs schema, naming, auth, and uniqueness checks
4. **Export** — Download validated project as ZIP (TypeScript package, Docker project)

## Supported Input Sources

| Source | Status |
|--------|--------|
| OpenAPI | ✅ Implemented |
| GraphQL | 🔜 Planned |
| PostgreSQL | 🔜 Planned |
| MySQL | 🔜 Planned |
| SQLite | 🔜 Planned |
| MongoDB | 🔜 Planned |
| REST API | 🔜 Planned |
| Stripe | 🔜 Planned |
| GitHub | 🔜 Planned |
| TypeScript SDK | 🔜 Planned |
| Python Package | 🔜 Planned |
| Existing MCP | 🔜 Planned |

## Plugin System

Generators register via `GeneratorRegistry`:

```typescript
import { generatorRegistry } from '@dese-mcp/generator-core';
import { openApiGenerator } from '@dese-mcp/generator-openapi';

generatorRegistry.register(openApiGenerator);
```

Custom plugins can add input sources, deployment providers, validators, and exporters.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/organizations` | List organizations |
| POST | `/api/v1/organizations/:id/projects` | Create project |
| POST | `/api/v1/organizations/:id/projects/:id/generate` | Trigger generation |
| POST | `/api/v1/.../versions/:id/validate` | Validate version |
| POST | `/api/v1/.../versions/:id/export` | Export project |

## Development

```bash
pnpm dev          # Start all apps
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Lint
pnpm typecheck    # Type check
```

## License

MIT
