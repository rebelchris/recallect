import Link from "next/link";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { getWeeklyReview } from "@/lib/queries/dashboard";
import { firstChars } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatDateLabel(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default async function WeeklyReviewPage() {
  const review = await getWeeklyReview(7);
  const rangeLabel = `${formatDateLabel(review.summary.windowStartIso)} - ${formatDateLabel(
    review.summary.windowEndIso
  )}`;

  return (
    <main className="mx-auto max-w-lg px-5 pb-28 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rangeLabel} · Last {review.summary.windowDays} days
          </p>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-2">
        <SummaryCard
          icon={CalendarRange}
          label="Interactions"
          value={review.summary.interactions}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Contacts reached"
          value={review.summary.uniqueContacts}
        />
        <SummaryCard
          icon={Clock3}
          label="Open loops"
          value={review.summary.openLoops}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="At-risk contacts"
          value={review.summary.atRiskContacts}
          danger={review.summary.atRiskContacts > 0}
        />
      </section>

      <section className="mb-6">
        <SectionTitle title="Who got attention" />
        {review.attendedContacts.length === 0 ? (
          <EmptyCard text="No interactions logged this week." />
        ) : (
          <ul className="space-y-2">
            {review.attendedContacts.map((contact) => (
              <li
                key={contact.contactId}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/person/${contact.contactId}`}
                    className="font-medium hover:underline"
                  >
                    {contact.contactName}
                    {contact.contactLastName ? ` ${contact.contactLastName}` : ""}
                  </Link>
                  <span className="text-xs font-medium text-muted-foreground">
                    {contact.interactionCount} this week
                  </span>
                </div>
                {contact.lastInteractionPreview ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {firstChars(contact.lastInteractionPreview, 95)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <SectionTitle title="Who was ignored" />
        {review.ignoredContacts.length === 0 ? (
          <EmptyCard text="No ignored contacts in this window." />
        ) : (
          <ul className="space-y-2">
            {review.ignoredContacts.map((contact) => (
              <li
                key={contact.contactId}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/person/${contact.contactId}`}
                      className="font-medium hover:underline"
                    >
                      {contact.contactName}
                      {contact.contactLastName ? ` ${contact.contactLastName}` : ""}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{contact.reason}</p>
                  </div>
                  <PriorityTag priority={contact.priority} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle title="Suggested next steps" />
        {review.nextSteps.length === 0 ? (
          <EmptyCard text="No suggestions right now." />
        ) : (
          <ul className="space-y-2">
            {review.nextSteps.map((step) => (
              <li
                key={step.contactId}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {step.contactName}
                      {step.contactLastName ? ` ${step.contactLastName}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.reason}</p>
                  </div>
                  <PriorityTag priority={step.priority} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/person/${step.contactId}/add`}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Lightbulb size={12} />
                    {step.actionLabel}
                  </Link>
                  <Link
                    href={`/person/${step.contactId}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>;
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
        <Icon size={14} />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`text-xl font-semibold ${danger ? "text-danger" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function PriorityTag({ priority }: { priority: "high" | "medium" | "low" }) {
  const styles = {
    high: "border-danger bg-danger-muted text-danger",
    medium: "border-warning bg-warning-muted text-warning",
    low: "border-success bg-success-muted text-success",
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[priority]}`}>
      {priority}
    </span>
  );
}
