"use client";

import { useState } from "react";
import { Button } from "@integriochat/ui";
import { PLANS, USAGE_BILLED_PER_MESSAGE } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

interface Props {
  currentPlanId: PlanId;
  hasStripeSubscription: boolean;
}

export function PlanSelector({ currentPlanId, hasStripeSubscription }: Props) {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(planId: PlanId) {
    setLoading(planId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, annual }),
      });
      const data = await res.json() as { data?: { url?: string; upgraded?: boolean }; error?: string };
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      if (data.data?.url) {
        // New subscription → Stripe Checkout
        window.location.href = data.data.url;
      } else if (data.data?.upgraded) {
        // Existing subscription updated server-side → reload to show new plan
        window.location.href = "/billing?success=true";
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(null);
    }
  }

  // FREE and ENTERPRISE are not shown in the selector
  const planOrder: PlanId[] = ["HOBBY", "STANDARD", "PRO", "USAGE"];

  return (
    <div className="flex flex-col gap-6">
      {/* Billing period toggle — not applicable to USAGE (metered) */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${!annual ? "text-gray-900" : "text-gray-400"}`}>
          Monthly
        </span>
        <button
          type="button"
          onClick={() => setAnnual((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            annual ? "bg-brand-500" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              annual ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${annual ? "text-gray-900" : "text-gray-400"}`}>
          Annual
          <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            Save 20%
          </span>
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {planOrder.map((planId) => {
          const plan = PLANS[planId];
          if (!plan) return null;
          const isCurrent = planId === currentPlanId;
          // USAGE plan has no annual pricing
          const price = planId === "USAGE" ? 0 : annual ? plan.annualPrice : plan.monthlyPrice;

          return (
            <div
              key={planId}
              onClick={!isCurrent ? () => { void handleSelect(planId); } : undefined}
              className={`relative flex flex-col rounded-2xl border p-5 transition-shadow ${
                plan.highlighted ? "border-brand-500 shadow-md" : "border-gray-200"
              } ${isCurrent ? "bg-brand-50" : "bg-white cursor-pointer hover:shadow-lg hover:border-brand-400"}`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  {planId === "USAGE" ? (
                    <span className="text-xl font-bold text-gray-900">Metered</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-gray-900">${price}</span>
                      <span className="text-sm text-gray-500">/mo</span>
                    </>
                  )}
                </div>
                {annual && planId !== "USAGE" && price > 0 && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    billed ${price * 12}/yr
                  </p>
                )}
                {planId === "USAGE" && (
                  <p className="mt-0.5 text-xs text-gray-400">no monthly commitment — pay only for tokens consumed</p>
                )}
              </div>

              <ul className="mb-4 flex flex-1 flex-col gap-2">
                {plan.featureList.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-0.5 shrink-0 text-brand-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {planId === "USAGE" && (
                <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                  <p className="mb-1.5 font-semibold text-gray-700">Per-message rate</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span>Per AI response</span>
                      <span className="font-mono text-gray-700">${USAGE_BILLED_PER_MESSAGE.toFixed(3)}</span>
                    </div>
                    <div className="mt-1 flex justify-between border-t border-gray-200 pt-1">
                      <span>1,000 messages</span>
                      <span className="font-mono text-gray-700">${(USAGE_BILLED_PER_MESSAGE * 1000).toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="mt-2 leading-relaxed">
                    Each AI response is one billable event — reported to Stripe in real time.
                    Your invoice reflects actual usage at month end.
                    Set per-chatbot monthly caps in the dashboard to prevent unexpected charges.
                  </p>
                </div>
              )}

              {isCurrent ? (
                <Button variant="secondary" size="sm" disabled>
                  Current plan
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); void handleSelect(planId); }}
                  loading={loading === planId}
                  variant={plan.highlighted ? "primary" : "secondary"}
                >
                  Upgrade plan
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Upgrades take effect immediately with prorated billing. Downgrades apply at the next renewal.
        Cancel anytime via the Stripe Customer Portal.
      </p>
    </div>
  );
}
