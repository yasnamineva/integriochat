# Testing

Per AGENTS.md, **a feature is not done without tests.** This document covers the testing strategy, what exists now, and how to run tests once they are written.

---

## Test types

| Type | Tool | Scope |
|---|---|---|
| Unit | Jest | Service functions, utilities, Zod schemas |
| Integration | Jest + Prisma test client | API route handlers end-to-end |
| E2E | Playwright | Critical user flows in a real browser |

Test files are colocated with the code they test:

```
src/
  lib/
    auth.ts
    auth.test.ts       ← unit test
  app/
    api/
      chatbots/
        route.ts
        route.test.ts  ← integration test
```

---

## Current status

| Package | Test files | Tests |
|---|---|---|
| `packages/utils` | `schemas.test.ts`, `response.test.ts` | 49 |
| `packages/db` | `middleware.test.ts` | 13 |
| `apps/web` | `lib/auth.test.ts`, `lib/db.test.ts`, `api/chatbots/route.test.ts`, `api/chatbots/[id]/route.test.ts`, `api/demo/[token]/route.test.ts`, `api/chat/route.test.ts`, `api/tenants/route.test.ts` | 74 |
| **Total** | **9 files** | **136** |

---

## Running tests

```bash
# Run all tests across every workspace package
pnpm test

# Run tests for a single package
pnpm --filter web test
pnpm --filter @chatbot/utils test
pnpm --filter @chatbot/db test

# Watch mode (single package)
pnpm --filter web test -- --watch

# Coverage report
pnpm --filter web test -- --coverage
```

---

## Manual smoke tests

These can be run right now against a running dev server without writing any test code.

### 1. Demo link — invalid token

```bash
curl http://localhost:3000/api/demo/invalid-token
```

Expected response:

```json
{ "success": false, "error": "Demo not found" }
```

### 2. Demo link — expired token

Insert a demo link into the database with `expiresAt` set to the past, then:

```bash
curl http://localhost:3000/api/demo/<that-token>
```

Expected response:

```json
{ "success": false, "error": "Demo link has expired" }
```

### 3. Chatbot list — unauthenticated

```bash
curl http://localhost:3000/api/chatbots
```

Expected: `401 Unauthorized` (NextAuth middleware redirects unauthenticated requests).

### 4. Chat — valid chatbot (stub response)

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"chatbotId":"<uuid>","sessionId":"test-session","message":"Hello"}'
```

Expected (stub):

```json
{
  "success": true,
  "data": {
    "reply": "[STUB] This is a placeholder response for chatbot \"...\". OpenAI integration is pending."
  }
}
```

### 5. Stripe webhook — invalid signature

```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{}'
```

Expected:

```json
{ "success": false, "error": "Invalid signature" }
```

---

## Unit tests to write

### `packages/utils`

| File | Tests |
|---|---|
| `src/schemas.ts` | Valid + invalid inputs for every Zod schema |
| `src/response.ts` | `ok()` returns `{ success: true, data }` with correct status; `err()` returns `{ success: false, error }` |

Example:

```ts
// packages/utils/src/schemas.test.ts
import { CreateChatbotSchema } from "./schemas";

test("rejects empty name", () => {
  const result = CreateChatbotSchema.safeParse({ name: "", systemPrompt: "x" });
  expect(result.success).toBe(false);
});

test("accepts valid input", () => {
  const result = CreateChatbotSchema.safeParse({
    name: "My Bot",
    systemPrompt: "You are a helpful assistant.",
  });
  expect(result.success).toBe(true);
});
```

### `packages/db`

| File | Tests |
|---|---|
| `src/middleware.ts` | Tenant middleware injects `tenantId` on reads; middleware throws on writes without tenantId |

Use a Jest mock for PrismaClient — do not hit a real database in unit tests.

### `apps/web`

| File | Tests |
|---|---|
| `src/lib/auth.ts` | `authorize()` returns null for wrong password; returns user object for correct credentials |
| `src/lib/db.ts` | `requireTenantId()` throws 401 when no session |

---

## Integration tests to write

Integration tests should use a dedicated test database (a separate Supabase project or a local PostgreSQL instance) and clean up after each test.

Recommended setup:

```ts
// jest.setup.ts (apps/web)
import { prisma } from "@chatbot/db";

afterAll(async () => {
  await prisma.$disconnect();
});
```

### API routes

| Route | Scenarios to cover |
|---|---|
| `POST /api/chatbots` | Creates chatbot; returns 422 on invalid input; returns 401 without session |
| `GET /api/chatbots/[id]` | Returns chatbot for correct tenant; returns 404 for another tenant's chatbot |
| `DELETE /api/chatbots/[id]` | Deletes own chatbot; returns 404 for cross-tenant attempt |
| `GET /api/demo/[token]` | Returns chatbot info for valid token; 404 for missing; 410 for expired |
| `POST /api/chat` | Returns stub reply; 404 for non-existent chatbotId; 403 if subscription inactive |
| `POST /api/stripe/webhook` | Returns 400 for missing signature; returns 400 for invalid signature |

---

## E2E tests to write (Playwright)

Install Playwright:

```bash
pnpm --filter web add -D @playwright/test
npx playwright install
```

### Critical flows

| Flow | Steps |
|---|---|
| **Login** | Navigate to `/login` → submit valid credentials → redirected to `/dashboard` |
| **Login failure** | Submit wrong password → error message shown, no redirect |
| **Create chatbot** | Log in → `/dashboard/chatbots` → "New Chatbot" → fill form → saved → appears in list |
| **Embed snippet** | Navigate to chatbot detail → embed snippet is visible and contains the chatbot ID |
| **Demo link** | Visit `/demo/[valid-token]` → page loads with chatbot name; visit expired token → "Demo Expired" shown |
| **Widget loads** | Load a page with the widget script tag → floating button is visible → click opens chat panel |
| **Billing page** | Log in → `/dashboard/billing` → subscription status displayed |

---

## Tenant isolation tests

These are critical. Every data-access test should include a cross-tenant assertion:

```ts
test("cannot read another tenant's chatbot", async () => {
  // Create tenantA and tenantB with one chatbot each
  // Authenticate as tenantA
  // Attempt GET /api/chatbots/[tenantB-chatbot-id]
  // Expect 404, not 200
});
```

---

## CI

Tests should run on every pull request. Recommended GitHub Actions configuration (not yet created — see [TODO](TODO.md)):

```yaml
- run: pnpm install
- run: pnpm db:generate
- run: pnpm test
- run: pnpm --filter web tsc --noEmit
- run: pnpm lint
```
