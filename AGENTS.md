# AGENTS.md

## Project Name
AI Chatbot SaaS Platform for Small Businesses

---

## 1. Purpose of This Document

This file defines:

- The system architecture
- Coding standards
- Agent behavior guidelines
- Folder structure rules
- Deployment constraints
- Non-negotiable technical decisions

AI coding agents (Codex, Copilot Agent, Claude Code, etc.) MUST follow this document when generating or modifying code.

Do not override architectural decisions unless explicitly instructed.

---

## 2. Product Overview

We are building a multi-tenant SaaS platform that allows us to:

1. Create AI-powered chatbots for small businesses
2. Generate expiring demo links for prospects
3. Embed chatbots into client websites using a JavaScript snippet
4. Charge monthly subscriptions (with optional one-time setup fee)
5. Manage bots, clients, subscriptions, and usage from a dashboard

Each business has isolated configuration and data.

---

## 3. High-Level Architecture

### Frontend
- Next.js (App Router)
- React
- TypeScript
- TailwindCSS

### Backend
- Next.js API routes only (no separate Express server)
- REST API (no GraphQL)
- TypeScript

### Database
- Supabase (hosted PostgreSQL)
- pgvector extension for embeddings
- Prisma ORM for type-safe queries
- Supabase Row-Level Security (RLS) as a safety net for tenant isolation

### AI Integration
- OpenAI API
- text-embedding-3-small for generating embeddings
- Embeddings stored in pgvector (same DB, no external service)
- Streaming responses via Vercel AI SDK

### Billing
- Stripe
- Webhooks for subscription lifecycle
- Support:
  - Monthly recurring plans
  - Optional one-time setup fee
  - Trial periods

### Hosting
- Frontend + API: Vercel (single deployment)
- Database: Supabase
- Rate limiting: Upstash Redis (serverless-compatible)

### Monorepo Tooling
- Turborepo for build orchestration
- pnpm workspaces for package management

---

## 4. Multi-Tenant Rules

This is a strict multi-tenant system.

Every record must include:
- tenantId
- createdAt
- updatedAt

**Two-layer isolation:**

1. **Prisma middleware** (primary): A global Prisma middleware automatically injects `where: { tenantId }` on all read operations and sets `tenantId` on all write operations. No query should bypass this middleware.
2. **Supabase RLS** (safety net): Row-Level Security policies on all tables enforce tenantId at the database level as a backstop.

Never write raw SQL or Prisma queries that bypass tenantId filtering.

Never allow cross-tenant queries.

---

## 5. Authentication

- NextAuth.js (handles sessions, JWT, refresh tokens, OAuth)
- Email + password (credentials provider)
- OAuth optional (Google at minimum)
- Role support:
  - `admin` — internal platform admin
  - `client` — business owner managing their chatbot(s)
- Session strategy: JWT via NextAuth (short-lived access token + automatic refresh)
- Protect all `/api/*` routes with NextAuth `getServerSession`

---

## 6. Core Features

### 6.1 Chatbot Core

Each chatbot must support:
- Custom system prompt
- Website-trained embeddings (scraped content → pgvector)
- Configurable tone/personality
- Lead capture option
- Conversation logging

Store:
- chatbot config
- messages
- embeddings (via `EmbeddingDocument` table with pgvector column)
- usage stats

---

### 6.2 Demo Link System

Requirements:
- Unique token (UUID)
- Expiration timestamp
- Configurable duration (default 7 days)
- Public route: `/demo/[token]`

When expired:
- Return "Demo expired" page
- Do not load chatbot

---

### 6.3 Website Embed Widget

Clients receive this snippet:

```html
<script src="https://ourdomain.com/widget.js" data-bot="BOT_ID"></script>
```

Widget requirements:
- Loads chatbot UI using **Shadow DOM** (not iframe) for style isolation
- Minimal styling conflicts with host page
- Async load
- Mobile responsive
- Floating button bottom-right
- CORS: API validates `Origin` header against the tenant's registered domains list. Requests from unregistered domains are rejected.

---

### 6.4 Dashboard (Internal Admin)

Must support:

- Create new tenant
- Create chatbot
- Generate demo link
- View demo link expiration
- View analytics
- View chat logs
- View Stripe subscription status

---

### 6.5 Billing

Stripe requirements:

