"use client";

import { useState } from "react";
import { Button } from "@integriochat/ui";

interface Props {
  hasActiveSubscription: boolean;
}

export function CheckoutButton({ hasActiveSubscription }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json() as { data?: { url: string | null }; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={() => { void handleClick(); }} loading={loading}>
        {hasActiveSubscription ? "Manage Subscription" : "Upgrade to Pro"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
