import { PrismaClient } from "@prisma/client";

// Supabase routes queries through PgBouncer (transaction pooling mode).
// PgBouncer in transaction mode cannot handle PostgreSQL prepared statements,
// so we must disable them. Adding ?pgbouncer=true tells Prisma to skip them.
// connection_limit=1 prevents Prisma from opening multiple connections per
// serverless function invocation (each Lambda already gets its own client).
function buildDatasourceUrl(): string {
  const url = process.env["DATABASE_URL"] ?? "";
  if (!url || url.includes("pgbouncer=true")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}pgbouncer=true&connection_limit=1`;
}

// PrismaClient singleton — prevents connection pool exhaustion in dev (Next.js HMR)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: { db: { url: buildDatasourceUrl() } },
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
