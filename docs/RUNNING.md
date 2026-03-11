# Running the Project

Two paths are documented below:

- **[Local development](#local-development)** — Docker Postgres, no external accounts required, up in ~5 minutes.
- **[Production (Vercel)](#production-vercel)** — Supabase, Stripe, OpenAI, Upstash, full config.

---

## Local development

Stripe, OpenAI, and Upstash are **not required** to run locally. The chat route returns a stub reply and the billing page shows an empty state without them.

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | https://nodejs.org |
| pnpm | 9.x | `npm install -g pnpm` |
| Docker | any recent | https://docs.docker.com/get-docker |

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start a local Postgres with pgvector

```bash
docker run -d \
  --name integriochat-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

To stop it: `docker stop integriochat-db`
To start it again later: `docker start integriochat-db`

### 3. Create the env files

Two env files are needed — one for the Next.js app and one for Prisma migrations, which run from `packages/db` and can't see `apps/web/.env.local`.

**`apps/web/.env.local`** (used by the running app):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/postgres
NEXTAUTH_SECRET=local-dev-secret-change-me
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**`packages/db/.env`** (used by Prisma CLI for migrations and `db:generate`):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

> Both files are gitignored — they will never be committed.

### 4. Apply the database schema

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Seed a test user

The database is empty after migration. Insert a test user so you can log in:

```bash
docker exec -it integriochat-db psql -U postgres -c "
INSERT INTO \"Tenant\" (id, name, slug, \"allowedDomains\", \"createdAt\", \"updatedAt\")
VALUES (gen_random_uuid(), 'Demo Tenant', 'demo', '{}', now(), now());"

docker exec -it integriochat-db psql -U postgres -c "
INSERT INTO \"User\" (id, email, password, name, role, \"tenantId\", \"createdAt\", \"updatedAt\")
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Admin',
  'ADMIN',
  (SELECT id FROM \"Tenant\" LIMIT 1),
  now(), now()
);"
```

> The hashed password above is `password`. Change it before sharing the database with anyone.

### 6. Start the dev server

```bash
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with `admin@example.com` / `password`.

### 7. Build the widget (optional)

Only needed if you are working on the embeddable widget:

```bash
pnpm --filter widget build
cp apps/widget/dist/widget.js apps/web/public/widget.js
```

To rebuild on every change: `pnpm --filter widget dev`

---

## Production (Vercel)

You need accounts on four services. Each section below says exactly where to sign up, where to find the value, and which env var it maps to.

### Service 1 — Supabase (database)

**Sign up:** https://supabase.com → New project (free tier is fine)

After the project finishes provisioning:

1. Go to **Project Settings → Database**.
2. Scroll to **Connection string**.
3. Select the **URI** tab.
   - Switch the dropdown to **Connection pooling** (port 6543) — copy this as `DATABASE_URL`. Append `?pgbouncer=true` to the end if it is not already there.
   - Switch the dropdown to **Direct connection** (port 5432) — copy this as `DIRECT_URL`.

Both strings look like:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

4. In the **SQL Editor** (left sidebar), run this once to enable vector search:
   ```sql
   create extension if not exists vector with schema extensions;
   ```

> **`DATABASE_URL`** — pooled connection, used at runtime by the app
> **`DIRECT_URL`** — direct connection, used only by Prisma migrations

---

### Service 2 — OpenAI (AI responses and embeddings)

**Sign up:** https://platform.openai.com/signup

1. Once logged in, go to **API keys** in the left sidebar (or https://platform.openai.com/api-keys).
2. Click **Create new secret key**.
3. Copy the key immediately — it is only shown once.

> **`OPENAI_API_KEY`** — starts with `sk-proj-...`

You will need to add a payment method under **Settings → Billing** before the key will work. There is no free tier but costs are very low for development (fractions of a cent per request).

---

### Service 3 — Stripe (billing)

**Sign up:** https://dashboard.stripe.com/register

Stripe starts you in **test mode** — no real money moves. Use test mode for development and staging.

#### Secret key (`STRIPE_SECRET_KEY`)

1. In the Stripe dashboard, make sure the **Test mode** toggle (top-right) is on.
2. Go to **Developers → API keys**.
3. Copy the **Secret key** (starts with `sk_test_...`).

> **`STRIPE_SECRET_KEY`** — `sk_test_...` for test, `sk_live_...` for production

#### Webhook secret (`STRIPE_WEBHOOK_SECRET`)

1. Go to **Developers → Webhooks**.
2. Click **Add endpoint**.
3. Set the endpoint URL to `https://your-domain.com/api/stripe/webhook`.
4. Under **Select events**, add these four:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Click **Add endpoint**.
6. On the endpoint detail page, click **Reveal** under **Signing secret**.

> **`STRIPE_WEBHOOK_SECRET`** — starts with `whsec_...`

When you go live, switch the dashboard out of test mode and repeat steps 1–6 with live-mode keys.

---

### Service 4 — Upstash (rate limiting)

**Sign up:** https://console.upstash.com (free tier, no credit card)

1. Click **Create Database**.
2. Choose **Redis**, give it a name, pick the region closest to your Vercel deployment.
3. Click **Create**.
4. On the database detail page, scroll to **REST API**.
5. Copy the **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** values shown there.

> **`UPSTASH_REDIS_REST_URL`** — `https://...upstash.io`
> **`UPSTASH_REDIS_REST_TOKEN`** — long alphanumeric token

---

### Service 5 — Vercel (hosting)

**Sign up:** https://vercel.com/signup (free tier)

1. Click **Add New → Project**.
2. Import your GitHub repo (`yasnamineva/integriochat`).
3. Set **Root Directory** to `apps/web`.
4. Expand **Environment Variables** and add every variable from the table below.
5. Under **Build & Development Settings**, override the **Build Command** to:
   ```
   cd ../.. && pnpm --filter widget build && cp apps/widget/dist/widget.js apps/web/public/widget.js && cd apps/web && next build
   ```
6. Click **Deploy**.

After the first deploy, copy the auto-generated `.vercel.app` domain and set it as both `NEXTAUTH_URL` and `NEXT_PUBLIC_BASE_URL`, then redeploy.

---

### Full environment variable reference

| Variable | Where to get it | Example value |
|---|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection pooling URI | `postgresql://postgres.[ref]:[pw]@...supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase → Settings → Database → Direct connection URI | `postgresql://postgres.[ref]:[pw]@...supabase.com:5432/postgres` |
| `OPENAI_API_KEY` | platform.openai.com/api-keys → Create new secret key | `sk-proj-...` |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys → Secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers → Webhooks → endpoint → Signing secret | `whsec_...` |
| `NEXTAUTH_SECRET` | Generate locally: `openssl rand -base64 32` | `s3cr3t...` |
| `NEXTAUTH_URL` | Your production domain | `https://integriochat.vercel.app` |
| `NEXT_PUBLIC_BASE_URL` | Same as `NEXTAUTH_URL` | `https://integriochat.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | Upstash console → database → REST API section | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console → database → REST API section | `AX4A...` |

---

### Apply migrations in production

Run once after first deploy, and again after any schema change:

```bash
pnpm db:migrate
```

Or prepend it to the Vercel build command so it runs automatically on every deploy:
```
pnpm db:migrate && cd ../.. && pnpm --filter widget build && ...
```

---

## All available commands

Run from the repo root unless noted.

| Command | What it does |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Start all apps in dev mode via Turborepo |
| `pnpm --filter web dev` | Start only the Next.js app |
| `pnpm build` | Production build for all apps |
| `pnpm lint` | ESLint across all packages |
| `pnpm test` | Run all 136 tests |
| `pnpm db:generate` | Regenerate Prisma client from schema |
| `pnpm db:migrate` | Deploy pending migrations (production) |
| `pnpm --filter @integriochat/db db:migrate:dev` | Create + apply a migration (development) |
| `pnpm --filter @integriochat/db db:studio` | Open Prisma Studio GUI |
| `pnpm --filter widget build` | Bundle widget to `dist/widget.js` |
| `pnpm --filter web tsc --noEmit` | TypeScript type-check only |

---

## Local Stripe webhooks (optional)

To test Stripe events on your local machine, install the Stripe CLI and forward events to your dev server:

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a webhook signing secret — add it as `STRIPE_WEBHOOK_SECRET` in `apps/web/.env.local`.
