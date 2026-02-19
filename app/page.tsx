import PullToRefresh from "@/components/PullToRefresh";
import Link from "next/link";
import { cookies } from "next/headers";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import { CHARACTER_LIMITS } from "@/lib/conversationHelpers";
import { CONTACT_FREQUENCIES, IMPORTANT_DATE_LABELS } from "@/lib/constants";
import { parseDashboardPreferences } from "@/lib/preferences";
import GroupFilter from "./GroupFilter";
import SearchBar from "./SearchBar";
import { getContacts } from "@/lib/queries/contacts";
import { getGroups } from "@/lib/queries/groups";
import {
  getStaleContacts,
  getUpcomingDates,
  getRecentInteractions,
  getTodayFocus,
  getSegmentQueues,
  type TodayFocusItem,
} from "@/lib/queries/dashboard";
import { db } from "@/db/drizzle";
import { reminders } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";
import FrequencyIndicator from "@/components/FrequencyIndicator";
import GroupBadge from "@/components/GroupBadge";
import InteractionTypeIcon from "@/components/InteractionTypeIcon";
import {
  Gift,
  Clock,
  MessageCircle,
  Users,
  Sparkles,
  HeartPulse,
  Layers3,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getUpcomingReminders() {
  return db.query.reminders.findMany({
    where: and(
      eq(reminders.status, "PENDING"),
      gte(reminders.remindAt, new Date().toISOString())
    ),
    with: {
      contact: true,
      conversation: true,
    },
    orderBy: [reminders.remindAt],
    limit: 5,
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; search?: string }>;
}) {
  const { groupId, search } = await searchParams;
  const cookieStore = await cookies();
  const preferences = parseDashboardPreferences(
    cookieStore.get("recallect_prefs")?.value
  );

  const [
    groups,
    contacts,
    staleContacts,
    upcomingDates,
    recentInteractions,
    upcomingReminders,
    todayFocus,
    segmentQueues,
  ] =
    await Promise.all([
      getGroups(),
      getContacts({ groupId, search }),
      getStaleContacts(),
      getUpcomingDates(30),
      getRecentInteractions(8),
      getUpcomingReminders(),
      getTodayFocus(preferences.focusLimit, {
        cooldownDays: preferences.cooldownDays,
        includeLowPriority: preferences.includeLowPriority,
      }),
      getSegmentQueues(preferences.segmentLimit, {
        cooldownDays: preferences.cooldownDays,
        includeLowPriority: preferences.includeLowPriority,
      }),
    ]);

  const showDashboardSections = !search && (!groupId || groupId === "ALL");

  return (
    <PullToRefresh>
      <main className="mx-auto max-w-lg px-5 pb-28 pt-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Recallect</h1>
            <div className="flex items-center gap-0.5">
              <Link
                href="/settings"
                className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Settings"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </Link>
              <Link
                href="/weekly-review"
                className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Weekly review"
              >
                <BarChart3 size={20} />
              </Link>
              <Link
                href="/reminders"
                className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Reminders"
              >
                <Clock size={20} />
              </Link>
              <Link
                href="/whatsapp"
                className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </Link>
              <Link
                href="/telegram"
                className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Telegram"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </Link>
            </div>
          </div>
          
          {/* Filters */}
          <div className="mt-6 space-y-3">
            <GroupFilter groups={groups} selectedGroupId={groupId || "ALL"} />
            <SearchBar initialSearch={search} groupId={groupId} />
          </div>
        </header>

        {/* Dashboard Sections */}
        {showDashboardSections && (
          <div className="space-y-8">
            {/* Today Focus */}
            {todayFocus.length > 0 && (
              <section>
                <SectionHeader icon={Sparkles} title="Today Focus" />
                <div className="space-y-2">
                  {todayFocus.map((item) => (
                    <article
                      key={item.contactId}
                      className="rounded-xl border border-border bg-[linear-gradient(130deg,rgba(15,23,42,0.04),rgba(15,23,42,0.0)_65%)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {item.contactName}
                            {item.contactLastName ? ` ${item.contactLastName}` : ""}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.primaryReason}
                          </p>
                          {item.secondaryReason && (
                            <p className="mt-0.5 text-xs text-muted-foreground/80">
                              {item.secondaryReason}
                            </p>
                          )}
                        </div>
                        <PriorityPill priority={item.priority} />
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          href={`/person/${item.contactId}/add`}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          {item.actionLabel}
                        </Link>
                        <Link
                          href={`/person/${item.contactId}`}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          View
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Segment Queues */}
            {segmentQueues.length > 0 && (
              <section>
                <SectionHeader icon={Layers3} title="Segment Queues" />
                <div className="space-y-3">
                  {segmentQueues.map((queue) => (
                    <div
                      key={queue.key}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{queue.label}</p>
                        {queue.groupId ? (
                          <Link
                            href={`/?groupId=${queue.groupId}`}
                            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            View group
                          </Link>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        {queue.items.map((item) => (
                          <div
                            key={`${queue.key}-${item.contactId}`}
                            className="rounded-lg border border-border/80 bg-muted/20 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {item.contactName}
                                  {item.contactLastName ? ` ${item.contactLastName}` : ""}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {item.reason}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <PriorityPill priority={item.priority} />
                                <span className="text-xs text-muted-foreground">
                                  Health {item.healthScore}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <Link
                                href={`/person/${item.contactId}/add`}
                                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                              >
                                {item.actionLabel}
                              </Link>
                              <Link
                                href={`/person/${item.contactId}`}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming Dates */}
            {upcomingDates.length > 0 && (
              <section>
                <SectionHeader icon={Gift} title="Upcoming" />
                <div className="space-y-2">
                  {upcomingDates.map((d) => (
                    <Link
                      key={d.id}
                      href={`/person/${d.contactId}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-muted-foreground/20"
                    >
                      <div>
                        <p className="font-medium">
                          {d.contactName}
                          {d.contactLastName ? ` ${d.contactLastName}` : ""}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {IMPORTANT_DATE_LABELS[d.label as keyof typeof IMPORTANT_DATE_LABELS] || d.label}
                          {d.year && ` · turning ${new Date().getFullYear() - d.year}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          d.daysUntil === 0 ? "text-success" : 
                          d.daysUntil <= 3 ? "text-warning" : "text-muted-foreground"
                        }`}>
                          {d.daysUntil === 0 ? "Today" : d.daysUntil === 1 ? "Tomorrow" : `${d.daysUntil} days`}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Reach Out */}
            {staleContacts.length > 0 && (
              <section>
                <SectionHeader icon={Users} title="Reach out" />
                <div className="space-y-2">
                  {staleContacts.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/person/${c.id}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-muted-foreground/20"
                    >
                      <div className="flex items-center gap-3">
                        <StatusDot status={c.staleness} />
                        <div>
                          <p className="font-medium">
                            {c.name}
                            {c.lastName ? ` ${c.lastName}` : ""}
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {c.lastConversationDate
                              ? relativeTimeFrom(c.lastConversationDate)
                              : "Never contacted"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          c.staleness === "red" ? "text-danger" :
                          c.staleness === "yellow" ? "text-warning" : "text-success"
                        }`}>
                          {c.daysSince}d overdue
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {CONTACT_FREQUENCIES[c.contactFrequency as keyof typeof CONTACT_FREQUENCIES]?.label}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Reminders */}
            {upcomingReminders.length > 0 && (
              <section>
                <SectionHeader icon={Clock} title="Reminders" />
                <div className="space-y-2">
                  {upcomingReminders.map((reminder) => (
                    <Link
                      key={reminder.id}
                      href={`/person/${reminder.contactId}`}
                      className="block rounded-xl border border-border bg-card p-4 transition-all hover:border-muted-foreground/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{reminder.contact?.name}</p>
                          {reminder.conversation && (
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                              {firstChars(reminder.conversation.content, CHARACTER_LIMITS.PREVIEW_LONG)}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">
                        {new Date(reminder.remindAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })} · {new Date(reminder.remindAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recent */}
            {recentInteractions.length > 0 && (
              <section>
                <SectionHeader icon={MessageCircle} title="Recent" />
                <div className="space-y-2">
                  {recentInteractions.map((interaction) => (
                    <Link
                      key={interaction.id}
                      href={`/person/${interaction.contactId}`}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-muted-foreground/20"
                    >
                      <div className="mt-0.5 text-muted-foreground">
                        <InteractionTypeIcon
                          type={interaction.type as "call" | "text" | "email" | "coffee" | "dinner" | "hangout" | "meeting" | "other"}
                          size={16}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{interaction.contact?.name}</p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {relativeTimeFrom(interaction.timestamp)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground truncate">
                          {firstChars(interaction.content, CHARACTER_LIMITS.PREVIEW_SHORT)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Contacts */}
        <section className={showDashboardSections ? "mt-10" : ""}>
          <SectionHeader 
            icon={Users} 
            title={search ? "Results" : "Contacts"} 
            count={contacts.length}
          />
          
          {contacts.length === 0 ? (
            <EmptyState isSearching={!!search} isFiltered={!!(groupId && groupId !== "ALL")} />
          ) : (
            <div className="space-y-2">
              {contacts.map((c) => {
                const lastConvo = c.conversations?.[0];
                return (
                  <Link
                    key={c.id}
                    href={`/person/${c.id}`}
                    className="block rounded-xl border border-border bg-card p-4 transition-all hover:border-muted-foreground/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <p className="font-medium truncate">
                          {c.name}
                          {c.lastName ? ` ${c.lastName}` : ""}
                        </p>
                        {c.contactFrequency && (
                          <FrequencyIndicator
                            frequency={c.contactFrequency}
                            lastConversationDate={c.lastConversationDate ?? null}
                          />
                        )}
                        {c.relationshipHealth && (
                          <HealthPill score={c.relationshipHealth.score} status={c.relationshipHealth.status} />
                        )}
                      </div>
                      {c.groups && c.groups.length > 0 && (
                        <div className="flex gap-1 flex-shrink-0">
                          {c.groups.slice(0, 2).map((group) => (
                            <GroupBadge key={group.id} group={group} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {lastConvo ? (
                        <span className="flex items-center gap-1.5">
                          <span className="truncate">{firstChars(lastConvo.content)}</span>
                          <span className="text-xs whitespace-nowrap">· {relativeTimeFrom(lastConvo.timestamp)}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">No interactions yet</span>
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </PullToRefresh>
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

function StatusDot({ status }: { status: "red" | "yellow" | "green" }) {
  const colors = {
    red: "bg-danger",
    yellow: "bg-warning", 
    green: "bg-success",
  };
  return <div className={`h-2 w-2 rounded-full ${colors[status]}`} />;
}

function PriorityPill({ priority }: { priority: TodayFocusItem["priority"] }) {
  const styles = {
    high: "border-danger bg-danger-muted text-danger",
    medium: "border-warning bg-warning-muted text-warning",
    low: "border-success bg-success-muted text-success",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[priority]}`}>
      {priority.toUpperCase()}
    </span>
  );
}

function HealthPill({
  score,
  status,
}: {
  score: number;
  status: "strong" | "steady" | "at-risk";
}) {
  const styles = {
    strong: "border-success bg-success-muted text-success",
    steady: "border-warning bg-warning-muted text-warning",
    "at-risk": "border-danger bg-danger-muted text-danger",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
      <HeartPulse size={10} />
      {score}
    </span>
  );
}

function EmptyState({ isSearching, isFiltered }: { isSearching: boolean; isFiltered: boolean }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Users size={20} className="text-muted-foreground" />
      </div>
      <p className="font-medium text-muted-foreground">
        {isSearching
          ? "No results found"
          : isFiltered
            ? "No contacts in this group"
            : "No contacts yet"}
      </p>
      {!isSearching && !isFiltered && (
        <p className="mt-1 text-sm text-muted-foreground/60">
          Tap + to add your first contact
        </p>
      )}
    </div>
  );
}
