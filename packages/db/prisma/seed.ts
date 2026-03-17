/**
 * Dev seed: creates a demo tenant + admin user so the app works out-of-the-box.
 *
 * Run:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm --filter @chatbot/db db:seed
 *
 * Credentials:
 *   Email:    admin@demo.com
 *   Password: password123
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@demo.com";
  const password = "password123";
  const companyName = "Demo Company";
  const slug = "demo-company";

  // Upsert tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: { name: companyName, slug, allowedDomains: [] },
  });

  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // Upsert user
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      tenantId: tenant.id,
      email,
      password: passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  console.log(`User: ${user.email} (${user.id})`);
  console.log("\nLogin credentials:");
  console.log("  Email:    admin@demo.com");
  console.log("  Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
