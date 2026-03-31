// ── Mocks (factories must be self-contained — no outer-variable references) ───

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/services/embedding.service", () => ({
  retrieveContext: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    chatbot: { findFirst: jest.fn() },
    message: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    customQA: { findMany: jest.fn() },
    usageLog: { create: jest.fn() },
  },
}));

jest.mock("@/services/usage.service", () => ({
  checkMessageLimit: jest.fn(),
  checkChatbotLimits: jest.fn(),
  reportMessageUsage: jest.fn(),
  logUsage: jest.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { retrieveContext } from "@/services/embedding.service";
import { prisma } from "@/lib/db";
import { checkMessageLimit, checkChatbotLimits } from "@/services/usage.service";
import { POST } from "./route";

// ── Typed mock helpers ────────────────────────────────────────────────────────

const MockOpenAI = OpenAI as jest.Mock;
const mockRetrieveContext = retrieveContext as jest.Mock;
const mockPrisma = prisma as {
  chatbot: { findFirst: jest.Mock };
  message: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  customQA: { findMany: jest.Mock };
  usageLog: { create: jest.Mock };
};
const mockCheckMessageLimit = checkMessageLimit as jest.Mock;
const mockCheckChatbotLimits = checkChatbotLimits as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Build an async iterable that yields text chunks, simulating OpenAI streaming. */
function makeStream(...chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) {
        yield { choices: [{ delta: { content: text } }] };
      }
    },
  };
}

/** Drain a ReadableStream and return the concatenated text. */
async function drainStream(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

function makeRequest(body: unknown, origin = "https://example.com"): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "origin": origin },
  });
}

const validBody = {
  chatbotId: "123e4567-e89b-12d3-a456-426614174000",
  sessionId: "sess_test123",
  message: "Hello, how can you help me?",
};

const mockChatbot = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Test Bot",
  tenantId: "tenant-123",
  systemPrompt: "You are a helpful assistant.",
  fallbackMsg: "",
  aiModel: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 500,
  isActive: true,
  monthlyMessageLimit: null,
  monthlySpendLimitCents: null,
  allowedDomains: [],
  tenant: {
    subscriptions: [{ status: "ACTIVE", plan: "HOBBY", stripeUsageItemId: null, createdAt: new Date() }],
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let mockCreate: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockCreate = jest.fn().mockResolvedValue(makeStream("assistant reply"));
  MockOpenAI.mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));

  mockRetrieveContext.mockResolvedValue([]);
  mockCheckMessageLimit.mockResolvedValue({ allowed: true, used: 100, limit: 50_000 });
  mockCheckChatbotLimits.mockResolvedValue({ allowed: true });
  mockPrisma.chatbot.findFirst.mockResolvedValue(mockChatbot);
  mockPrisma.message.create.mockResolvedValue({});
  mockPrisma.message.findMany.mockResolvedValue([]);
  mockPrisma.message.count.mockResolvedValue(100);
  mockPrisma.customQA.findMany.mockResolvedValue([]);
  mockPrisma.usageLog.create.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/chat", () => {
  test("returns 200 streaming response for valid request", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  test("streams raw text — no SDK data-stream encoding", async () => {
    mockCreate.mockResolvedValue(makeStream("Hello", " world"));
    const res = await POST(makeRequest(validBody));
    const text = await drainStream(res);
    expect(text).toBe("Hello world");
    // Must NOT contain the Vercel AI SDK data-stream prefix
    expect(text).not.toMatch(/^0:/);
  });

  test("calls OpenAI with model gpt-4o-mini and stream:true", async () => {
    await POST(makeRequest(validBody));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o-mini", stream: true })
    );
  });

  test("passes chatbot system prompt as the first message", async () => {
    await POST(makeRequest(validBody));
    const { messages } = mockCreate.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(messages[0]).toEqual(
      expect.objectContaining({ role: "system", content: "You are a helpful assistant." })
    );
  });

  test("appends RAG context to system prompt when chunks exist", async () => {
    mockRetrieveContext.mockResolvedValue([
      { content: "Our refund policy is 30 days.", sourceUrl: "https://example.com/policy" },
    ]);

    await POST(makeRequest(validBody));

    const { messages } = mockCreate.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(messages[0]!.content).toContain("Our refund policy is 30 days.");
    expect(messages[0]!.content).toContain("https://example.com/policy");
  });

  test("does not modify system prompt when no context chunks exist", async () => {
    await POST(makeRequest(validBody));
    const { messages } = mockCreate.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(messages[0]!.content).toBe("You are a helpful assistant.");
  });

  test("includes conversation history in messages (excluding current message)", async () => {
    mockPrisma.message.findMany.mockResolvedValue([
      { role: "user", content: "Previous question" },
      { role: "assistant", content: "Previous answer" },
      { role: "user", content: validBody.message }, // last item = current, excluded
    ]);

    await POST(makeRequest(validBody));

    const { messages } = mockCreate.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
  });

  test("logs user message to database", async () => {
    await POST(makeRequest(validBody));
    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "user", content: validBody.message }),
      })
    );
  });

  test("logs assistant reply to database after stream completes", async () => {
    mockCreate.mockResolvedValue(makeStream("This is ", "the assistant reply."));
    const res = await POST(makeRequest(validBody));
    await drainStream(res);
    // Allow the post-stream async logging to complete
    await new Promise((r) => setTimeout(r, 10));

    expect(mockPrisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "assistant", content: "This is the assistant reply." }),
      })
    );
  });

  test("returns 422 for invalid request body", async () => {
    const res = await POST(makeRequest({ message: "missing chatbotId" }));
    expect(res.status).toBe(422);
  });

  test("returns 422 for non-UUID chatbotId", async () => {
    const res = await POST(makeRequest({ ...validBody, chatbotId: "not-a-uuid" }));
    expect(res.status).toBe(422);
  });

  test("returns 404 when chatbot does not exist", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  test("returns 403 when subscription is PAST_DUE", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: { ...mockChatbot.tenant, subscriptions: [{ status: "PAST_DUE" }] },
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  test("returns 403 when subscription is CANCELED", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: { ...mockChatbot.tenant, subscriptions: [{ status: "CANCELED" }] },
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  test("returns 403 when no subscription exists", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: { ...mockChatbot.tenant, subscriptions: [] },
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  test("returns 403 when Origin is not in allowedDomains", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      allowedDomains: ["allowed.com"],
    });
    const res = await POST(makeRequest(validBody, "https://notallowed.com"));
    expect(res.status).toBe(403);
  });

  test("allows any origin when allowedDomains is empty", async () => {
    const res = await POST(makeRequest(validBody, "https://any-domain.com"));
    expect(res.status).toBe(200);
  });

  test("works with TRIALING subscription", async () => {
    mockPrisma.chatbot.findFirst.mockResolvedValue({
      ...mockChatbot,
      tenant: { ...mockChatbot.tenant, subscriptions: [{ status: "TRIALING" }] },
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
  });

  test("returns 429 when monthly message limit is reached", async () => {
    mockCheckMessageLimit.mockResolvedValue({ allowed: false, used: 50_000, limit: 50_000 });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Monthly message limit reached");
  });

  test("allows messages when on USAGE plan (no hard limit)", async () => {
    mockCheckMessageLimit.mockResolvedValue({ allowed: true, used: 0, limit: -1 });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
  });

  test("returns 429 when per-chatbot limit is reached", async () => {
    mockCheckChatbotLimits.mockResolvedValue({
      allowed: false,
      reason: "This chatbot has reached its monthly message limit (500 messages).",
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("monthly message limit");
  });
});
