-- ============================================================
-- Full schema — paste this into Supabase SQL Editor to apply
-- Run once on a fresh database (all statements are idempotent)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

-- Enums
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('FREE', 'HOBBY', 'STANDARD', 'PRO', 'ENTERPRISE', 'USAGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- tenants
CREATE TABLE IF NOT EXISTS "tenants" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "name"           TEXT        NOT NULL,
  "slug"           TEXT        NOT NULL,
  "allowedDomains" TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "tenants"("slug");

-- users
CREATE TABLE IF NOT EXISTS "users" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  UUID         NOT NULL,
  "email"     TEXT         NOT NULL,
  "password"  TEXT         NOT NULL,
  "role"      "Role"       NOT NULL DEFAULT 'CLIENT',
  "name"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key"     ON "users"("email");
CREATE INDEX        IF NOT EXISTS "users_tenantId_idx"  ON "users"("tenantId");
ALTER TABLE "users" ADD CONSTRAINT IF NOT EXISTS "users_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- chatbots
CREATE TABLE IF NOT EXISTS "chatbots" (
  "id"                    UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"              UUID         NOT NULL,
  "name"                  TEXT         NOT NULL,
  "systemPrompt"          TEXT         NOT NULL,
  "tone"                  TEXT         NOT NULL DEFAULT 'professional',
  "leadCapture"           BOOLEAN      NOT NULL DEFAULT false,
  "isActive"              BOOLEAN      NOT NULL DEFAULT true,
  -- website training
  "websiteUrl"            TEXT,
  "scrapeStatus"          TEXT         NOT NULL DEFAULT 'idle',
  "lastScrapedAt"         TIMESTAMP(3),
  "autoRetrain"           BOOLEAN      NOT NULL DEFAULT false,
  -- AI configuration
  "aiModel"               TEXT         NOT NULL DEFAULT 'gpt-4o-mini',
  "temperature"           DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "maxTokens"             INTEGER      NOT NULL DEFAULT 500,
  "fallbackMsg"           TEXT         NOT NULL DEFAULT 'I''m sorry, I don''t have enough information to answer that. Please contact our support team for help.',
  -- appearance / white-label
  "chatTitle"             TEXT,
  "chatAvatar"            TEXT,
  "themeColor"            TEXT         NOT NULL DEFAULT '#6366f1',
  "widgetPosition"        TEXT         NOT NULL DEFAULT 'bottom-right',
  "widgetTheme"           TEXT         NOT NULL DEFAULT 'light',
  "initialMessage"        TEXT         NOT NULL DEFAULT 'Hi! How can I help you today?',
  "suggestedQs"           TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- API access
  "apiKey"                TEXT         NOT NULL DEFAULT concat('cb_', replace(gen_random_uuid()::text, '-', '')),
  -- per-chatbot spending caps (USAGE plan)
  "monthlyMessageLimit"   INTEGER,
  "monthlySpendLimitCents" INTEGER,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chatbots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "chatbots_apiKey_key"    ON "chatbots"("apiKey");
CREATE INDEX        IF NOT EXISTS "chatbots_tenantId_idx"  ON "chatbots"("tenantId");
ALTER TABLE "chatbots" ADD CONSTRAINT IF NOT EXISTS "chatbots_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                   UUID                 NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"             UUID                 NOT NULL,
  "stripeCustomerId"     TEXT,
  "stripeSubscriptionId" TEXT,
  "stripePriceId"        TEXT,
  "stripeItemId"         TEXT,
  "stripeUsageItemId"    TEXT,
  "status"               "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "plan"                 "Plan"               NOT NULL DEFAULT 'FREE',
  "billingPeriod"        "BillingPeriod"      NOT NULL DEFAULT 'MONTHLY',
  "removeBranding"       BOOLEAN              NOT NULL DEFAULT false,
  "trialEndsAt"          TIMESTAMP(3),
  "currentPeriodEnd"     TIMESTAMP(3),
  "canceledAt"           TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
CREATE INDEX        IF NOT EXISTS "subscriptions_tenantId_idx"             ON "subscriptions"("tenantId");
ALTER TABLE "subscriptions" ADD CONSTRAINT IF NOT EXISTS "subscriptions_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- embedding_documents
CREATE TABLE IF NOT EXISTS "embedding_documents" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"    UUID         NOT NULL,
  "chatbotId"   UUID         NOT NULL,
  "content"     TEXT         NOT NULL,
  "embedding"   extensions.vector(1536),
  "sourceUrl"   TEXT         NOT NULL,
  "contentHash" TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "embedding_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "embedding_documents_tenantId_idx"  ON "embedding_documents"("tenantId");
CREATE INDEX IF NOT EXISTS "embedding_documents_chatbotId_idx" ON "embedding_documents"("chatbotId");
ALTER TABLE "embedding_documents"
  ADD CONSTRAINT IF NOT EXISTS "embedding_documents_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "embedding_documents_chatbotId_fkey"
    FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- demo_links
CREATE TABLE IF NOT EXISTS "demo_links" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  UUID         NOT NULL,
  "chatbotId" UUID         NOT NULL,
  "token"     TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demo_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "demo_links_token_key"    ON "demo_links"("token");
CREATE INDEX        IF NOT EXISTS "demo_links_tenantId_idx" ON "demo_links"("tenantId");
CREATE INDEX        IF NOT EXISTS "demo_links_token_idx"    ON "demo_links"("token");
ALTER TABLE "demo_links"
  ADD CONSTRAINT IF NOT EXISTS "demo_links_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "demo_links_chatbotId_fkey"
    FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- messages
CREATE TABLE IF NOT EXISTS "messages" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  UUID         NOT NULL,
  "chatbotId" UUID         NOT NULL,
  "sessionId" TEXT         NOT NULL,
  "role"      TEXT         NOT NULL,
  "content"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "messages_tenantId_idx"  ON "messages"("tenantId");
CREATE INDEX IF NOT EXISTS "messages_chatbotId_idx" ON "messages"("chatbotId");
CREATE INDEX IF NOT EXISTS "messages_sessionId_idx" ON "messages"("sessionId");
ALTER TABLE "messages"
  ADD CONSTRAINT IF NOT EXISTS "messages_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "messages_chatbotId_fkey"
    FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- usage_logs
CREATE TABLE IF NOT EXISTS "usage_logs" (
  "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"   UUID          NOT NULL,
  "chatbotId"  UUID          NOT NULL,
  "tokensUsed" INTEGER       NOT NULL DEFAULT 0,
  "costUsd"    DECIMAL(10,6) NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "usage_logs_tenantId_idx"  ON "usage_logs"("tenantId");
CREATE INDEX IF NOT EXISTS "usage_logs_chatbotId_idx" ON "usage_logs"("chatbotId");
ALTER TABLE "usage_logs"
  ADD CONSTRAINT IF NOT EXISTS "usage_logs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "usage_logs_chatbotId_fkey"
    FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- custom_qas
CREATE TABLE IF NOT EXISTS "custom_qas" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  UUID         NOT NULL,
  "chatbotId" UUID         NOT NULL,
  "question"  TEXT         NOT NULL,
  "answer"    TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_qas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "custom_qas_tenantId_idx"  ON "custom_qas"("tenantId");
CREATE INDEX IF NOT EXISTS "custom_qas_chatbotId_idx" ON "custom_qas"("chatbotId");
ALTER TABLE "custom_qas"
  ADD CONSTRAINT IF NOT EXISTS "custom_qas_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "custom_qas_chatbotId_fkey"
    FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- webhooks
CREATE TABLE IF NOT EXISTS "webhooks" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  UUID         NOT NULL,
  "chatbotId" UUID         NOT NULL,
  "name"      TEXT         NOT NULL,
  "url"       TEXT         NOT NULL,
  "events"    TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "secret"    TEXT         NOT NULL DEFAULT concat('wh_', replace(gen_random_uuid()::text, '-', '')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "webhooks_tenantId_idx"  ON "webhooks"("tenantId");
CREATE INDEX IF NOT EXISTS "webhooks_chatbotId_idx" ON "webhooks"("chatbotId");
ALTER TABLE "webhooks"
  ADD CONSTRAINT IF NOT EXISTS "webhooks_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "webhooks_chatbotId_fkey"
    FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "email"     TEXT         NOT NULL,
  "token"     TEXT         NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key"  ON "password_reset_tokens"("token");
CREATE INDEX        IF NOT EXISTS "password_reset_tokens_email_idx"  ON "password_reset_tokens"("email");
