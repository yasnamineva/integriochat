# Running the Project

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | |
| pnpm | 9.x | `npm install -g pnpm` |
| PostgreSQL | via Supabase | Free tier works fine |

---

## 1. Install dependencies

```bash
pnpm install
```

---

## 2. Set up environment variables

```bash
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in every value:

```env
# Supabase — get these from your project's Settings > Database page
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres?schema=public
DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# OpenAI — https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Stripe — https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# NextAuth — generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Upstash Redis — https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

The `DATABASE_URL` uses the connection pooler URL (port 6543 on Supabase). The `DIRECT_URL` uses the direct connection (port 5432) — required for Prisma migrations.

---

## 3. Set up the database

**Generate the Prisma client** (required after any schema change):

```bash
pnpm db:generate
```

**Run migrations** against your Supabase database:

```bash
pnpm db:migrate
```

For local development, create and apply a new migration when you change the schema:

```bash
pnpm --filter @chatbot/db db:migrate:dev
```

**Enable pgvector** on Supabase — run this once in the Supabase SQL editor:

```sql
create extension if not exists vector with schema extensions;
```

---

## 4. Start the dev server

```bash
pnpm dev
```

This starts Next.js on [http://localhost:3000](http://localhost:3000) via Turborepo.

To run only the web app:

```bash
pnpm --filter web dev
```

---

## 5. Build the widget

The embeddable widget is a separate build step (it is not bundled by Next.js):

```bash
pnpm --filter widget build
```

Output: `apps/widget/dist/widget.js`

In development, watch mode rebuilds on every change:

```bash
pnpm --filter widget dev
```

For the widget to be served in development, copy the output to the Next.js public folder or run a local static file server. For production it should be served from the same domain so the `Origin` validation works correctly.

---

## 6. Stripe webhooks (local development)

To test Stripe webhooks locally you need the Stripe CLI:

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will print a webhook signing secret — set it as `STRIPE_WEBHOOK_SECRET` in your `.env.local`.

---

## Available commands

Run from the repo root unless noted.

| Command | What it does |
|---|---|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Production build for all apps |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm test` | Run all test suites |
| `pnpm db:generate` | Regenerate Prisma client from schema |
| `pnpm db:migrate` | Deploy pending migrations (production) |
| `pnpm --filter @chatbot/db db:migrate:dev` | Create + apply a new migration (development) |
| `pnpm --filter @chatbot/db db:studio` | Open Prisma Studio GUI |
| `pnpm --filter widget build` | Bundle widget to `dist/widget.js` |
| `pnpm --filter web tsc --noEmit` | TypeScript type-check the web app |

---

## Typical local development workflow

```bash
# 1. First time
pnpm install
cp .env.example apps/web/.env.local
# fill in .env.local...
pnpm db:generate
pnpm db:migrate

# 2. Every time
pnpm dev
# In a second terminal (if working on the widget):
pnpm --filter widget dev
```

---

## Production deployment (Vercel)

1. Import the repo into Vercel.
2. Set the **Root Directory** to `apps/web`.
3. Add all environment variables from `.env.example` to the Vercel project settings.
4. Set `NEXTAUTH_URL` to your production domain.
5. Deploy.

The widget (`dist/widget.js`) needs to be built and served separately — either commit the built file, or add a Vercel build command that runs `pnpm --filter widget build` and copies the output to `apps/web/public/widget.js`.
