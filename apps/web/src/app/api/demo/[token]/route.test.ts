const mockPrisma = {
  demoLink: {
    findUnique: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  requireTenantId: jest.fn(),
  getTenantId: jest.fn(),
  applyTenantMiddleware: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest(token: string): NextRequest {
  return new NextRequest(`http://localhost/api/demo/${token}`);
}

function makeParams(token: string) {
  return { params: { token } };
}

const futureDateISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const pastDateISO = new Date(Date.now() - 1);

const mockDemoLink = {
  id: "link-uuid-1",
  token: "valid-token-abc",
  chatbotId: "bot-uuid-1",
  expiresAt: futureDateISO,
  tenantId: "tenant-123",
  chatbot: {
    id: "bot-uuid-1",
    name: "Acme Support Bot",
    tone: "professional",
    isActive: true,
  },
};

// ─── GET /api/demo/[token] ────────────────────────────────────────────────────

describe("GET /api/demo/[token]", () => {
  test("returns chatbot info for a valid, non-expired token", async () => {
    mockPrisma.demoLink.findUnique.mockResolvedValue(mockDemoLink);

    const response = await GET(makeRequest("valid-token-abc"), makeParams("valid-token-abc"));
    const body = await response.json() as { success: boolean; data: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.chatbotId).toBe("bot-uuid-1");
    expect(body.data.chatbotName).toBe("Acme Support Bot");
  });

  test("returns 404 for an unrecognised token", async () => {
    mockPrisma.demoLink.findUnique.mockResolvedValue(null);

    const response = await GET(makeRequest("invalid-token"), makeParams("invalid-token"));
    const body = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Demo not found");
  });

  test("returns 410 for an expired token", async () => {
    mockPrisma.demoLink.findUnique.mockResolvedValue({
      ...mockDemoLink,
      expiresAt: pastDateISO,
    });

    const response = await GET(makeRequest("expired-token"), makeParams("expired-token"));
    const body = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(410);
    expect(body.error).toBe("Demo link has expired");
  });

  test("returns 403 when the chatbot is inactive", async () => {
    mockPrisma.demoLink.findUnique.mockResolvedValue({
      ...mockDemoLink,
      chatbot: { ...mockDemoLink.chatbot, isActive: false },
    });

    const response = await GET(makeRequest("inactive-bot-token"), makeParams("inactive-bot-token"));
    const body = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Chatbot is inactive");
  });

  test("response includes expiresAt as ISO string", async () => {
    mockPrisma.demoLink.findUnique.mockResolvedValue(mockDemoLink);

    const response = await GET(makeRequest("valid-token-abc"), makeParams("valid-token-abc"));
    const body = await response.json() as { data: { expiresAt: string } };

    expect(typeof body.data.expiresAt).toBe("string");
    expect(() => new Date(body.data.expiresAt)).not.toThrow();
  });

  test("looks up demoLink by the token in the URL", async () => {
    mockPrisma.demoLink.findUnique.mockResolvedValue(null);

    await GET(makeRequest("my-unique-token"), makeParams("my-unique-token"));

    expect(mockPrisma.demoLink.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: "my-unique-token" } })
    );
  });

  test("returns 500 on unexpected error", async () => {
    mockPrisma.demoLink.findUnique.mockRejectedValue(new Error("DB failure"));

    const response = await GET(makeRequest("any"), makeParams("any"));
    expect(response.status).toBe(500);
  });
});
