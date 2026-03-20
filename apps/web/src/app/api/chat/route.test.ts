// ── Mocks (factories must be self-contained — no outer-variable references) ───

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("ai", () => ({
  __esModule: true,
  OpenAIStream: jest.fn(),
  StreamingTextResponse: jest.fn(),
}));

jest.mock("@/services/embedding.service", () => ({
  retrieveContext: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    chatbot: { findFirst: jest.fn() },
    message: { create: jest.fn(), findMany: jest.fn() },
    customQA: { findMany: jest.fn() },
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { retrieveContext } from "@/services/embedding.service";
import { prisma } from "@/lib/db";
import { POST } from "./route";

// ── Typed mock helpers ────────────────────────────────────────────────────────

const MockOpenAI = OpenAI as jest.Mock;
const mockOpenAIStream = OpenAIStream as jest.Mock;
const mockStreamingTextResponse = StreamingTextResponse as jest.Mock;
const mockRetrieveContext = retrieveContext as jest.Mock;
const mockPrisma = prisma as {
  chatbot: { findFirst: jest.Mock };
  message: { create: jest.Mock; findMany: jest.Mock };
  customQA: { findMany: jest.Mock };
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

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
  isActive: true,
  tenant: {
    allowedDomains: [],
    subscriptions: [{ status: "ACTIVE", createdAt: new Date() }],
  },
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let mockCreate: jest.Mock;
let capturedOnFinal: ((text: string) => Promise<void>) | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnFinal = undefined;

  // Wire up new OpenAI() → mock instance with a create fn we can inspect
  mockCreate = jest.fn().mockResolvedValue({});
  MockOpenAI.mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));

  // OpenAIStream captures the onFinal callback and returns a dummy stream
  mockOpenAIStream.mockImplementation(
    (_stream: unknown, opts?: { onFinal?: (t: string) => Promise<void> }) => {
      capturedOnFinal = opts?.onFinal;
      return new ReadableStream();
    }
  );

  // StreamingTextResponse wraps the stream in a 200 Response
  mockStreamingTextResponse.mockImplementation((stream: ReadableStream) => {
    return new Response(stream, { status: 200 });
  });

  mockRetrieveContext.mockResolvedValue([]);
  mockPrisma.chatbot.findFirst.mockResolvedValue(mockChatbot);
  mockPrisma.message.create.mockResolvedValue({});
  mockPrisma.message.findMany.mockResolvedValue([]);
  mockPrisma.customQA.findMany.mockResolvedValue([]);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/chat", () => {
  test("returns 200 streaming response for valid request", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
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

  test("logs assistant reply to database via onFinal callback", async () => {
    await POST(makeRequest(validBody));
    expect(capturedOnFinal).toBeDefined();

    await capturedOnFinal!("This is the assistant reply.");

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
      tenant: {
        allowedDomains: ["https://allowed.com"],
        subscriptions: [{ status: "ACTIVE" }],
      },
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
});
