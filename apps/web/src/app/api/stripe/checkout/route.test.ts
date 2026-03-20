jest.mock("stripe", () => {
  const mockPortalCreate = jest.fn();
  const mockCustomersCreate = jest.fn();
  const mockSessionsCreate = jest.fn();
  const MockStripe = jest.fn().mockImplementation(() => ({
    billingPortal: { sessions: { create: mockPortalCreate } },
    customers: { create: mockCustomersCreate },
    checkout: { sessions: { create: mockSessionsCreate } },
  }));
  // Expose mocks on the constructor for test access
  (MockStripe as unknown as Record<string, unknown>)._mockPortalCreate = mockPortalCreate;
  (MockStripe as unknown as Record<string, unknown>)._mockCustomersCreate = mockCustomersCreate;
  (MockStripe as unknown as Record<string, unknown>)._mockSessionsCreate = mockSessionsCreate;
  return { __esModule: true, default: MockStripe };
});

const mockPrisma = {
  subscription: { findFirst: jest.fn() },
};

jest.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  requireTenantId: jest.fn(),
}));

import { NextRequest } from "next/server";
import Stripe from "stripe";
import { POST } from "./route";
import { requireTenantId } from "@/lib/db";

const MockStripe = Stripe as unknown as Record<string, jest.Mock>;
const mockRequireTenantId = requireTenantId as jest.Mock;

function mockStripeInstance() {
  return (Stripe as jest.Mock).mock.results.at(-1)?.value as {
    billingPortal: { sessions: { create: jest.Mock } };
    customers: { create: jest.Mock };
    checkout: { sessions: { create: jest.Mock } };
  };
}

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/stripe/checkout", { method: "POST" });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env["STRIPE_SECRET_KEY"] = "sk_test_123";
  process.env["STRIPE_PRICE_ID"] = "price_test_123";
  process.env["NEXT_PUBLIC_BASE_URL"] = "http://localhost:3000";
  mockRequireTenantId.mockResolvedValue("tenant-123");
  mockPrisma.subscription.findFirst.mockResolvedValue(null);
  MockStripe._mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
  MockStripe._mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/abc" });
  MockStripe._mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/xyz" });
});

afterEach(() => {
  delete process.env["STRIPE_SECRET_KEY"];
  delete process.env["STRIPE_PRICE_ID"];
});

describe("POST /api/stripe/checkout", () => {
  test("creates a checkout session for a new customer and returns the URL", async () => {
    const res = await POST(makeRequest());
    const body = await res.json() as { success: boolean; data: { url: string } };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.url).toBe("https://checkout.stripe.com/pay/abc");
  });

  test("creates a new Stripe customer when none exists", async () => {
    await POST(makeRequest());
    const stripe = mockStripeInstance();
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { tenantId: "tenant-123" } })
    );
  });

  test("uses existing stripeCustomerId when available but no subscription", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      stripeCustomerId: "cus_existing",
      stripeSubscriptionId: null,
    });
    await POST(makeRequest());
    const stripe = mockStripeInstance();
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    );
  });

  test("includes tenantId in session metadata", async () => {
    await POST(makeRequest());
    const stripe = mockStripeInstance();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { tenantId: "tenant-123" } })
    );
  });

  test("redirects existing customer with subscription to Customer Portal", async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      stripeCustomerId: "cus_existing",
      stripeSubscriptionId: "sub_existing",
    });
    const res = await POST(makeRequest());
    const body = await res.json() as { data: { url: string } };

    const stripe = mockStripeInstance();
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    );
    expect(body.data.url).toBe("https://billing.stripe.com/session/xyz");
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  test("returns 503 when STRIPE_SECRET_KEY is not set", async () => {
    delete process.env["STRIPE_SECRET_KEY"];
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
  });

  test("returns 503 when STRIPE_PRICE_ID is not set", async () => {
    delete process.env["STRIPE_PRICE_ID"];
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
  });

  test("returns 401 when not authenticated", async () => {
    mockRequireTenantId.mockRejectedValue(
      new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });
});
