import Link from "next/link";
import { IMPORTANT_DATE_LABELS } from "@/lib/constants";

interface UpcomingDate {
  id: string;
  contactId: string;
  contactName: string;
  contactLastName?: string | null;
  label: string;
  date: string;
  year?: number | null;
  daysUntil: number;
}

interface UpcomingDatesSectionProps {
  dates: UpcomingDate[];
}

export function UpcomingDatesSection({ dates }: UpcomingDatesSectionProps) {
  if (dates.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">Upcoming Dates</h2>
      <ul className="space-y-2">
        {dates.map((d) => (
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
    </section>
  );
}

export function UpcomingDatesSkeleton() {
  return (
    <section className="mb-8">
      <div className="mb-4 h-6 w-32 animate-pulse rounded bg-muted" />
      <ul className="space-y-2">
        {[1, 2, 3].map((i) => (
          <li key={i}>
            <div className="flex items-center justify-between rounded-2xl border-2 border-secondary/30 bg-accent p-4">
              <div className="space-y-2">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-1 text-right">
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                <div className="h-3 w-10 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
