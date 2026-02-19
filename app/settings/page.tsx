"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import type { DashboardPreferences } from "@/lib/preferences";
import { DEFAULT_DASHBOARD_PREFERENCES } from "@/lib/preferences";

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(
    DEFAULT_DASHBOARD_PREFERENCES
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/preferences");
        if (!response.ok) return;
        const data = (await response.json()) as DashboardPreferences;
        if (cancelled) return;
        setPreferences(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  async function savePreferences() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        setMessage("Could not save preferences.");
        return;
      }

      setPreferences((await response.json()) as DashboardPreferences);
      setMessage("Preferences saved.");
    } catch {
      setMessage("Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-secondary";

  return (
    <main className="mx-auto max-w-lg px-5 pb-28 pt-6">
      <header className="mb-6">
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={20} className="text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard settings</h1>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading preferences...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Today Focus items
              </label>
              <select
                value={preferences.focusLimit}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    focusLimit: Number(event.target.value),
                  }))
                }
                className={inputClass}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Segment queue items per segment
              </label>
              <select
                value={preferences.segmentLimit}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    segmentLimit: Number(event.target.value),
                  }))
                }
                className={inputClass}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Cooldown days before re-suggesting recently touched contacts
              </label>
              <select
                value={preferences.cooldownDays}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    cooldownDays: Number(event.target.value),
                  }))
                }
                className={inputClass}
              >
                {[0, 1, 2, 3, 5, 7, 10, 14].map((value) => (
                  <option key={value} value={value}>
                    {value} day{value === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <input
                type="checkbox"
                checked={preferences.includeLowPriority}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    includeLowPriority: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">
                Include low-priority suggestions
              </span>
            </label>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{message || " "}</p>
              <button
                type="button"
                onClick={savePreferences}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
