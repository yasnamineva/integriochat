# AI Chatbot SaaS Platform

A multi-tenant SaaS platform that lets you create, deploy, and monetise AI-powered chatbots for small businesses.

---

## What it does

Each business (tenant) gets their own isolated chatbot that can be:

- **Trained on their website content** — pages are scraped, chunked, and stored as vector embeddings so the bot answers questions grounded in real business data.
- **Embedded on any website** — clients add a single `<script>` tag to their site. A floating chat button appears in the bottom-right corner, powered by a Shadow DOM widget with no style conflicts.
- **Demoed before signing up** — you generate an expiring demo link for a prospect. They click it, try the bot, no account required.
- **Managed from a dashboard** — create bots, view chat logs, generate demo links, check subscription status.
- **Billed via Stripe** — monthly subscriptions with trial periods. Chatbots are automatically disabled if a subscription lapses.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Vercel (hosting)                  │
│                                                      │
│  ┌───────────────────────────────────────────────┐   │
│  │           apps/web  (Next.js 14)              │   │
│  │                                               │   │
│  │  App Router pages   API routes (REST)         │   │
│  │  ─────────────────  ──────────────────────    │   │
│  │  /login             POST /api/chat            │   │
│  │  /dashboard/*       GET|POST /api/chatbots    │   │
│  │  /demo/[token]      GET /api/demo/[token]     │   │
│  │                     POST /api/stripe/webhook  │   │
│  │                     GET|POST /api/tenants     │   │
│  └────────────────────────┬──────────────────────┘   │
│                           │                          │
│  ┌────────────────────────▼──────────────────────┐   │
│  │           apps/widget  (vanilla TS)            │   │
│  │   Bundled to a single dist/widget.js           │   │
│  │   Shadow DOM • floating button • chat panel    │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     Supabase DB       OpenAI API      Stripe API
   (PostgreSQL +      Embeddings +    Subscriptions
     pgvector)        Chat stream     & Webhooks
```

### Monorepo packages

| Package | Purpose |
|---|---|
| `apps/web` | Next.js frontend + all API routes |
| `apps/widget` | Self-contained embeddable chat widget (no framework, Shadow DOM) |
| `packages/db` | Prisma schema, PrismaClient singleton, tenant isolation middleware |
| `packages/utils` | Zod input schemas, shared TypeScript types, `ok()`/`err()` response helpers |
| `packages/ui` | Shared Tailwind components (Button, Input, Card, Badge) |

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS |
| Auth | NextAuth.js — credentials provider, JWT sessions |
| Database | Supabase (PostgreSQL), Prisma ORM |
| Vector search | pgvector extension — cosine similarity over 1536-dim embeddings |
| AI | OpenAI `text-embedding-3-small` (embeddings) + `gpt-4o-mini` (chat) |
| Streaming | Vercel AI SDK |
| Billing | Stripe — subscriptions, webhooks |
| Rate limiting | Upstash Redis (serverless-compatible) |
| Widget bundler | esbuild → single IIFE file |
| Monorepo | Turborepo + pnpm workspaces |

---

## Multi-tenant isolation

Every database record carries a `tenantId`. Isolation is enforced at two layers:

1. **Prisma middleware** (`packages/db/src/middleware.ts`) — automatically injects `WHERE tenantId = ?` on all reads and sets `tenantId` on all writes. No query can escape this without explicitly bypassing the middleware.
2. **Supabase Row-Level Security** — RLS policies on all tables enforce `tenantId` at the database level as a safety net, independent of application code.

---

## Key security properties

- All API inputs validated with Zod before any processing.
- User messages are **never interpolated into the system prompt** — they are passed as separate `messages` array entries to the OpenAI API.
- Stripe webhooks verify the `stripe-signature` header before processing any event.
- Widget API requests validate the `Origin` header against the tenant's registered domain list.
- No secrets are exposed to the frontend. All keys live in server-side environment variables.
- Rate limiting on the public `/api/chat` endpoint via Upstash Redis.

---

## Docs

- [Local dev setup & production deployment](docs/RUNNING.md)
- [Testing](docs/TESTING.md)
- [What's not yet implemented](docs/TODO.md)
