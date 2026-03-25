"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@integriochat/ui";
import { Input } from "@integriochat/ui";
import { Card } from "@integriochat/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <Card className="w-full max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Sign in</h1>

      {justReset && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          Password reset successfully — please sign in with your new password.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          id="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
          required
          autoComplete="email"
        />
        <div className="flex flex-col gap-1">
          <Input
            label="Password"
            type="password"
            id="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Create one
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<div />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
