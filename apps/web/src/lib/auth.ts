import type { NextAuthOptions, Session, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@integriochat/db";
import { LoginSchema } from "@integriochat/utils";

// ─── Exported for unit testing ────────────────────────────────────────────────

/**
 * Core credential-check logic, extracted so it can be tested independently
 * of the NextAuth CredentialsProvider wrapper.
 */
export async function authorizeUser(
  credentials: Record<string, string> | undefined
): Promise<(NextAuthUser & { tenantId: string; role: string }) | null> {
  const parsed = LoginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    tenantId: user.tenantId,
    role: user.role,
  } as NextAuthUser & { tenantId: string; role: string };
}

// ─── NextAuth options ─────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  // NEXTAUTH_SECRET must be set in .env — asserting non-null here; the server
  // will fail to start at runtime if the variable is missing, which is correct.
  secret: process.env["NEXTAUTH_SECRET"] ?? (() => { throw new Error("NEXTAUTH_SECRET is not set"); })(),
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeUser,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Persist extra fields into the JWT on sign-in
        const u = user as NextAuthUser & { tenantId: string; role: string };
        token["userId"] = u.id;
        token["tenantId"] = u.tenantId;
        token["role"] = u.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as Record<string, unknown>)["id"] = token["userId"];
        (session.user as Record<string, unknown>)["tenantId"] = token["tenantId"];
        (session.user as Record<string, unknown>)["role"] = token["role"];
      }
      return session;
    },
  },
};
