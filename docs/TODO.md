# What's Not Yet Implemented

The monorepo is scaffolded and compiles cleanly. All API routes respond with correct shapes. The items below are the remaining work to turn this into a production-ready product.

Items are grouped by area and roughly ordered by dependency — complete earlier items first.

---

## 1. OpenAI — embeddings

**Files:** `apps/web/src/app/api/chatbots/route.ts`, `apps/web/src/app/api/chatbots/[id]/route.ts`

When a chatbot is created or updated with source URLs, the content at those URLs needs to be:

1. Fetched and split into chunks (e.g. 512-token overlapping windows).
2. Hashed (SHA-256) and compared against stored `contentHash` — skip chunks that haven't changed.
3. Sent to OpenAI `text-embedding-3-small` to generate 1536-dimensional vectors.
4. Stored in `EmbeddingDocument` with the `embedding` pgvector column populated.

The `EmbeddingDocument` table and pgvector column are already in the schema — only the generation logic is missing.

**Suggested service file:** `apps/web/src/services/embedding.service.ts`

---

## 2. OpenAI — chat completion with RAG

**File:** `apps/web/src/app/api/chat/route.ts`

Currently returns a hardcoded stub string. Replace with:

1. **Retrieval** — run a cosine similarity search on pgvector to find the top-k `EmbeddingDocument` chunks closest to the user's message.
2. **Prompt construction** — build a context block from those chunks and inject it into the system message (as context, not by interpolating user input).
3. **Streaming** — call OpenAI via the Vercel AI SDK `streamText()` and return `result.toDataStreamResponse()`.
4. **Usage logging** — write token counts to `UsageLog` after the stream completes.

The route already has the correct structure — look for the `// TODO` comments.

**Suggested service file:** `apps/web/src/services/chat.service.ts`

```ts
// The system prompt and user message MUST remain separate — never do this:
// systemPrompt: `${chatbot.systemPrompt} The user said: ${userMessage}`  ← WRONG

// Do this instead:
// system: chatbot.systemPrompt,
// messages: [{ role: "user", content: userMessage }]
```

---

## 3. Stripe — checkout session creation

**File:** `apps/web/src/app/(dashboard)/billing/page.tsx`, new API route needed

The billing page currently shows subscription status but the "Manage Subscription" button is disabled. Implement:

1. `POST /api/stripe/checkout` — creates a Stripe Checkout Session and returns the URL.
2. Button in billing page that calls this endpoint and redirects to the Stripe-hosted checkout.
3. On success, Stripe calls the webhook → `checkout.session.completed` → subscription record created.

**Suggested service file:** `apps/web/src/services/stripe.service.ts`

---

## 4. Stripe — webhook event handlers

**File:** `apps/web/src/app/api/stripe/webhook/route.ts`

The switch/case skeleton is in place. Implement each handler:

| Event | Action |
|---|---|
| `checkout.session.completed` | Create `Subscription` record with `status: ACTIVE` or `TRIALING`; store `stripeCustomerId` and `stripeSubscriptionId` |
| `invoice.paid` | Update `Subscription.status` to `ACTIVE`; update `currentPeriodEnd` |
| `invoice.payment_failed` | Update `Subscription.status` to `PAST_DUE`; optionally send email notification |
| `customer.subscription.deleted` | Update `Subscription.status` to `CANCELED`; set `canceledAt` |

---

## 5. Upstash rate limiting

**File:** `apps/web/src/middleware.ts`

The `// TODO` placeholder is in the middleware. Implement rate limiting on `POST /api/chat` using the Upstash Redis `Ratelimit` class:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 requests per minute per IP
});
```

Return `429 Too Many Requests` when the limit is exceeded.

---

## 6. Source URL scraping

No scraping infrastructure exists yet. The system needs a way to fetch content from URLs provided when creating a chatbot. Options:

- **Serverless (simple):** A Next.js route that fetches the URL server-side, strips HTML, chunks the text, and triggers embedding generation.
- **Queue-based (scalable):** An async job queue (e.g. Inngest, Trigger.dev) that handles fetching and embedding in the background.

The `EmbeddingDocument.sourceUrl` and `contentHash` fields are already in the schema to support incremental re-indexing.

---

## 7. Demo link creation UI

The `DemoLink` model and `GET /api/demo/[token]` route exist, but there is no UI or API route to **create** a demo link from the dashboard.

Add:

- `POST /api/demo` — creates a `DemoLink` for a given `chatbotId` with configurable duration (default 7 days).
- A "Generate Demo Link" button on the chatbot detail page (`/dashboard/chatbots/[id]`).
- Display the generated URL and its expiry date.

---

## 8. New chatbot form

The "New Chatbot" button on `/dashboard/chatbots` links to `/dashboard/chatbots/new`, but that page does not exist yet. Create a form page that:

- Accepts name, system prompt, tone, and lead capture toggle.
- Calls `POST /api/chatbots`.
- Redirects to the new chatbot's detail page on success.

---

## 9. Remaining tests

Unit and route tests are written and passing (136 tests). Still outstanding:

- [ ] E2E tests with Playwright — login, chatbot creation, demo link, widget flows
- [ ] GitHub Actions CI workflow (`.github/workflows/ci.yml`)
- [ ] Tests for Stripe webhook handlers once they are implemented

---

## 10. Supabase RLS policies

The Prisma schema includes a comment noting that RLS policies need to be applied separately via the Supabase SQL editor. These act as a second layer of protection beyond the Prisma middleware.

For each table, apply a policy like:

```sql
-- Example for the chatbots table
alter table chatbots enable row level security;

create policy "tenant_isolation" on chatbots
  using (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

The application would need to call `set_config('app.current_tenant_id', tenantId, true)` at the start of each request for this to work at the DB level.

---

## 11. Widget serving

The built `dist/widget.js` needs to be served from a stable public URL. The recommended approach for Vercel:

- Add a build step that copies `apps/widget/dist/widget.js` → `apps/web/public/widget.js`.
- Or serve it from a CDN with versioned URLs.

Currently, `NEXT_PUBLIC_BASE_URL` is used to construct the snippet URL in the chatbot detail page and demo page — this will work once the file is in `public/`.

---

## 12. Email notifications

No email infrastructure exists. Required for:

- Password reset
- Payment failure notifications to tenants
- Trial expiry warnings

Suggested tools: Resend or SendGrid. Add a `sendEmail()` service at `apps/web/src/services/email.service.ts`.

---

## 13. Analytics

The `UsageLog` table is in the schema. The dashboard overview page shows total message count but no usage analytics. Implement:

- Token usage over time per chatbot
- Message volume per chatbot
- Charts on the dashboard (lazy-load with `dynamic(() => import(...), { ssr: false })`)

---

## 14. Google OAuth (optional)

AGENTS.md lists Google OAuth as an optional auth provider. Add it to `authOptions` in `apps/web/src/lib/auth.ts`:

```ts
import GoogleProvider from "next-auth/providers/google";
// Add to providers array:
GoogleProvider({
  clientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
  clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
})
```

---

## 15. Staging environment

AGENTS.md requires separate staging and production environments on Vercel. Set up:

- A second Vercel project pointing to the same repo with a `staging` branch.
- A second Supabase project for staging data.
- Stripe test keys in staging; live keys in production.
- `NODE_ENV=production` in staging to suppress debug logging.
