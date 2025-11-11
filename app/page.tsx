import ProtectedRoute from "@/components/ProtectedRoute";
import PullToRefresh from "@/components/PullToRefresh";
import Link from "next/link";
import { getServerSessionOrMock } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import { CHARACTER_LIMITS } from "@/lib/conversationHelpers";
import type { Person, Reminder } from "@/types";
import { ReminderStatus } from "@/types";
import GroupFilter from "./GroupFilter";
import SearchBar from "./SearchBar";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; search?: string }>;
}) {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Sign in
        </Link>
      </main>
    );
  }

  const { groupId, search } = await searchParams;

  const groups = await prisma.group.findMany({
    where: { userId: null },
    orderBy: { name: "asc" },
  });

  const people = await prisma.person.findMany({
    where: {
      user: { email: session.user.email },
      ...(groupId && groupId !== "ALL" && { groupId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          {
            conversations: {
              some: {
                content: { contains: search, mode: "insensitive" },
              },
            },
          },
        ],
      }),
    },
    include: {
      group: true,
      conversations: { orderBy: { timestamp: "desc" }, take: 1 },
      _count: { select: { conversations: true } },
    },
    orderBy: [
      { conversations: { _count: "desc" } },
      { updatedAt: "desc" },
    ],
  });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  const upcomingReminders = user
    ? await prisma.reminder.findMany({
        where: {
          userId: user.id,
          status: ReminderStatus.PENDING,
          remindAt: { gte: new Date() },
        },
        include: {
          person: true,
          conversation: true,
        },
        orderBy: { remindAt: "asc" },
        take: 5,
      })
    : [];

  return (
    <ProtectedRoute>
      <PullToRefresh>
        <main className="mx-auto max-w-md p-6 pb-24">
        <div className="sticky top-0 z-10 -mx-6 mb-6 bg-background px-6 pb-4 pt-2">
          <h1 className="mb-4 text-2xl font-bold tracking-tight">People</h1>
          <GroupFilter groups={groups} selectedGroupId={groupId || "ALL"} />
          <div className="mt-4">
            <SearchBar initialSearch={search} groupId={groupId} />
          </div>
        </div>

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Upcoming Reminders</h2>
            <ul className="space-y-3">
              {upcomingReminders.map((reminder) => (
                <li
                  key={reminder.id}
                  className="group rounded-2xl border-2 border-secondary bg-accent p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <Link href={`/person/${reminder.personId}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{reminder.person?.name}</div>
                        {reminder.conversation && (
                          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {firstChars(reminder.conversation.content, CHARACTER_LIMITS.PREVIEW_LONG)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

        {people.length === 0 ? (
          <div className="mt-32 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-base font-medium text-muted-foreground">
              {search
                ? "No results found"
                : groupId && groupId !== "ALL"
                  ? "No people in this group"
                  : "Add your first friend to start remembering"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {!search && (!groupId || groupId === "ALL") && "Tap the + button to get started"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {people.map((p: Person) => {
              const last = p.conversations?.[0];
              return (
                <li key={p.id} className="group rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                  <Link href={`/person/${p.id}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="text-base font-semibold">{p.name}</div>
                        {p.group && (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity group-hover:opacity-90"
                            style={{
                              backgroundColor: p.group.color ? `${p.group.color}20` : "#FF6B6B20",
                              color: p.group.color || "#FF6B6B",
                            }}
                          >
                            {p.group.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 text-xs font-medium text-muted-foreground">
                      {last ? (
                        <>Last conversation: {relativeTimeFrom(last.timestamp)}</>
                      ) : (
                        <span className="text-secondary">Never contacted</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {last ? firstChars(last.content) : "No conversations yet"}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      </PullToRefresh>
    </ProtectedRoute>
  );
}
