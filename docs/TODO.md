# Integriochat — Implementation Status

Items are grouped by area. ✅ = done, 🔲 = remaining.

---

## ✅ Completed

### Auth & Onboarding
- ✅ **Registration flow** — `POST /api/auth/register` creates Tenant + User atomically in `$transaction`; auto-signs in via NextAuth credentials
- ✅ **Login page** with link to register
- ✅ **NextAuth JWT sessions** with `tenantId` + `role` in token

### Chatbot Management
- ✅ **New chatbot form** — name, system prompt, tone, lead capture, website URL
- ✅ **Chatbot list** — dashboard overview at `/chatbots`
- ✅ **Chatbot detail page** — view, edit, delete
- ✅ **Chatbot CRUD API** — `GET/POST /api/chatbots`, `GET/PATCH/DELETE /api/chatbots/[id]`

### AI Chat (RAG)
- ✅ **OpenAI streaming** — `gpt-4o-mini` via Vercel AI SDK `OpenAIStream` + `StreamingTextResponse`
- ✅ **RAG retrieval** — pgvector cosine similarity search on `EmbeddingDocument`
- ✅ **Custom Q&A injection** — predetermined answers always take priority over scraped content
- ✅ **Conversation history** — last 10 turns fetched from DB per session
- ✅ **Message logging** — user + assistant messages stored in `Message` table

### Website Training
- ✅ **Web scraper** — BFS crawl up to 20 pages, same-domain only, text extraction via cheerio
- ✅ **Content chunking** — ~700-char overlapping chunks with SHA-256 deduplication
- ✅ **Embedding generation** — `text-embedding-3-small` via OpenAI
- ✅ **Scrape API** — `POST /api/chatbots/[id]/scrape`; updates `scrapeStatus` + `lastScrapedAt`
- ✅ **Training UI** — "Train Now" / "Re-train" button with status badge on chatbot detail page

### Predetermined Answers (Custom Q&A)
- ✅ **CustomQA model** — `custom_qas` table with `question` + `answer` per chatbot
- ✅ **Q&A CRUD API** — `GET/POST /api/chatbots/[id]/qa`, `DELETE /api/chatbots/[id]/qa/[qaId]`
- ✅ **Q&A management UI** — add/remove pairs directly on chatbot detail page

### Demo Links
- ✅ **DemoLink model** — token-based, auto-expiring public links
- ✅ **Create API** — `POST /api/demo`
- ✅ **Demo page** — `/demo/[token]` with inline `DemoChat` React component (streaming)
- ✅ **Demo link UI** — duration selector, generate, copy-to-clipboard on chatbot detail page
- ✅ **Origin whitelist bypass** — demo page origin (`NEXT_PUBLIC_BASE_URL`) always allowed by chat API

### Billing (Stripe)
- ✅ **Checkout session** — `POST /api/stripe/checkout`; new customers → Checkout, existing → Customer Portal
- ✅ **Webhook handlers** — `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
- ✅ **Billing page** — live subscription status, success banner, `CheckoutButton` component
- ✅ **Subscription gate** — chat API rejects requests if no ACTIVE/TRIALING subscription

### Middleware & Security
- ✅ **Upstash rate limiting** — sliding window 20 req/min per IP on `POST /api/chat`; graceful fallback when env vars absent
- ✅ **Auth guard** — JWT check on all `/api/chatbots`, `/api/tenants`, `/dashboard` routes
- ✅ **Tenant middleware** — Prisma middleware injects/enforces `tenantId` on all read/write operations
- ✅ **CORS origin validation** — widget requests validated against `tenant.allowedDomains`

### Multi-tenancy
- ✅ **Tenant isolation** — Prisma middleware + `requireTenantId()` helper
- ✅ **Seed script** — idempotent `db:seed` creates demo tenant + admin user + TRIALING subscription

### Tests
- ✅ **116 tests** across 11 suites — all passing (`pnpm test`)

---

## 🔲 Remaining

### 1. Widget serving

**File:** `apps/widget/`, `apps/web/public/`

Build `apps/widget/dist/widget.js` and copy it to `apps/web/public/widget.js` so the embed snippet works.

```bash
# Build widget
pnpm --filter widget build
# Copy to web public
cp apps/widget/dist/widget.js apps/web/public/widget.js
```

Add this copy step to the web build script or a Turborepo pipeline task so it runs automatically.

---

### 2. E2E tests & CI

- [ ] Playwright E2E tests — login, chatbot creation, demo link, widget flows
- [ ] GitHub Actions CI workflow (`.github/workflows/ci.yml`) running `pnpm test` + build check

---

### 3. Supabase RLS policies

Apply row-level security as a second safety net beyond the Prisma middleware:

```sql
alter table chatbots enable row level security;
create policy "tenant_isolation" on chatbots
  using ("tenantId" = current_setting('app.current_tenant_id')::uuid);
```

Requires calling `set_config('app.current_tenant_id', tenantId, true)` at the start of each request.

---

### 4. Email notifications

No email infrastructure yet. Required for:

- Password reset
- Payment failure notifications
- Trial expiry warnings (e.g. 3 days before)

Suggested: Resend or SendGrid. Service at `apps/web/src/services/email.service.ts`.

---

### 5. Analytics dashboard

The `UsageLog` table exists but nothing writes to it. Implement:

- Log `tokensUsed` + `costUsd` in `POST /api/chat` `onFinal` callback
- Token usage chart per chatbot (lazy-loaded with `dynamic(() => import(...), { ssr: false })`)
- Message volume per chatbot on the dashboard overview

---

### 6. Google OAuth (optional)

```ts
import GoogleProvider from "next-auth/providers/google";
// Add to authOptions.providers:
GoogleProvider({ clientId: process.env["GOOGLE_CLIENT_ID"] ?? "", clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "" })
```

---

### 7. Staging environment

- Second Vercel project pointing to same repo on a `staging` branch
- Second Supabase project for staging data
- Stripe test keys in staging, live keys in production
