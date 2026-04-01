import crypto from "crypto";

const mockPrisma = {
  user: { findUnique: jest.fn() },
  passwordResetToken: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/email", () => ({ sendPasswordResetEmail: jest.fn() }));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { sendPasswordResetEmail } from "@/lib/email";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => jest.clearAllMocks());

describe("POST /api/auth/forgot-password", () => {
  test("returns 422 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(422);
  });

  test("returns ok({ sent: true }) even when user does not exist (no enumeration)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "unknown@example.com" }));
    const body = await res.json() as { success: boolean; data: { sent: boolean } };

    expect(res.status).toBe(200);
    expect(body.data.sent).toBe(true);
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  test("stores a SHA-256 hash of the token, not the plain token", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", email: "user@example.com" });
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.passwordResetToken.create.mockResolvedValue({});

    await POST(makeRequest({ email: "user@example.com" }));

    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    const [{ data }] = mockPrisma.passwordResetToken.create.mock.calls[0] as [{ data: { token: string; email: string } }];

    // The stored token must be a 64-char hex string (SHA-256)
    expect(data.token).toMatch(/^[0-9a-f]{64}$/);

    // The plain token that was emailed must hash to the stored value
    const emailedToken = (sendPasswordResetEmail as jest.Mock).mock.calls[0][1] as string;
    const expectedHash = crypto.createHash("sha256").update(emailedToken).digest("hex");
    expect(data.token).toBe(expectedHash);

    // The stored hash must differ from the plain token
    expect(data.token).not.toBe(emailedToken);
  });

  test("invalidates previous tokens for the same email", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u-1", email: "user@example.com" });
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.passwordResetToken.create.mockResolvedValue({});

    await POST(makeRequest({ email: "user@example.com" }));

    expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
  });
});
