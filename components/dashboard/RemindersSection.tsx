import Link from "next/link";
import { firstChars } from "@/lib/utils";
import { CHARACTER_LIMITS } from "@/lib/conversationHelpers";
import { Clock } from "lucide-react";

interface Reminder {
  id: string;
  contactId: string;
  remindAt: string;
  contact?: {
    name: string;
  } | null;
  conversation?: {
    content: string;
  } | null;
}

interface RemindersSectionProps {
  reminders: Reminder[];
}

export function RemindersSection({ reminders }: RemindersSectionProps) {
  if (reminders.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">Upcoming Reminders</h2>
      <ul className="space-y-3">
        {reminders.map((reminder) => (
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
                <Clock className="h-3.5 w-3.5" />
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
    </section>
  );
}

export function RemindersSkeleton() {
  return (
    <section className="mb-8">
      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
      <ul className="space-y-3">
        {[1, 2].map((i) => (
          <li
            key={i}
            className="rounded-2xl border-2 border-secondary bg-accent p-4 shadow-sm"
          >
            <div className="space-y-2">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-3 h-4 w-32 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </section>
  );
}
