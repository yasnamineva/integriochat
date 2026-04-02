import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import type { ZodError } from "zod";
import { prisma } from "@integriochat/db";
import { ok, err } from "@integriochat/utils";
import { RegisterSchema } from "@integriochat/utils";

function friendlyZodError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input.";
  const field = issue.path[0];
  if (field === "email") return "Please enter a valid email address.";
  if (field === "password") {
    if (issue.code === "too_small") return "Password must be at least 8 characters.";
    return "Invalid password.";
  }
  if (field === "companyName") return "Company name is required.";
  if (field === "name") return "Please enter your name.";
  return issue.message;
}

/** Derive a URL-safe slug from a company name. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return err(friendlyZodError(parsed.error), 422);
    }

    const { email, password, name, companyName } = parsed.data;

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return err("Email already in use", 409);
    }

    const baseSlug = toSlug(companyName);

    // Ensure slug uniqueness by appending a numeric suffix if needed
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create Tenant + User + free Subscription atomically
    const user = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: companyName, slug },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "FREE",
          status: "ACTIVE",
        },
      });

      return tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          password: passwordHash,
          name: name ?? null,
          role: "ADMIN",
        },
        select: { id: true, email: true, name: true, tenantId: true, role: true },
      });
    });

    return ok({ id: user.id, email: user.email, name: user.name, tenantId: user.tenantId }, 201);
  } catch (e) {
    console.error("[POST /api/auth/register]", e);
    return err("Internal server error", 500);
  }
}
