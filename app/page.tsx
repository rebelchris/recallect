import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { getServerSessionOrMock } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import type { Person, Conversation } from "@/types";

export default async function Home() {
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

    const people = await prisma.person.findMany({
      where: { user: { email: session.user.email } },
      include: {
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
          <h1 className="text-xl font-semibold">People</h1>
        </div>
        {people.length === 0 ? (
          <div className="mt-24 text-center text-gray-500">Add your first friend to start remembering</div>
        ) : (
          <ul className="space-y-3">
            {people.map((p: Person) => {
              const last = p.conversations?.[0];
              return (
                <li key={p.id} className="rounded-xl bg-white p-4 shadow">
                  <Link href={`/person/${p.id}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.name}</div>
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
