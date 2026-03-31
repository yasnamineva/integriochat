"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Card, CardHeader, CardTitle, Button, Input } from "@integriochat/ui";

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Company name form state
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json() as { data: TenantSettings };
        setSettings(data.data);
        setCompanyName(data.data.name);
      }
      setLoading(false);
    })();
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!settings || !companyName.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: companyName }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? "Failed to save");
      return;
    }

    const data = await res.json() as { data: TenantSettings };
    setSettings(data.data);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); }, 3000);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Changes saved.
        </div>
      )}

      {/* Company name */}
      <Card>
        <CardHeader>
          <CardTitle>Company name</CardTitle>
        </CardHeader>
        <form onSubmit={(e) => { void saveName(e); }} className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label=""
              id="companyName"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); }}
              required
            />
          </div>
          <Button type="submit" size="sm" loading={saving}>
            Save
          </Button>
        </form>
        {settings && (
          <p className="mt-2 text-xs text-gray-400">
            Workspace slug: <code className="font-mono">{settings.slug}</code>
          </p>
        )}
      </Card>

      {/* Embed snippet */}
      <Card>
        <CardHeader>
          <CardTitle>Embed snippet</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-gray-500">
          Add this tag to any page where you want the chatbot to appear. Replace{" "}
          <code className="rounded bg-gray-100 px-1 font-mono text-xs">YOUR_CHATBOT_ID</code>{" "}
          with the chatbot&apos;s ID from the chatbot settings page.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
          {`<script\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js"\n  data-bot="YOUR_CHATBOT_ID"\n></script>`}
        </pre>
      </Card>
    </div>
  );
}
