import PullToRefresh from "@/components/PullToRefresh";
import Link from "next/link";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import { CHARACTER_LIMITS } from "@/lib/conversationHelpers";
import { CONTACT_FREQUENCIES, IMPORTANT_DATE_LABELS } from "@/lib/constants";
import type { Contact } from "@/types";
import GroupFilter from "./GroupFilter";
import SearchBar from "./SearchBar";
import { getContacts } from "@/lib/queries/contacts";
import { getGroups } from "@/lib/queries/groups";
import {
  getStaleContacts,
  getUpcomingDates,
  getRecentInteractions,
} from "@/lib/queries/dashboard";
import { db } from "@/db/drizzle";
import { reminders } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";
import FrequencyIndicator from "@/components/FrequencyIndicator";
import GroupBadge from "@/components/GroupBadge";
import InteractionTypeIcon from "@/components/InteractionTypeIcon";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; search?: string }>;
}) {
  const { groupId, search } = await searchParams;

  const [groups, contacts, staleContacts, upcomingDates, recentInteractions] =
    await Promise.all([
      getGroups(),
      getContacts({ groupId, search }),
      getStaleContacts(),
      getUpcomingDates(30),
      getRecentInteractions(8),
    ]);

  // Get upcoming reminders
  const upcomingReminders = await db.query.reminders.findMany({
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

  const showDashboardSections = !search && (!groupId || groupId === "ALL");

  return (
    <PullToRefresh>
      <main className="mx-auto max-w-md p-6 pb-24">
        <div className="sticky top-0 z-10 -mx-6 mb-6 bg-background px-6 pb-4 pt-2">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Recallect</h1>
            <div className="flex items-center gap-1">
              <Link
                href="/whatsapp"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="WhatsApp Sync"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </Link>
              <Link
                href="/telegram"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Telegram Bot"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </Link>
            </div>
          </div>
          <GroupFilter groups={groups} selectedGroupId={groupId || "ALL"} />
          <div className="mt-4">
            <SearchBar initialSearch={search} groupId={groupId} />
          </div>
        </div>

        {showDashboardSections && (
          <>
            {/* Upcoming Birthdays & Dates */}
            {upcomingDates.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold">Upcoming Dates</h2>
                <ul className="space-y-2">
                  {upcomingDates.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/person/${d.contactId}`}
                        className="flex items-center justify-between rounded-2xl border-2 border-secondary/30 bg-accent p-4 transition-all hover:shadow-md"
                      >
                        <div>
                          <div className="font-semibold">
                            {d.contactName}
                            {d.contactLastName ? ` ${d.contactLastName}` : ""}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {IMPORTANT_DATE_LABELS[d.label as keyof typeof IMPORTANT_DATE_LABELS] || d.label}
                            {d.year && ` (turning ${new Date().getFullYear() - d.year})`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {d.daysUntil === 0
                              ? "Today!"
                              : d.daysUntil === 1
                                ? "Tomorrow"
                                : `${d.daysUntil}d`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {d.date.slice(5)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reach Out To (Stale Contacts) */}
            {staleContacts.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold">Reach Out To</h2>
                <ul className="space-y-2">
                  {staleContacts.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/person/${c.id}`}
                        className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              c.staleness === "red"
                                ? "bg-red-500"
                                : c.staleness === "yellow"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                          />
                          <div>
                            <div className="font-semibold">
                              {c.name}
                              {c.lastName ? ` ${c.lastName}` : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {c.lastConversationDate
                                ? `Last: ${relativeTimeFrom(c.lastConversationDate)}`
                                : "Never contacted"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div
                            className={`font-semibold ${
                              c.staleness === "red"
                                ? "text-red-500"
                                : c.staleness === "yellow"
                                  ? "text-yellow-500"
                                  : "text-green-500"
                            }`}
                          >
                            {c.daysSince}d overdue
                          </div>
                          <div>
                            Goal:{" "}
                            {CONTACT_FREQUENCIES[c.contactFrequency as keyof typeof CONTACT_FREQUENCIES]?.label}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upcoming Reminders */}
            {upcomingReminders.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold">
                  Upcoming Reminders
                </h2>
                <ul className="space-y-3">
                  {upcomingReminders.map((reminder) => (
                    <li
                      key={reminder.id}
                      className="group rounded-2xl border-2 border-secondary bg-accent p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      <Link href={`/person/${reminder.contactId}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold">
                              {reminder.contact?.name}
                            </div>
                            {reminder.conversation && (
                              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {firstChars(
                                  reminder.conversation.content,
                                  CHARACTER_LIMITS.PREVIEW_LONG
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {new Date(reminder.remindAt).toLocaleDateString()} at{" "}
                          {new Date(reminder.remindAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Interactions */}
            {recentInteractions.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-semibold">
                  Recent Interactions
                </h2>
                <ul className="space-y-2">
                  {recentInteractions.map((interaction) => (
                    <li key={interaction.id}>
                      <Link
                        href={`/person/${interaction.contactId}`}
                        className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
                      >
                        <InteractionTypeIcon
                          type={interaction.type as "call" | "text" | "email" | "coffee" | "dinner" | "hangout" | "meeting" | "other"}
                          size={16}
                          className="mt-0.5 text-muted-foreground"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">
                              {interaction.contact?.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {relativeTimeFrom(interaction.timestamp)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground truncate">
                            {firstChars(interaction.content, CHARACTER_LIMITS.PREVIEW_SHORT)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Contacts List */}
        <h2 className="mb-4 text-lg font-semibold">
          {search ? "Search Results" : "Contacts"}
        </h2>

        {contacts.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-base font-medium text-muted-foreground">
              {search
                ? "No results found"
                : groupId && groupId !== "ALL"
                  ? "No contacts in this group"
                  : "Add your first contact to get started"}
            </p>
            {!search && (!groupId || groupId === "ALL") && (
              <p className="mt-1 text-sm text-muted-foreground">
                Tap the + button to get started
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {contacts.map((c) => {
              const lastConvo = c.conversations?.[0];
              return (
                <li
                  key={c.id}
                  className="group rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <Link href={`/person/${c.id}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="text-base font-semibold">
                          {c.name}
                          {c.lastName ? ` ${c.lastName}` : ""}
                        </div>
                        {c.contactFrequency && (
                          <FrequencyIndicator
                            frequency={c.contactFrequency}
                            lastConversationDate={c.lastConversationDate ?? null}
                          />
                        )}
                      </div>
                      <div className="flex gap-1">
                        {c.groups &&
                          c.groups.slice(0, 2).map((group) => (
                            <GroupBadge key={group.id} group={group} size="sm" />
                          ))}
                      </div>
                    </div>
                    <div className="mt-2.5 text-xs font-medium text-muted-foreground">
                      {lastConvo ? (
                        <>Last: {relativeTimeFrom(lastConvo.timestamp)}</>
                      ) : (
                        <span className="text-secondary">Never contacted</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {lastConvo
                        ? firstChars(lastConvo.content)
                        : "No interactions yet"}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </PullToRefresh>
  );
}
