"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@integriochat/ui";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/chatbots", label: "Chatbots" },
  { href: "/analytics", label: "Analytics" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white px-4 py-6">
      <div className="mb-8">
        <span className="text-xl font-bold text-brand-600">Integriochat</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={[
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-brand-50 text-brand-600"
                : "text-gray-600 hover:bg-gray-100",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => { void signOut({ callbackUrl: "/login" }); }}
        className="mt-4 w-full justify-start text-gray-600"
      >
        Sign out
      </Button>
    </aside>
  );
}
