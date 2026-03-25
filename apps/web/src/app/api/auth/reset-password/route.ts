import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ok, err } from "@integriochat/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      token?: string;
      password?: string;
    };

    const { token, password } = body;
    if (!token || typeof token !== "string") return err("Token is required", 422);
    if (!password || typeof password !== "string" || password.length < 8) {
      return err("Password must be at least 8 characters", 422);
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record) return err("Invalid or expired reset link", 400);
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return err("Reset link has expired — please request a new one", 400);
    }

    const user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) return err("User not found", 404);

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    // Single-use token — delete after successful reset
    await prisma.passwordResetToken.delete({ where: { token } });

    return ok({ reset: true });
  } catch (e) {
    console.error("[POST /api/auth/reset-password]", e);
    return err("Internal server error", 500);
  }
}
