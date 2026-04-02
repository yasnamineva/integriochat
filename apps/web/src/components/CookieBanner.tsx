"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent";
const LEGAL_PAGES = ["/privacy", "/tos"];

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only show if consent has not already been recorded
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  function dismiss(value: "accepted" | "declined") {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
    // When accepting/declining from a legal page, return the user to where they came from
    if (LEGAL_PAGES.includes(pathname)) {
      router.back();
    }
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
            onClick={() => dismiss("declined")}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={() => dismiss("accepted")}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
