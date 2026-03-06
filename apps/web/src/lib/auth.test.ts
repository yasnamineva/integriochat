jest.mock("@integriochat/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
  applyTenantMiddleware: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  default: {
    compare: jest.fn(),
  },
  compare: jest.fn(),
}));

import { authorizeUser, authOptions } from "./auth";
import { prisma } from "@integriochat/db";
import bcrypt from "bcryptjs";

const mockUser = {
  id: "user-uuid-1",
  email: "test@example.com",
  password: "$2b$10$hashedpassword",
  tenantId: "tenant-uuid-1",
  role: "CLIENT" as const,
  name: "Test User",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── authorizeUser() ──────────────────────────────────────────────────────────

describe("authorizeUser()", () => {
  test("returns null when credentials are undefined", async () => {
    const result = await authorizeUser(undefined);
    expect(result).toBeNull();
  });

  test("returns null when email is invalid", async () => {
    const result = await authorizeUser({ email: "not-an-email", password: "password123" });
    expect(result).toBeNull();
  });

  test("returns null when password is too short", async () => {
    const result = await authorizeUser({ email: "test@example.com", password: "short" });
    expect(result).toBeNull();
  });

  test("returns null when user is not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await authorizeUser({ email: "unknown@example.com", password: "password123" });
    expect(result).toBeNull();
  });

  test("queries database by email", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await authorizeUser({ email: "test@example.com", password: "password123" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  test("returns null when password does not match", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await authorizeUser({ email: "test@example.com", password: "wrongpassword" });
    expect(result).toBeNull();
  });

  test("compares password against stored hash", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await authorizeUser({ email: "test@example.com", password: "mypassword" });

    expect(bcrypt.compare).toHaveBeenCalledWith("mypassword", mockUser.password);
  });

  test("returns user object for valid credentials", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authorizeUser({ email: "test@example.com", password: "correctpassword" });

    expect(result).toMatchObject({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      tenantId: mockUser.tenantId,
      role: mockUser.role,
    });
  });

  test("handles null user.name — returns undefined for name", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, name: null });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await authorizeUser({ email: "test@example.com", password: "correctpassword" });
    // null name is coerced to undefined (intentional — NextAuth expects undefined not null)
    expect(result?.name).toBeUndefined();
  });
});

// ─── authOptions ──────────────────────────────────────────────────────────────

describe("authOptions", () => {
  test("uses jwt session strategy", () => {
    expect(authOptions.session?.strategy).toBe("jwt");
  });

  test("redirects to /login for sign-in", () => {
    expect(authOptions.pages?.signIn).toBe("/login");
  });

  test("has exactly one provider", () => {
    expect(authOptions.providers).toHaveLength(1);
  });

  test("JWT callback persists userId, tenantId, role", async () => {
    const jwt = authOptions.callbacks?.jwt;
    if (!jwt) throw new Error("jwt callback missing");

    const token = {} as Parameters<typeof jwt>[0]["token"];
    const user = { id: "user-1", tenantId: "tenant-1", role: "CLIENT" } as Parameters<typeof jwt>[0]["user"];

    const result = await jwt({ token, user, account: null, trigger: "signIn" });

    expect(result["userId"]).toBe("user-1");
    expect(result["tenantId"]).toBe("tenant-1");
    expect(result["role"]).toBe("CLIENT");
  });

  test("session callback copies token fields to session.user", async () => {
    const sessionCb = authOptions.callbacks?.session;
    if (!sessionCb) throw new Error("session callback missing");

    const session = { user: {}, expires: "" } as Parameters<typeof sessionCb>[0]["session"];
    const token = { userId: "user-1", tenantId: "tenant-1", role: "ADMIN" } as Parameters<typeof sessionCb>[0]["token"];

    const result = await sessionCb({ session, token });

    expect((result.user as Record<string, unknown>)["id"]).toBe("user-1");
    expect((result.user as Record<string, unknown>)["tenantId"]).toBe("tenant-1");
    expect((result.user as Record<string, unknown>)["role"]).toBe("ADMIN");
  });
});
