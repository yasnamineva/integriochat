"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@integriochat/ui";
import { Input } from "@integriochat/ui";
import { Card } from "@integriochat/ui";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <Card className="w-full max-w-md text-center">
        <p className="text-sm text-red-600">Invalid reset link. Please request a new one.</p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Request new link
        </Link>
      </Card>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/login?reset=1");
  }

  return (
    <Card className="w-full max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Set new password</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => { void handleSubmit(e); }}
        className="flex flex-col gap-4"
      >
        <Input
          label="New password"
          type="password"
          id="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); }}
          required
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          id="confirm"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); }}
          required
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} className="w-full">
          Reset password
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div className="text-sm text-gray-400">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
