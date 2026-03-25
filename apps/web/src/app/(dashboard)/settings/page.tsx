"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Card, CardHeader, CardTitle, Button, Input } from "@integriochat/ui";

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  allowedDomains: string[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Domain form state
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);

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

  function validateDomain(domain: string): string | null {
    const d = domain.trim().toLowerCase();
    if (!d) return "Enter a domain";
    // Allow wildcard subdomains like *.example.com or plain example.com
    if (!/^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) {
      return "Enter a valid domain (e.g. example.com or *.example.com)";
    }
    return null;
  }

  async function addDomain(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;

    const domain = newDomain.trim().toLowerCase();
    const validationError = validateDomain(domain);
    if (validationError) {
      setDomainError(validationError);
      return;
    }

    if (settings.allowedDomains.includes(domain)) {
      setDomainError("Domain already added");
      return;
    }

    setDomainError(null);
    setSaving(true);

    const updated = [...settings.allowedDomains, domain];
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedDomains: updated }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setDomainError(data.error ?? "Failed to add domain");
      return;
    }

    const data = await res.json() as { data: TenantSettings };
    setSettings(data.data);
    setNewDomain("");
  }

  async function removeDomain(domain: string) {
    if (!settings) return;
    setSaving(true);

    const updated = settings.allowedDomains.filter((d) => d !== domain);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedDomains: updated }),
    });

    setSaving(false);

    if (res.ok) {
      const data = await res.json() as { data: TenantSettings };
      setSettings(data.data);
    }
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

      {/* Allowed domains */}
      <Card>
        <CardHeader>
          <CardTitle>Allowed embed domains</CardTitle>
        </CardHeader>
        <p className="mb-4 text-sm text-gray-500">
          Restrict which websites can embed your chatbot widget. Leave empty to allow
          all origins (not recommended for production).
        </p>

        {/* Existing domains */}
        {settings && settings.allowedDomains.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {settings.allowedDomains.map((domain) => (
              <li
                key={domain}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2"
              >
                <code className="text-sm font-mono text-gray-700">{domain}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { void removeDomain(domain); }}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        {settings && settings.allowedDomains.length === 0 && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            No domains set — all origins are currently allowed.
          </p>
        )}

        <form onSubmit={(e) => { void addDomain(e); }} className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label="Add domain"
              id="newDomain"
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => {
                setNewDomain(e.target.value);
                setDomainError(null);
              }}
            />
            {domainError && (
              <p className="mt-1 text-xs text-red-600">{domainError}</p>
            )}
          </div>
          <Button type="submit" size="sm" loading={saving}>
            Add
          </Button>
        </form>
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
