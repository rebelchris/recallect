import Link from "next/link";
import { relativeTimeFrom } from "@/lib/utils";
import { CONTACT_FREQUENCIES } from "@/lib/constants";

interface StaleContact {
  id: string;
  name: string;
  lastName?: string | null;
  contactFrequency: string;
  lastConversationDate?: string | null;
  staleness: "red" | "yellow" | "green";
  daysSince: number;
}

interface StaleContactsSectionProps {
  contacts: StaleContact[];
  limit?: number;
}

const STALENESS_COLORS = {
  red: {
    dot: "bg-red-500",
    text: "text-red-500",
  },
  yellow: {
    dot: "bg-yellow-500",
    text: "text-yellow-500",
  },
  green: {
    dot: "bg-green-500",
    text: "text-green-500",
  },
} as const;

export function StaleContactsSection({ contacts, limit = 5 }: StaleContactsSectionProps) {
  if (contacts.length === 0) return null;

  const displayContacts = contacts.slice(0, limit);

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">Reach Out To</h2>
      <ul className="space-y-2">
        {displayContacts.map((c) => {
          const colors = STALENESS_COLORS[c.staleness];
          return (
            <li key={c.id}>
              <Link
                href={`/person/${c.id}`}
                className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${colors.dot}`} />
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
                  <div className={`font-semibold ${colors.text}`}>
                    {c.daysSince}d overdue
                  </div>
                  <div>
                    Goal:{" "}
                    {CONTACT_FREQUENCIES[c.contactFrequency as keyof typeof CONTACT_FREQUENCIES]?.label}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function StaleContactsSkeleton() {
  return (
    <section className="mb-8">
      <div className="mb-4 h-6 w-28 animate-pulse rounded bg-muted" />
      <ul className="space-y-2">
        {[1, 2, 3].map((i) => (
          <li key={i}>
            <div className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-muted" />
                <div className="space-y-1">
                  <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
