import Link from "next/link";
import { firstChars, relativeTimeFrom } from "@/lib/utils";
import FrequencyIndicator from "@/components/FrequencyIndicator";
import GroupBadge from "@/components/GroupBadge";
import type { Contact } from "@/types";

interface ContactsListProps {
  contacts: Contact[];
  isSearching?: boolean;
  groupId?: string;
}

export function ContactsList({ contacts, isSearching, groupId }: ContactsListProps) {
  const title = isSearching ? "Search Results" : "Contacts";
  const isFiltered = groupId && groupId !== "ALL";

  if (contacts.length === 0) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <div className="mt-16 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-base font-medium text-muted-foreground">
            {isSearching
              ? "No results found"
              : isFiltered
                ? "No contacts in this group"
                : "Add your first contact to get started"}
          </p>
          {!isSearching && !isFiltered && (
            <p className="mt-1 text-sm text-muted-foreground">
              Tap the + button to get started
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <ul className="space-y-3">
        {contacts.map((c) => {
          const lastConvo = c.conversations?.[0];
          return (
            <li
              key={c.id}
              className="group rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <Link href={`/person/${c.id}`} className="block">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="text-base font-semibold">
                      {c.name}
                      {c.lastName ? ` ${c.lastName}` : ""}
                    </div>
                    {c.contactFrequency && (
                      <FrequencyIndicator
                        frequency={c.contactFrequency}
                        lastConversationDate={c.lastConversationDate ?? null}
                      />
                    )}
                  </div>
                  <div className="flex gap-1">
                    {c.groups?.slice(0, 2).map((group) => (
                      <GroupBadge key={group.id} group={group} size="sm" />
                    ))}
                  </div>
                </div>
                <div className="mt-2.5 text-xs font-medium text-muted-foreground">
                  {lastConvo ? (
                    <>Last: {relativeTimeFrom(lastConvo.timestamp)}</>
                  ) : (
                    <span className="text-secondary">Never contacted</span>
                  )}
                </div>
                <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {lastConvo ? firstChars(lastConvo.content) : "No interactions yet"}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ContactsListSkeleton() {
  return (
    <section>
      <div className="mb-4 h-6 w-20 animate-pulse rounded bg-muted" />
      <ul className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <li key={i} className="rounded-2xl bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="flex gap-1">
                <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
            <div className="mt-2.5 h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-1.5 h-4 w-full animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </section>
  );
}
