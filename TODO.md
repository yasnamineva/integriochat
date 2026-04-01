# TODO

---

### 1. Widget serving

Build `apps/widget/dist/widget.js` and copy it to `apps/web/public/widget.js` so the embed snippet works.

```bash
pnpm --filter widget build
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

- Password reset delivery (`sendPasswordResetEmail` in `apps/web/src/lib/email.ts` is a stub)
- Payment failure notifications
- Trial expiry warnings (e.g. 3 days before)

Suggested: Resend or SendGrid.

---

### 5. Analytics dashboard

The `UsageLog` table exists but nothing writes to it:

- Log `tokensUsed` + `costUsd` in `POST /api/chat` `onFinal` callback
- Token usage chart per chatbot
- Message volume per chatbot on dashboard overview
- Token estimation in `usage.service.ts` uses `text.length / 4` (~30% underestimate) — use `js-tiktoken`
- Resolution tracking: no way to mark or detect whether a conversation was resolved

---

### 6. Stubs / incomplete features

**Lead capture** — `leadCapture` boolean stored per chatbot, no form logic in widget, no UI for reviewing captured leads, `lead.captured` webhook event not wired up.

**Auto-retrain** — `autoRetrain` flag exists but no scheduler. Need Vercel Cron or QStash calling `POST /api/chatbots/[id]/scrape` daily/weekly.

**Webhook delivery retries** — `dispatchWebhookEvent()` is fire-and-forget. Failed deliveries are silently dropped. Options: persistent retry queue via Vercel Cron + DB, or QStash.

---

### 7. Google OAuth (optional)

```ts
import GoogleProvider from "next-auth/providers/google";
GoogleProvider({ clientId: process.env["GOOGLE_CLIENT_ID"] ?? "", clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "" })
```

---

### 8. Staging environment

- Second Vercel project on a `staging` branch
- Second Supabase project for staging data
- Stripe test keys in staging, live keys in production

---

### 9. Missing database indexes

```sql
-- Message volume queries (usage.service.ts)
CREATE INDEX ON messages ("chatbotId", "createdAt");

-- pgvector similarity search (embedding.service.ts)
CREATE INDEX ON embedding_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

Also add `@@index([chatbotId, createdAt])` to `Message` in `schema.prisma`.

---

### 10. Rate limiting gaps

`/api/auth/register` and `/api/auth/forgot-password` have no per-IP rate limit.

---

### DB migration — allowedDomains column move (apply in Supabase)

```sql
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "allowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tenants"  DROP COLUMN IF EXISTS "allowedDomains";
```
