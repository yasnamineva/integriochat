# TODO

Items that are planned but not yet implemented.

---

## Features (Schema / DB exists, no implementation)

### Embeddings / RAG — auto-retrain
- Scraping, embedding, and RAG retrieval are fully implemented (`scraper.service.ts`, `embedding.service.ts`, `/api/chatbots/[id]/scrape`, Training tab UI).
- `POST /api/chatbots` and `PATCH /api/chatbots/[id]` now auto-trigger `triggerScrapeInBackground` when `websiteUrl` is set or changed.
- **Remaining**: `autoRetrain` flag still has no background scheduler. A periodic job (Vercel Cron or QStash) should call `POST /api/chatbots/[id]/scrape` for chatbots with `autoRetrain: true` on a daily/weekly schedule.

### Web search toggle — ✅ done
- Toggle exists in the Settings tab of ChatbotDetail.tsx.

### Lead capture
- `leadCapture` boolean is stored per chatbot, but there is no form capture logic in the widget and no UI for reviewing captured leads.

### Webhooks — ✅ delivery implemented
- `webhooks` table exists (URL, events array, secret).
- `dispatchWebhookEvent()` in `webhook.service.ts` signs payloads with HMAC-SHA256 and POSTs to all active, subscribed endpoints.
- `message.completed` and `conversation.started` events are fired from `/api/chat`.
- `lead.captured` event is exported but not yet wired (lead capture form not yet built).
- UI to create / manage / test webhooks is in ChatbotDetail Integration tab.

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

### Session-level metrics — ✅ partially done
- Analytics page now shows unique conversation count and average messages per session (via `sessionId` groupBy).
- Sessions with no reply (unresolved) and resolution tracking are still not implemented.

### Resolution tracking
- No way to mark or detect whether a conversation was "resolved".

---

## UX / Onboarding

### Empty-state onboarding — ✅ done
- Chatbots list page now shows a full onboarding card with icon, description, and CTA when no chatbots exist.

### In-dashboard chatbot preview — ✅ done
- ChatbotDetail now has a "Preview" tab with a live test-chat interface that streams responses from `/api/chat`.

---

## DB migrations

### allowedDomains column move (apply in Supabase)
The Prisma schema already reflects this change. Run the following in the Supabase SQL Editor to sync production:

```sql
ALTER TABLE "chatbots" ADD COLUMN IF NOT EXISTS "allowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tenants"  DROP COLUMN IF EXISTS "allowedDomains";
```
