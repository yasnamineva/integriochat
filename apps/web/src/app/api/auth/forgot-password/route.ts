import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, err } from "@integriochat/utils";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string };
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    if (!email) return err("Email is required", 422);

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return ok({ sent: true });

    // Invalidate any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    await sendPasswordResetEmail(email, token);

    return ok({ sent: true });
  } catch (e) {
    console.error("[POST /api/auth/forgot-password]", e);
    return err("Internal server error", 500);
  }
}
