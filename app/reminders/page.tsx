"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { Reminder } from "@/types";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import { CHARACTER_LIMITS } from "@/lib/conversationHelpers";

type ReminderTab = "upcoming" | "overdue" | "done";

interface GoogleIntegrationStatus {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  expiresAt: string | null;
}

function formatReminderDate(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function fullName(name: string | undefined, lastName: string | null | undefined): string {
  if (!name) return "Unknown";
  return lastName ? `${name} ${lastName}` : name;
}

export default function RemindersPage() {
  const searchParams = useSearchParams();
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReminderTab>("upcoming");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [googleStatus, setGoogleStatus] = useState<GoogleIntegrationStatus>({
    configured: false,
    connected: false,
    accountEmail: null,
    expiresAt: null,
  });
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleMessage, setGoogleMessage] = useState("");

  async function fetchReminders() {
    setLoading(true);
    setError("");

    try {
      const [pendingRes, dismissedRes] = await Promise.all([
        fetch("/api/reminders?status=PENDING"),
        fetch("/api/reminders?status=DISMISSED"),
      ]);

      if (!pendingRes.ok || !dismissedRes.ok) {
        throw new Error("Failed to load reminders");
      }

      setPendingReminders(await pendingRes.json());
      setDismissedReminders(await dismissedRes.json());
    } catch {
      setError("Could not load reminders right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReminders();
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, []);

  useEffect(() => {
    const state = searchParams.get("google");
    if (!state) return;

    const map: Record<string, string> = {
      connected: "Google connected. You can import birthdays now.",
      denied: "Google access was denied.",
      "invalid-state": "Google connect failed due to invalid state. Please retry.",
      "connect-failed": "Could not complete Google connection.",
      "config-missing": "Google OAuth is not configured on the server.",
    };

    const message = map[state];
    if (message) {
      setGoogleMessage(message);
    }
  }, [searchParams]);

  const { overdue, upcoming, done } = useMemo(() => {
    const now = Date.now();

    const overdueItems = pendingReminders
      .filter((r) => new Date(r.remindAt).getTime() < now)
      .sort(
        (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
      );

    const upcomingItems = pendingReminders
      .filter((r) => new Date(r.remindAt).getTime() >= now)
      .sort(
        (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
      );

    const doneItems = [...dismissedReminders].sort(
      (a, b) => new Date(b.remindAt).getTime() - new Date(a.remindAt).getTime()
    );

    return {
      overdue: overdueItems,
      upcoming: upcomingItems,
      done: doneItems,
    };
  }, [dismissedReminders, pendingReminders]);

  async function updateStatus(id: string, status: "PENDING" | "DISMISSED") {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update reminder");
      }

      await fetchReminders();
    } catch {
      setError("Could not update that reminder.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function fetchGoogleStatus() {
    try {
      const res = await fetch("/api/integrations/google/status");
      if (!res.ok) return;
      setGoogleStatus(await res.json());
    } catch {
      // ignore status fetch failures
    }
  }

  async function runBirthdayImport() {
    setGoogleBusy(true);
    setGoogleMessage("");

    try {
      const res = await fetch("/api/integrations/google/import-birthdays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGoogleMessage(data.error || "Birthday import failed.");
        return;
      }

      const counts = data.counts || {};
      setGoogleMessage(
        `Birthday sync complete. Created: ${counts.created || 0}, updated: ${
          counts.updated || 0
        }, unchanged: ${counts.unchanged || 0}, unmatched: ${counts.unmatched || 0}.`
      );
      await fetchReminders();
      await fetchGoogleStatus();
    } catch {
      setGoogleMessage("Birthday import failed.");
    } finally {
      setGoogleBusy(false);
    }
  }

  async function disconnectGoogle() {
    setGoogleBusy(true);
    setGoogleMessage("");
    try {
      const res = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
      });
      if (!res.ok) {
        setGoogleMessage("Could not disconnect Google.");
        return;
      }
      setGoogleStatus({
        configured: googleStatus.configured,
        connected: false,
        accountEmail: null,
        expiresAt: null,
      });
      setGoogleMessage("Google integration disconnected.");
    } catch {
      setGoogleMessage("Could not disconnect Google.");
    } finally {
      setGoogleBusy(false);
    }
  }

  const items =
    activeTab === "upcoming" ? upcoming : activeTab === "overdue" ? overdue : done;

  return (
    <main className="mx-auto max-w-lg px-5 pb-28 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
        </div>

        <button
          onClick={fetchReminders}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </header>

      <section className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">Google birthdays</p>
            {!googleStatus.configured ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` first.
              </p>
            ) : googleStatus.connected ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Connected as {googleStatus.accountEmail || "Google account"}.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Connect Google to import birthdays into important dates.
              </p>
            )}
          </div>

          {googleStatus.configured && !googleStatus.connected && (
            <a
              href="/api/integrations/google/connect"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Connect
            </a>
          )}
        </div>

        {googleStatus.connected && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runBirthdayImport}
              disabled={googleBusy}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {googleBusy ? "Importing..." : "Import birthdays"}
            </button>
            <button
              type="button"
              onClick={disconnectGoogle}
              disabled={googleBusy}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-danger disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        )}

        {googleMessage && (
          <p className="mt-2 text-xs text-muted-foreground">{googleMessage}</p>
        )}
      </section>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <TabButton
          icon={Clock}
          label={`Upcoming (${upcoming.length})`}
          active={activeTab === "upcoming"}
          onClick={() => setActiveTab("upcoming")}
        />
        <TabButton
          icon={AlertTriangle}
          label={`Overdue (${overdue.length})`}
          active={activeTab === "overdue"}
          onClick={() => setActiveTab("overdue")}
        />
        <TabButton
          icon={CheckCircle2}
          label={`Done (${done.length})`}
          active={activeTab === "done"}
          onClick={() => setActiveTab("done")}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger-muted p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reminders...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {activeTab === "upcoming" && "No upcoming reminders."}
          {activeTab === "overdue" && "No overdue reminders."}
          {activeTab === "done" && "No completed reminders yet."}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((reminder) => {
            const contactName = fullName(
              reminder.contact?.name,
              reminder.contact?.lastName
            );
            const isOverdue = new Date(reminder.remindAt).getTime() < Date.now();
            const updating = updatingId === reminder.id;

            return (
              <li
                key={reminder.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/person/${reminder.contactId}`}
                      className="font-medium hover:underline"
                    >
                      {contactName}
                    </Link>

                    {reminder.conversation && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {firstChars(
                          reminder.conversation.content,
                          CHARACTER_LIMITS.REMINDER_PREVIEW
                        )}
                      </p>
                    )}

                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      {formatReminderDate(reminder.remindAt)}
                      {isOverdue && reminder.status === "PENDING" && (
                        <span className="ml-1.5 text-danger">
                          · {relativeTimeFrom(reminder.remindAt)}
                        </span>
                      )}
                    </p>
                  </div>

                  {reminder.status === "PENDING" ? (
                    <button
                      onClick={() => updateStatus(reminder.id, "DISMISSED")}
                      disabled={updating}
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-green-600 disabled:opacity-50"
                      title="Mark done"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Check size={14} />
                        Done
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(reminder.id, "PENDING")}
                      disabled={updating}
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                      title="Reopen reminder"
                    >
                      <span className="inline-flex items-center gap-1">
                        <RotateCcw size={13} />
                        Reopen
                      </span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
        active
          ? "border-foreground/15 bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
