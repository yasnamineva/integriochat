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

### 3. Create the env file

Create `apps/web/.env.local` with these values (copy-paste as-is):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/postgres
NEXTAUTH_SECRET=local-dev-secret-change-me
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Apply the database schema

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Seed a test user

The database is empty after migration. Insert a test user so you can log in:

```bash
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
) ON CONFLICT DO NOTHING;"
```

> The hashed password above is `password`. Change it before sharing the database with anyone.
>
> If no tenant exists yet, create one first:
> ```bash
> docker exec -it integriochat-db psql -U postgres -c "
> INSERT INTO \"Tenant\" (id, name, slug, \"allowedDomains\", \"createdAt\", \"updatedAt\")
> VALUES (gen_random_uuid(), 'Demo Tenant', 'demo', '{}', now(), now());"
> ```

### 6. Start the dev server

```bash
pnpm --filter web dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with `admin@example.com` / `password`.

### 7. Build and watch the widget (optional)

Only needed if you are working on the embeddable widget:

```bash
pnpm --filter widget build
# or, to rebuild on every change:
pnpm --filter widget dev
```

Copy the output to the public folder so Next.js serves it:

```bash
cp apps/widget/dist/widget.js apps/web/public/widget.js
```

---

## Production (Vercel)

All external services are required for production.

### Services to set up

| Service | Purpose | Free tier |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL + pgvector | Yes |
| [OpenAI](https://platform.openai.com) | Embeddings + chat | Pay-as-you-go |
| [Stripe](https://dashboard.stripe.com) | Subscriptions | Test mode free |
| [Upstash](https://console.upstash.com) | Redis rate limiting | Yes |

### 1. Supabase

1. Create a new project.
2. In **Settings → Database**, find the connection strings:
   - **Connection pooling** URL (port 6543) → `DATABASE_URL`
   - **Direct connection** URL (port 5432) → `DIRECT_URL`
3. In the **SQL Editor**, enable pgvector:
   ```sql
   create extension if not exists vector with schema extensions;
   ```

### 2. OpenAI

Create an API key at https://platform.openai.com/api-keys → `OPENAI_API_KEY`.

### 3. Stripe

1. In test mode, find your secret key at **Developers → API keys** → `STRIPE_SECRET_KEY`.
2. Create a webhook endpoint pointing to `https://your-domain.com/api/stripe/webhook`.
3. Subscribe to these events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.
4. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

When you are ready to go live, repeat with live-mode keys and update the env vars.

### 4. Upstash Redis

Create a Redis database at https://console.upstash.com → copy **REST URL** and **REST Token**.

### 5. Environment variables

Add all of the following to your Vercel project (**Settings → Environment Variables**):

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# NextAuth
NEXTAUTH_SECRET=<output of: openssl rand -base64 32>
NEXTAUTH_URL=https://your-production-domain.com

# App
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

### 6. Deploy to Vercel

1. Import the repo at https://vercel.com/new.
2. Set the **Root Directory** to `apps/web`.
3. Vercel will detect Next.js automatically — no framework config changes needed.
4. Add the environment variables from step 5.
5. Add a **Build Command** override so the widget is bundled and served:
   ```
   cd ../.. && pnpm --filter widget build && cp apps/widget/dist/widget.js apps/web/public/widget.js && cd apps/web && next build
   ```
6. Click **Deploy**.

### 7. Apply migrations in production

Run this once after the first deploy (and after any schema changes):

```bash
pnpm db:migrate
```

Or trigger it automatically by adding `pnpm db:migrate &&` before the build command in Vercel.

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

To test Stripe events locally, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and forward webhooks to your dev server:

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a webhook signing secret — add it as `STRIPE_WEBHOOK_SECRET` in `apps/web/.env.local`.
