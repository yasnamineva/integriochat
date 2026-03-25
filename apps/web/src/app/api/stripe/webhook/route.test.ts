const mockConstructEvent = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  })),
}));

const mockPrisma = {
  subscription: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body = "{}", sig = "stripe-sig-abc"): NextRequest {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "stripe-signature": sig,
    },
  });
}

function makeEvent(type: string, data: Record<string, unknown>): object {
  return { type, data: { object: data } };
}

const mockStripeSub = {
  status: "active",
  trial_end: null,
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
  items: { data: [] },
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env["STRIPE_WEBHOOK_SECRET"] = "whsec_test";
  process.env["STRIPE_SECRET_KEY"] = "sk_test_123";
  mockSubscriptionsRetrieve.mockResolvedValue(mockStripeSub);
  mockPrisma.subscription.findFirst.mockResolvedValue(null);
  mockPrisma.subscription.create.mockResolvedValue({});
  mockPrisma.subscription.update.mockResolvedValue({});
});

afterEach(() => {
  delete process.env["STRIPE_WEBHOOK_SECRET"];
  delete process.env["STRIPE_SECRET_KEY"];
});

describe("POST /api/stripe/webhook", () => {
  // ── Signature verification ───────────────────────────────────────────────

  test("returns 400 when stripe-signature header is missing", async () => {
    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("returns 400 when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env["STRIPE_WEBHOOK_SECRET"];
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  test("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error("Bad sig"); });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  // ── checkout.session.completed ────────────────────────────────────────────

  test("checkout.session.completed creates subscription for new tenant", async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {
        id: "cs_test",
        customer: "cus_123",
        subscription: "sub_123",
        metadata: { tenantId: "tenant-abc" },
      })
    );
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-abc",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          status: "ACTIVE",
        }),
      })
    );
  });

  test("checkout.session.completed updates existing subscription", async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {
        customer: "cus_123",
        subscription: "sub_123",
        metadata: { tenantId: "tenant-abc" },
      })
    );
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: "existing-id" });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "existing-id" } })
    );
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
  });

  test("checkout.session.completed sets TRIALING status for trialing subscription", async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {
        customer: "cus_123",
        subscription: "sub_123",
        metadata: { tenantId: "tenant-abc" },
      })
    );
    mockSubscriptionsRetrieve.mockResolvedValue({
      ...mockStripeSub,
      status: "trialing",
      trial_end: Math.floor(Date.now() / 1000) + 14 * 24 * 3600,
    });

    await POST(makeRequest());
    expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "TRIALING" }),
      })
    );
  });

  test("checkout.session.completed logs error and returns 200 when tenantId is missing", async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent("checkout.session.completed", {
        customer: "cus_123",
        subscription: "sub_123",
        metadata: {},
      })
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
  });

  // ── invoice.paid ─────────────────────────────────────────────────────────

  test("invoice.paid updates subscription to ACTIVE with new period end", async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent("invoice.paid", { id: "in_123", subscription: "sub_123" })
    );

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_123" },
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
  });

  // ── invoice.payment_failed ────────────────────────────────────────────────

  test("invoice.payment_failed updates subscription to PAST_DUE", async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent("invoice.payment_failed", { id: "in_fail", subscription: "sub_123" })
    );

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_123" },
        data: { status: "PAST_DUE" },
      })
    );
  });

  // ── customer.subscription.deleted ────────────────────────────────────────

  test("customer.subscription.deleted updates subscription to CANCELED", async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent("customer.subscription.deleted", { id: "sub_123", status: "canceled" })
    );

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: "sub_123" },
        data: expect.objectContaining({ status: "CANCELED", canceledAt: expect.any(Date) }),
      })
    );
  });

  // ── Unknown events ────────────────────────────────────────────────────────

  test("returns 200 for unhandled event types without throwing", async () => {
    mockConstructEvent.mockReturnValue(makeEvent("customer.created", { id: "cus_new" }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });
});
