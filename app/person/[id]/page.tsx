"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  ExternalLink,
  ChevronLeft,
  Clock,
  MessageCircle,
  Plus,
  HeartPulse,
} from "lucide-react";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import { CONTACT_FREQUENCIES, IMPORTANT_DATE_LABELS } from "@/lib/constants";
import type { Contact, Conversation, Reminder, ImportantDate } from "@/types";
import { calculateRelationshipHealth } from "@/lib/relationship-health";
import ReminderItem from "@/components/ReminderItem";
import ConversationItem from "@/components/ConversationItem";
import EditConversationModal from "@/components/EditConversationModal";
import FrequencyIndicator from "@/components/FrequencyIndicator";
import GroupBadge from "@/components/GroupBadge";

export default function PersonDetail() {
  const params = useParams();
  const contactId = params.id as string;
  const [contact, setContact] = useState<Contact | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);
  const [showQuickInfo, setShowQuickInfo] = useState(false);
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickBirthday, setQuickBirthday] = useState("");
  const [quickInfoSaving, setQuickInfoSaving] = useState(false);
  const [quickInfoMessage, setQuickInfoMessage] = useState("");

  const fetchPersonData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) {
        if (res.status === 404) return;
        throw new Error("Failed to fetch contact");
      }
      const data = await res.json();
      setContact(data);

      const [remindersRes, conversationsRes] = await Promise.all([
        fetch(`/api/reminders?contactId=${contactId}&status=PENDING`),
        fetch(`/api/conversations?contactId=${contactId}`),
      ]);

      if (remindersRes.ok) setReminders(await remindersRes.json());
      if (conversationsRes.ok) setConversations(await conversationsRes.json());
    } catch (error) {
      console.error("Error fetching contact data:", error);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void fetchPersonData();
  }, [fetchPersonData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchPersonData();
      }
    };
    const handleFocus = () => {
      void fetchPersonData();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchPersonData]);

  useEffect(() => {
    if (!contact) return;
    setQuickEmail(contact.email || "");
    setQuickPhone(contact.phone || "");
    const birthday = contact.importantDates?.find((d) => d.label === "birthday");
    setQuickBirthday(birthday?.date?.slice(0, 10) || "");
  }, [contact]);

  const relationshipHealth = useMemo(
    () =>
      calculateRelationshipHealth({
        contactFrequency: contact?.contactFrequency,
        lastConversationAt: conversations[0]?.timestamp ?? null,
        pendingReminders: reminders,
      }),
    [contact?.contactFrequency, conversations, reminders]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Contact not found</p>
      </div>
    );
  }

  const displayName = [contact.name, contact.lastName].filter(Boolean).join(" ");
  const birthday = contact.importantDates?.find((d) => d.label === "birthday");
  const lastInteraction = conversations[0];
  const nextReminder = reminders[0];
  const upcomingDate = getNextImportantDate(contact.importantDates || []);

  async function saveQuickInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!contact) return;

    setQuickInfoSaving(true);
    setQuickInfoMessage("");

    try {
      const contactRes = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: quickEmail.trim() || null,
          phone: quickPhone.trim() || null,
        }),
      });

      if (!contactRes.ok) {
        throw new Error("Failed to save contact info");
      }

      if (quickBirthday) {
        if (birthday) {
          const updateBirthdayRes = await fetch(`/api/important-dates/${birthday.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: "birthday",
              date: quickBirthday,
              year: null,
              recurring: true,
            }),
          });
          if (!updateBirthdayRes.ok) {
            throw new Error("Failed to update birthday");
          }
        } else {
          const createBirthdayRes = await fetch("/api/important-dates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contactId: contact.id,
              label: "birthday",
              date: quickBirthday,
              year: null,
              recurring: true,
            }),
          });
          if (!createBirthdayRes.ok) {
            throw new Error("Failed to create birthday");
          }
        }
      } else if (birthday) {
        const deleteBirthdayRes = await fetch(`/api/important-dates/${birthday.id}`, {
          method: "DELETE",
        });
        if (!deleteBirthdayRes.ok) {
          throw new Error("Failed to remove birthday");
        }
      }

      await fetchPersonData();
      setShowQuickInfo(false);
      setQuickInfoMessage("Basic info updated.");
    } catch (error) {
      console.error("Failed to save quick info:", error);
      setQuickInfoMessage("Failed to update basic info.");
    } finally {
      setQuickInfoSaving(false);
    }
  }

  return (
    <>
      <main className="mx-auto max-w-lg px-5 pb-28 pt-6">
        {/* Navigation */}
        <nav className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft size={18} />
            Back
          </Link>
          <Link
            href={`/person/${contact.id}/edit`}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Edit
          </Link>
        </nav>

        {/* Profile Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          {contact.nickname && (
            <p className="mt-1 text-muted-foreground">&quot;{contact.nickname}&quot;</p>
          )}
          
          {/* Groups */}
          {contact.groups && contact.groups.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {contact.groups.map((group) => (
                <GroupBadge key={group.id} group={group} size="sm" />
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{conversations.length}</span> interactions
            </span>
            <span className="text-border">·</span>
            <span>
              Last <span className="font-medium text-foreground">
                {conversations[0] ? relativeTimeFrom(conversations[0].timestamp) : "never"}
              </span>
            </span>
            {contact.contactFrequency && (
              <>
                <span className="text-border">·</span>
                <FrequencyIndicator
                  frequency={contact.contactFrequency}
                  lastConversationDate={conversations[0]?.timestamp ?? null}
                  showLabel
                />
              </>
            )}
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <HeartPulse size={14} />
              <span className={relationshipHealth.status === "strong"
                ? "text-success"
                : relationshipHealth.status === "steady"
                  ? "text-warning"
                  : "text-danger"}
              >
                Health {relationshipHealth.score}
              </span>
            </span>
          </div>
        </header>

        {/* Contact Brief */}
        <section className="mb-6 rounded-xl border border-border bg-[linear-gradient(140deg,rgba(15,23,42,0.05),rgba(15,23,42,0)_70%)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Brief</p>
            <Link
              href={`/person/${contact.id}/add`}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Log interaction
            </Link>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-border/80 bg-background/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last interaction
              </p>
              {lastInteraction ? (
                <>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {relativeTimeFrom(lastInteraction.timestamp)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {firstChars(lastInteraction.content, 110)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  No interactions logged yet.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border/80 bg-background/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Open reminders
              </p>
              {reminders.length > 0 ? (
                <>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {reminders.length} open {reminders.length === 1 ? "reminder" : "reminders"}
                  </p>
                  {nextReminder && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Next due {formatDueDate(nextReminder.remindAt)}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No open reminders.</p>
              )}
            </div>

            <div className="rounded-lg border border-border/80 bg-background/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Upcoming date
              </p>
              {upcomingDate ? (
                <>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {IMPORTANT_DATE_LABELS[upcomingDate.label] || upcomingDate.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {upcomingDate.dateLabel} · {upcomingDate.relativeLabel}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  No upcoming important date.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Relationship Health */}
        <section className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Relationship health</p>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                relationshipHealth.status === "strong"
                  ? "border-success bg-success-muted text-success"
                  : relationshipHealth.status === "steady"
                    ? "border-warning bg-warning-muted text-warning"
                    : "border-danger bg-danger-muted text-danger"
              }`}
            >
              {relationshipHealth.status}
            </span>
          </div>
          <div className="mb-3 flex items-end justify-between">
            <p className="text-3xl font-semibold tracking-tight">
              {relationshipHealth.score}
              <span className="ml-1 text-base font-medium text-muted-foreground">/100</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {relationshipHealth.pendingReminderCount} open · {relationshipHealth.overdueReminderCount} overdue
            </p>
          </div>
          <div className="space-y-2">
            <HealthMetric label="Freshness" value={relationshipHealth.freshness} />
            <HealthMetric label="Consistency" value={relationshipHealth.consistency} />
            <HealthMetric label="Follow-through" value={relationshipHealth.followThrough} />
          </div>
        </section>

        {/* Basic Info */}
        <section className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Basic info</p>
            <button
              type="button"
              onClick={() => {
                setShowQuickInfo((prev) => !prev);
                setQuickInfoMessage("");
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus size={12} />
              {showQuickInfo ? "Close" : "Quick add"}
            </button>
          </div>

          <div className="space-y-2">
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted"
              >
                <Mail size={16} className="text-muted-foreground" />
                <span className="text-sm">{contact.email}</span>
              </a>
            ) : null}

            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted"
              >
                <Phone size={16} className="text-muted-foreground" />
                <span className="text-sm">{contact.phone}</span>
              </a>
            ) : null}

            {birthday ? (
              <div className="flex items-center gap-3 rounded-lg p-2 -mx-2">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-sm">Birthday: {birthday.date.slice(0, 10)}</span>
              </div>
            ) : null}

            {(contact.company || contact.jobTitle) && (
              <div className="flex items-center gap-3 p-2 -mx-2">
                <Building2 size={16} className="text-muted-foreground" />
                <span className="text-sm">
                  {contact.jobTitle}
                  {contact.jobTitle && contact.company && " at "}
                  {contact.company}
                </span>
              </div>
            )}

            {!contact.email && !contact.phone && !birthday && (
              <p className="text-sm text-muted-foreground">No basic info yet.</p>
            )}
          </div>

          {showQuickInfo && (
            <form onSubmit={saveQuickInfo} className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="+1 ..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Birthday
                </label>
                <input
                  type="date"
                  value={quickBirthday}
                  onChange={(e) => setQuickBirthday(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-secondary"
                />
              </div>

              <div className="flex items-center justify-between">
                {quickInfoMessage ? (
                  <p className="text-xs text-muted-foreground">{quickInfoMessage}</p>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={quickInfoSaving}
                  className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
                >
                  {quickInfoSaving ? "Saving..." : "Save basic info"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Social Links */}
        {contact.socialLinks && Object.values(contact.socialLinks).some(Boolean) && (
          <section className="mb-6 flex flex-wrap gap-2">
            {contact.socialLinks.twitter && (
              <a
                href={`https://x.com/${contact.socialLinks.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                𝕏 {contact.socialLinks.twitter}
                <ExternalLink size={10} className="text-muted-foreground" />
              </a>
            )}
            {contact.socialLinks.linkedin && (
              <a
                href={contact.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                LinkedIn
                <ExternalLink size={10} className="text-muted-foreground" />
              </a>
            )}
            {contact.socialLinks.instagram && (
              <a
                href={`https://instagram.com/${contact.socialLinks.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                @{contact.socialLinks.instagram}
                <ExternalLink size={10} className="text-muted-foreground" />
              </a>
            )}
          </section>
        )}

        {/* Important Dates */}
        {contact.importantDates && contact.importantDates.length > 0 && (
          <section className="mb-6">
            <SectionHeader icon={Calendar} title="Important dates" />
            <div className="space-y-2">
              {contact.importantDates.map((d: ImportantDate) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-border p-4"
                >
                  <span className="text-sm font-medium">
                    {IMPORTANT_DATE_LABELS[d.label] || d.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {d.date}{d.year && ` (${d.year})`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {contact.notes && (
          <section className="mb-6 rounded-xl border border-border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Notes
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {contact.notes}
            </p>
          </section>
        )}

        {/* Frequency Goal */}
        {contact.contactFrequency && (
          <section className="mb-6 rounded-xl bg-muted p-4">
            <p className="text-sm">
              <span className="text-muted-foreground">Goal:</span>{" "}
              <span className="font-medium">
                {CONTACT_FREQUENCIES[contact.contactFrequency]?.label}
              </span>
            </p>
          </section>
        )}

        {/* Active Reminders */}
        {reminders.length > 0 && (
          <section className="mb-6">
            <SectionHeader icon={Clock} title="Reminders" />
            <ul className="space-y-2">
              {reminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onUpdate={fetchPersonData}
                />
              ))}
            </ul>
          </section>
        )}

        {/* Conversations */}
        <section>
          <SectionHeader icon={MessageCircle} title="Interactions" count={conversations.length} />
          {conversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">No interactions yet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Tap + to log one</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {conversations.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  onUpdate={fetchPersonData}
                  onEdit={setEditingConversation}
                  relativeTime={relativeTimeFrom(c.timestamp)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      <EditConversationModal
        isOpen={editingConversation !== null}
        onClose={() => setEditingConversation(null)}
        conversation={editingConversation}
        onUpdate={fetchPersonData}
      />
    </>
  );
}

type NextImportantDate = {
  label: ImportantDate["label"];
  dateLabel: string;
  relativeLabel: string;
  daysUntil: number;
};

function getNextImportantDate(dates: ImportantDate[]): NextImportantDate | null {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  const upcoming: NextImportantDate[] = [];

  for (const date of dates) {
    if (!date.date) continue;

    let occurrence: Date;

    if (date.recurring) {
      const [, month, day] = date.date.split("-").map(Number);
      occurrence = new Date(now.getFullYear(), month - 1, day);
      if (occurrence.getTime() < startOfToday) {
        occurrence = new Date(now.getFullYear() + 1, month - 1, day);
      }
    } else {
      occurrence = new Date(`${date.date}T00:00:00`);
      if (occurrence.getTime() < startOfToday) continue;
    }

    const daysUntil = Math.floor((occurrence.getTime() - startOfToday) / msPerDay);
    const relativeLabel =
      daysUntil === 0
        ? "today"
        : daysUntil === 1
          ? "tomorrow"
          : `in ${daysUntil} days`;

    upcoming.push({
      label: date.label,
      dateLabel: occurrence.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      relativeLabel,
      daysUntil,
    });
  }

  if (upcoming.length === 0) return null;
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming[0];
}

function formatDueDate(value: string): string {
  const now = new Date();
  const target = new Date(value);
  const msPerDay = 1000 * 60 * 60 * 24;
  const dayDelta = Math.floor(
    (target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      msPerDay
  );

  if (dayDelta === 0) return "today";
  if (dayDelta === 1) return "tomorrow";
  if (dayDelta < 0) return `${Math.abs(dayDelta)}d ago`;

  return `in ${dayDelta}d`;
}

function HealthMetric({ label, value }: { label: string; value: number }) {
  const toneClass =
    value >= 80 ? "bg-success" : value >= 60 ? "bg-warning" : "bg-danger";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${toneClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ 
  icon: Icon, 
  title, 
  count 
}: { 
  icon: React.ComponentType<{ className?: string; size?: number }>; 
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon size={16} className="text-muted-foreground" />
      <h2 className="text-sm font-medium text-muted-foreground">
        {title}
        {count !== undefined && <span className="ml-1.5 text-muted-foreground/60">{count}</span>}
      </h2>
    </div>
  );
}
