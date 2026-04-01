import crypto from "crypto";

function sha256(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const mockPrisma = {
  passwordResetToken: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const PLAIN_TOKEN = "abc123plaintoken";
const TOKEN_HASH = sha256(PLAIN_TOKEN);

const validRecord = {
  email: "user@example.com",
  token: TOKEN_HASH,
  expiresAt: new Date(Date.now() + 60_000),
};

beforeEach(() => jest.clearAllMocks());

describe("POST /api/auth/reset-password", () => {
  test("returns 422 when token is missing", async () => {
    const res = await POST(makeRequest({ password: "newpassword123" }));
    expect(res.status).toBe(422);
  });

  test("returns 422 when password is too short", async () => {
    const res = await POST(makeRequest({ token: PLAIN_TOKEN, password: "short" }));
    expect(res.status).toBe(422);
  });

  test("returns 400 when token hash is not found in DB", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: PLAIN_TOKEN, password: "newpassword123" }));
    expect(res.status).toBe(400);

    // Must look up by the hash, not the plain token
    expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: TOKEN_HASH },
    });
  });

  test("returns 400 when token has expired", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      ...validRecord,
      expiresAt: new Date(Date.now() - 1000),
    });
    mockPrisma.passwordResetToken.delete.mockResolvedValue({});

    const res = await POST(makeRequest({ token: PLAIN_TOKEN, password: "newpassword123" }));
    expect(res.status).toBe(400);

    // Expired token must be cleaned up using the hash
    expect(mockPrisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { token: TOKEN_HASH },
    });
  });

  test("resets password and deletes token on success", async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue(validRecord);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", email: "user@example.com" });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.passwordResetToken.delete.mockResolvedValue({});

    const res = await POST(makeRequest({ token: PLAIN_TOKEN, password: "newpassword123" }));
    const body = await res.json() as { success: boolean; data: { reset: boolean } };

    expect(res.status).toBe(200);
    expect(body.data.reset).toBe(true);

    // Token deleted by hash
    expect(mockPrisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { token: TOKEN_HASH },
    });
  });
});
