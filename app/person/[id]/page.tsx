import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { relativeTimeFrom } from "@/lib/utils";
import { isMockAuthEnabled } from "@/lib/mockAuth";
import {authClient} from "@/lib/auth-client";
import {auth} from "@/lib/auth";
import {headers} from "next/headers";

export default async function PersonDetail({ params }: { params: { id: string } }) {
    const {id} = await params;
    const session = await auth.api.getSession({
        headers: await headers() // you need to pass the headers object.
    })
    console.log(session)


    let person = await prisma.person.findUnique({
    where: { id },
    include: { conversations: { orderBy: { timestamp: "desc" } } },
  }).catch((e) => {
    if (isMockAuthEnabled()) return null;
    throw e;
  });

  if (!person) return <div className="p-4">Not found</div>;

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <div className="mb-3 flex items-center gap-2">
        <Link href="/" className="rounded-md px-2 py-1 text-sm text-[#FF6B6B]">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">{person.name}</h1>
      </div>
      <div className="mb-4 text-sm text-gray-600">
        You’ve had {person.conversations.length} conversations • Last talked: {person.conversations[0] ? relativeTimeFrom(person.conversations[0].timestamp) : "—"}
      </div>
      <ul className="space-y-3">
        {person.conversations.map((c) => (
          <li key={c.id} className="rounded-xl bg-white p-4 shadow">
            <div className="mb-1 text-xs text-gray-500">{relativeTimeFrom(c.timestamp)}</div>
            <div className="whitespace-pre-wrap text-sm">{c.content}</div>
          </li>
        ))}
      </ul>

      <Link
        href={`/person/${person.id}/add`}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B6B] text-white shadow-lg"
      >
        +
      </Link>
    </main>
  );
}


