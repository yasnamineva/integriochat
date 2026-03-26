-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'HOBBY', 'STANDARD', 'PRO', 'ENTERPRISE', 'USAGE');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable chatbots — add all fields missing from the initial migration
ALTER TABLE "chatbots"
  ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "scrapeStatus" TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS "lastScrapedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoRetrain" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "aiModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  ADD COLUMN IF NOT EXISTS "maxTokens" INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS "fallbackMsg" TEXT NOT NULL DEFAULT 'I''m sorry, I don''t have enough information to answer that. Please contact our support team for help.',
  ADD COLUMN IF NOT EXISTS "chatTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "chatAvatar" TEXT,
  ADD COLUMN IF NOT EXISTS "themeColor" TEXT NOT NULL DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS "widgetPosition" TEXT NOT NULL DEFAULT 'bottom-right',
  ADD COLUMN IF NOT EXISTS "widgetTheme" TEXT NOT NULL DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS "initialMessage" TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
  ADD COLUMN IF NOT EXISTS "suggestedQs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "apiKey" TEXT NOT NULL DEFAULT concat('cb_', replace(gen_random_uuid()::text, '-', '')),
  ADD COLUMN IF NOT EXISTS "monthlyMessageLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "monthlySpendLimitCents" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "chatbots_apiKey_key" ON "chatbots"("apiKey");

-- AlterTable subscriptions — add plan, billing period, and new Stripe columns
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "stripeItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeUsageItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "removeBranding" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable custom_qas
CREATE TABLE IF NOT EXISTS "custom_qas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "chatbotId" UUID NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_qas_pkey" PRIMARY KEY ("id")
);

-- CreateTable webhooks
CREATE TABLE IF NOT EXISTS "webhooks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "chatbotId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "events" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "secret" TEXT NOT NULL DEFAULT concat('wh_', replace(gen_random_uuid()::text, '-', '')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "custom_qas_tenantId_idx" ON "custom_qas"("tenantId");
CREATE INDEX IF NOT EXISTS "custom_qas_chatbotId_idx" ON "custom_qas"("chatbotId");
CREATE INDEX IF NOT EXISTS "webhooks_tenantId_idx" ON "webhooks"("tenantId");
CREATE INDEX IF NOT EXISTS "webhooks_chatbotId_idx" ON "webhooks"("chatbotId");
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- AddForeignKey
ALTER TABLE "custom_qas"
  ADD CONSTRAINT "custom_qas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_qas"
  ADD CONSTRAINT "custom_qas_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "webhooks"
  ADD CONSTRAINT "webhooks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhooks"
  ADD CONSTRAINT "webhooks_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
