-- Add webSearchEnabled column to chatbots (if not exists)
ALTER TABLE "chatbots"
  ADD COLUMN IF NOT EXISTS "webSearchEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Drop allowedDomains from tenants if it exists (moved to chatbots)
ALTER TABLE "tenants"
  DROP COLUMN IF EXISTS "allowedDomains";

-- CreateTable leads
CREATE TABLE IF NOT EXISTS "leads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "chatbotId" UUID NOT NULL,
  "sessionId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leads_tenantId_idx" ON "leads"("tenantId");
CREATE INDEX IF NOT EXISTS "leads_chatbotId_idx" ON "leads"("chatbotId");
CREATE INDEX IF NOT EXISTS "leads_sessionId_idx" ON "leads"("sessionId");

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leads"
  ADD CONSTRAINT "leads_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
