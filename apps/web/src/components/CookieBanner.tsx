"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if consent has not already been recorded
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          We use a session cookie to keep you signed in. No advertising or
          tracking cookies.{" "}
          <Link href="/privacy" className="text-indigo-600 underline">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={decline}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
