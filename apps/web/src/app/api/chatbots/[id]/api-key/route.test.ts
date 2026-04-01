const mockPrisma = {
  subscription: { findFirst: jest.fn() },
  chatbot: { findFirst: jest.fn() },
  $queryRawUnsafe: jest.fn(),
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  requireTenantId: jest.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { requireTenantId } from "@/lib/db";

const PARAMS = { params: { id: "bot-uuid-1" } };

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/chatbots/bot-uuid-1/api-key", {
    method: "POST",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
});

describe("POST /api/chatbots/[id]/api-key", () => {
  test("returns 403 for FREE plan (no apiAccess)", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "FREE" });

    const res = await POST(makeRequest(), PARAMS);
    const body = await res.json() as { success: boolean; error: string };

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/HOBBY plan or higher/);
  });

  test("returns 403 when no subscription exists (defaults to FREE)", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest(), PARAMS);
    expect(res.status).toBe(403);
  });

  test("returns 404 when chatbot not found on HOBBY plan", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "HOBBY" });
    mockPrisma.chatbot.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  test("regenerates and returns new API key on HOBBY plan", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "HOBBY" });
    mockPrisma.chatbot.findFirst.mockResolvedValue({ id: "bot-uuid-1" });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ apiKey: "cb_newkey123" }]);

    const res = await POST(makeRequest(), PARAMS);
    const body = await res.json() as { success: boolean; data: { apiKey: string } };

    expect(res.status).toBe(200);
    expect(body.data.apiKey).toBe("cb_newkey123");
  });

  test("allows STANDARD, PRO, and ENTERPRISE plans", async () => {
    for (const plan of ["STANDARD", "PRO", "ENTERPRISE", "USAGE"]) {
      jest.clearAllMocks();
      (requireTenantId as jest.Mock).mockResolvedValue("tenant-123");
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan });
      mockPrisma.chatbot.findFirst.mockResolvedValue({ id: "bot-uuid-1" });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ apiKey: "cb_key" }]);

      const res = await POST(makeRequest(), PARAMS);
      expect(res.status).toBe(200);
    }
  });

  test("returns 401 when unauthenticated", async () => {
    (requireTenantId as jest.Mock).mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );

    const res = await POST(makeRequest(), PARAMS);
    expect(res.status).toBe(401);
  });
});
