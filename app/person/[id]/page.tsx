import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { relativeTimeFrom } from "@/lib/utils";
import {Conversation, ReminderStatus} from "@/types";

export default async function PersonDetail({ params }: { params: { id: string } }) {
    const {id} = await params;
    const person = await prisma.person.findUnique({
    where: { id },
    include: {
      conversations: { orderBy: { timestamp: "desc" } },
      reminders: {
        where: { status: ReminderStatus.PENDING },
        include: { conversation: true },
        orderBy: { remindAt: "asc" },
      },
    },
  });

  if (!person) return <div className="p-6 text-center text-gray-500">Not found</div>;

  return (
    <main className="mx-auto max-w-md p-6 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#FF6B6B] transition-colors hover:bg-red-50">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{person.name}</h1>
        </div>
        <Link
          href={`/person/${person.id}/edit`}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-200 hover:shadow"
        >
          Edit
        </Link>
      </div>
      <div className="mb-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 text-sm font-medium text-gray-700">
        <span className="text-gray-900">{person.conversations.length}</span> conversations • Last talked: <span className="text-gray-900">{person.conversations[0] ? relativeTimeFrom(person.conversations[0].timestamp) : "—"}</span>
      </div>

      {/* Active Reminders */}
      {person.reminders && person.reminders.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-gray-800">Active Reminders</h2>
          <ul className="space-y-3">
            {person.reminders.map((reminder: any) => (
              <li
                key={reminder.id}
                className="rounded-2xl border-2 border-[#FF8C42] bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm"
              >
                <div className="flex items-center gap-1.5 font-semibold text-[#FF6B6B]">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">
                    {new Date(reminder.remindAt).toLocaleDateString()} at{" "}
                    {new Date(reminder.remindAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="mt-2 text-sm leading-relaxed text-gray-700">
                  {reminder.conversation.content.substring(0, 100)}
                  {reminder.conversation.content.length > 100 && "..."}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mb-3 text-base font-semibold text-gray-800">Conversations</h2>
      <ul className="space-y-3">
        {person.conversations.map((c: Conversation) => (
          <li key={c.id} className="rounded-2xl bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="mb-2 text-xs font-medium text-gray-500">{relativeTimeFrom(c.timestamp)}</div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{c.content}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}


