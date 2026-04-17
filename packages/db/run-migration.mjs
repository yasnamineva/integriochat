/**
 * Runs raw SQL migrations via the Supabase connection pooler (port 6543).
 * Usage: DATABASE_URL=<pooler_url> node run-migration.mjs
 *
 * Direct port 5432 is blocked in this environment — the pooler URL on port
 * 6543 must be used instead (transaction mode).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Running migration...");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "subscriptions"
    ADD COLUMN IF NOT EXISTS "usageCapCents" INTEGER;
  `);

  console.log("Migration complete: added usageCapCents to subscriptions.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
