# TODO

Items that are planned but not yet implemented.

---

## Features (Schema / DB exists, no implementation)

### Embeddings / RAG
- `embedding_documents` table and `retrieveContext` service exist, but creating/updating a chatbot does not trigger website scraping or embedding generation.
- `POST /api/chatbots` and `PATCH /api/chatbots/[id]` need to enqueue a scrape + embed job when `websiteUrl` is set or changed.
- `autoRetrain` flag is stored in the DB but no background job watches for website changes.

### Web search toggle
- `webSearchEnabled` is in the DB and the chat route handles it fully, but there is no toggle in the chatbot UI (`ChatbotDetail.tsx` → Settings tab).

### Lead capture
- `leadCapture` boolean is stored per chatbot, but there is no form capture logic in the widget and no UI for reviewing captured leads.

### Webhooks
- `webhooks` table exists (URL, events array, secret).
- No delivery mechanism — events are never sent to the webhook URL.
- No UI to create / manage / test webhooks.

### Demo links
- `demo_links` table exists (token, expiresAt).
- No UI to generate or share a demo URL for a chatbot.

---

## Infrastructure

### Rate limiting
- `apps/web/src/middleware.ts` has a placeholder comment for Upstash rate limiting.
- Public endpoints (`/api/chat`, `/api/auth/register`) have no per-IP rate limit — only plan-level message caps.
- Add Upstash Redis rate limiting to at least `/api/chat`.

---

## Analytics

### Session-level metrics
- Current analytics counts raw messages; there is no session-level grouping.
- Useful additions: unique conversation count, average messages per session, sessions with no reply (unresolved).

### Resolution tracking
- No way to mark or detect whether a conversation was "resolved".

---

## UX / Onboarding

### Empty-state onboarding
- After signup the dashboard shows empty lists with no guidance.
- A first-run wizard (e.g. "Create your first chatbot") would reduce drop-off.

### In-dashboard chatbot preview
- Users can configure a chatbot but cannot test-chat with it inside the dashboard before embedding it.

---

## DB migrations

### allowedDomains column move (apply in Supabase)
The Prisma schema already reflects this change. Run the following in the Supabase SQL Editor to sync production:

```sql
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "allowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tenants"  DROP COLUMN IF EXISTS "allowedDomains";
```
