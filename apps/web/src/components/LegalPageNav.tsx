"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

const COMPANY = "IntegrioChat";

/**
 * Header nav for public legal pages (/privacy, /tos).
 * Shows "Dashboard" when signed in, "Sign in" otherwise.
 */
export function LegalPageNav() {
  const { status } = useSession();

  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between">
      <Link href="/" className="text-lg font-bold text-indigo-600">
        {COMPANY}
      </Link>
      {status === "authenticated" ? (
        <Link href="/chatbots" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
      ) : (
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
          Sign in
        </Link>
      )}
    </div>
  );
}