- Subscription plans (tiered)
- Setup fee option
- Webhook handling:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`

Subscription states:
- `trialing`
- `active`
- `past_due`
- `canceled`

Disable chatbot if subscription is not `active` or `trialing`.

---

## 7. Folder Structure (Strict)

```
/apps
  /web        → Next.js frontend + API routes
  /widget     → Standalone embeddable widget (Shadow DOM, no framework)

/packages
  /ui         → Shared UI components
  /db         → Prisma schema, client, and tenant middleware
  /utils      → Shared utilities
```

No business logic in components.

Business logic must live in:
- `services/`
- `lib/`

The `widget` app must have zero dependency on internal packages — it ships as a single self-contained JS file.

---

## 8. Database Schema Requirements

Minimum tables:

- `User`
- `Tenant`
- `Chatbot`
- `EmbeddingDocument` (stores scraped content + pgvector embedding column)
- `DemoLink`
- `Subscription`
- `Message`
- `UsageLog`

Every table must include:
- `id` (UUID, default `gen_random_uuid()`)
- `tenantId` (except `Tenant` table itself)
- `createdAt`
- `updatedAt`

`EmbeddingDocument` must include:
- `chatbotId`
- `content` (text chunk)
- `embedding` (vector(1536) — matches text-embedding-3-small dimensions)
- `sourceUrl`

---

## 9. Security Rules

- Never expose API keys to frontend
- Use environment variables for secrets
- Validate all API inputs (use zod)
- Rate-limit public chatbot endpoints via Upstash Redis
- Sanitize user messages before logging
- Prevent prompt injection by keeping system prompt strictly separated from user input (never interpolate user input into the system prompt string)
- Validate `Origin` header on widget API requests against tenant's allowed domains
- Stripe webhooks must verify signature using `STRIPE_WEBHOOK_SECRET` before processing

---

## 10. Environment Variables

Required:

```
DATABASE_URL=
DIRECT_URL=                    # Supabase direct connection (for migrations)
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_BASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Never hardcode secrets.

---

## 11. Code Standards

- TypeScript only
- No `any` types unless explicitly justified with a comment
- Async/await only (no raw promise chains)
- Use service layer for all external integrations (OpenAI, Stripe, Upstash)
- Write modular functions
- Add comments to non-obvious logic
- No duplicated logic
- Use `zod` for all input validation at API boundaries

---

## 12. API Conventions

REST structure:

```
GET    /api/chatbots
POST   /api/chatbots
GET    /api/demo/:token
POST   /api/chat
POST   /api/stripe/webhook
```

All responses must follow:

```ts
{
  success: boolean,
  data?: T,        // typed, never `any`
  error?: string
}
```

---

## 13. Performance Constraints

- Stream AI responses using Vercel AI SDK
- Cache embeddings — only regenerate when source content changes (track `contentHash` on `EmbeddingDocument`)
- Use cosine similarity search on pgvector for retrieval (top-k chunks)
- Use pagination for all log/message list endpoints
- Lazy load heavy dashboard components

---

## 14. Testing Requirements

A feature is not done without tests.

- **Unit tests**: Jest — cover all service functions and utilities
- **Integration tests**: Jest + Prisma test client — cover API route handlers
- **E2E tests**: Playwright — cover critical flows (signup, chatbot creation, embed demo, billing)
- Test files colocated: `foo.service.ts` → `foo.service.test.ts`

---

## 15. What Agents Must NOT Do

- Do not redesign the architecture
- Do not switch the tech stack
- Do not introduce GraphQL
- Do not introduce Redux or Zustand unless explicitly approved
- Do not couple the widget to internal packages
- Do not remove tenant isolation middleware
- Do not write queries that skip the Prisma tenant middleware
- Do not interpolate user input into system prompts

---

## 16. Future Expansion (Design For)

System should support (do not block these):

- CRM integrations
- Multi-language bots
- Analytics dashboard upgrades
- White-label support (per-tenant branding already in schema)
- Custom domains for widget
- Agency accounts managing multiple client tenants

Write code that does not make these harder to add later.

---

## 17. Deployment Rules

- Separate staging and production environments on Vercel
- Stripe test keys in staging/development
- Production builds must not log sensitive data (no logging request bodies containing user messages)
- Set `CORS` allowed origins per tenant from the database — do not use wildcard `*` on authenticated endpoints

---

## 18. Definition of Done

A feature is complete only if:

- It compiles without TypeScript errors
- It respects multi-tenant isolation (Prisma middleware + tenantId present)
- It includes zod validation on inputs
- It does not expose secrets
- It has unit or integration tests
- It works in both dev and production modes
