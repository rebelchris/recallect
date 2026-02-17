import Link from "next/link";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import { CHARACTER_LIMITS } from "@/lib/conversationHelpers";
import InteractionTypeIcon from "@/components/InteractionTypeIcon";
import type { InteractionType } from "@/lib/constants";

interface RecentInteraction {
  id: string;
  contactId: string;
  content: string;
  type: string;
  timestamp: string;
  contact?: {
    name: string;
  } | null;
}

interface RecentInteractionsSectionProps {
  interactions: RecentInteraction[];
}

export function RecentInteractionsSection({ interactions }: RecentInteractionsSectionProps) {
  if (interactions.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold">Recent Interactions</h2>
      <ul className="space-y-2">
        {interactions.map((interaction) => (
          <li key={interaction.id}>
            <Link
              href={`/person/${interaction.contactId}`}
              className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md"
            >
              <InteractionTypeIcon
                type={interaction.type as InteractionType}
                size={16}
                className="mt-0.5 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {interaction.contact?.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTimeFrom(interaction.timestamp)}
                  </span>
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {firstChars(interaction.content, CHARACTER_LIMITS.PREVIEW_SHORT)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecentInteractionsSkeleton() {
  return (
    <section className="mb-8">
      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
      <ul className="space-y-2">
        {[1, 2, 3].map((i) => (
          <li key={i}>
            <div className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
              <div className="mt-0.5 h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
