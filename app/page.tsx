import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { getServerSessionOrMock } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import type { Person, Conversation } from "@/types";
import GroupFilter from "./GroupFilter";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string }>;
}) {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <Link href="/login" className="rounded-md bg-[#FF6B6B] px-4 py-2 text-white">
          Sign in
        </Link>
      </main>
    );
  }

  const { groupId } = await searchParams;

  const groups = await prisma.group.findMany({
    where: { userId: null },
    orderBy: { name: "asc" },
  });

  const people = await prisma.person.findMany({
    where: {
      user: { email: session.user.email },
      ...(groupId && groupId !== "ALL" && { groupId }),
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

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-md p-4 pb-24">
        <div className="sticky top-0 z-10 mb-4 bg-[#FAFAFA] pb-2 pt-1">
          <h1 className="mb-3 text-xl font-semibold">People</h1>
          <GroupFilter groups={groups} selectedGroupId={groupId || "ALL"} />
        </div>
        {people.length === 0 ? (
          <div className="mt-24 text-center text-gray-500">
            {groupId && groupId !== "ALL"
              ? `No people in this group`
              : "Add your first friend to start remembering"}
          </div>
        ) : (
          <ul className="space-y-3">
            {people.map((p: Person) => {
              const last = p.conversations?.[0];
              return (
                <li key={p.id} className="rounded-xl bg-white p-4 shadow">
                  <Link href={`/person/${p.id}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{p.name}</div>
                        {p.group && (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: p.group.color ? `${p.group.color}20` : "#FF6B6B20",
                              color: p.group.color || "#FF6B6B",
                            }}
                          >
                            {p.group.name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {last ? relativeTimeFrom(last.timestamp) : ""}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {last ? firstChars(last.content) : "No conversations yet"}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href="/add-person"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B6B] text-white shadow-lg"
          aria-label="Add person"
        >
          +
        </Link>
      </main>
    </ProtectedRoute>
  );
}
