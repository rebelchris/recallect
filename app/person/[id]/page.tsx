"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { relativeTimeFrom } from "@/lib/utils";
import { CONTACT_FREQUENCIES, IMPORTANT_DATE_LABELS } from "@/lib/constants";
import type { Contact, Conversation, Reminder, ImportantDate } from "@/types";
import ReminderItem from "@/components/ReminderItem";
import ConversationItem from "@/components/ConversationItem";
import EditConversationModal from "@/components/EditConversationModal";
import FrequencyIndicator from "@/components/FrequencyIndicator";
import GroupBadge from "@/components/GroupBadge";

export default function PersonDetail() {
  const params = useParams();
  const [contact, setContact] = useState<Contact | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConversation, setEditingConversation] =
    useState<Conversation | null>(null);

  const fetchPersonData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contacts/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) return;
        throw new Error("Failed to fetch contact");
      }
      const data = await res.json();
      setContact(data);

      const [remindersRes, conversationsRes] = await Promise.all([
        fetch(`/api/reminders?contactId=${params.id}&status=PENDING`),
        fetch(`/api/conversations?contactId=${params.id}`),
      ]);

      if (remindersRes.ok) {
        setReminders(await remindersRes.json());
      }
      if (conversationsRes.ok) {
        setConversations(await conversationsRes.json());
      }
    } catch (error) {
      console.error("Error fetching contact data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonData();
  }, [params.id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchPersonData();
      }
    };

    const handleFocus = () => {
      fetchPersonData();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 text-center text-muted-foreground">Not found</div>
    );
  }

  const displayName = [contact.name, contact.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <main className="mx-auto max-w-md p-6 pb-24">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
            >
              ← Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {displayName}
              </h1>
              {contact.nickname && (
                <p className="text-sm text-muted-foreground">
                  &ldquo;{contact.nickname}&rdquo;
                </p>
              )}
            </div>
          </div>
          <Link
            href={`/person/${contact.id}/edit`}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium shadow-sm transition-all hover:bg-muted/80 hover:shadow"
          >
            Edit
          </Link>
        </div>

        {/* Groups */}
        {contact.groups && contact.groups.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {contact.groups.map((group) => (
              <GroupBadge key={group.id} group={group} />
            ))}
          </div>
        )}

        {/* Stats bar */}
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-muted p-4 text-sm font-medium text-muted-foreground">
          <div>
            <span className="text-foreground">{conversations.length}</span>{" "}
            interactions
          </div>
          <span>•</span>
          <div>
            Last:{" "}
            <span className="text-foreground">
              {conversations[0]
                ? relativeTimeFrom(conversations[0].timestamp)
                : "—"}
            </span>
          </div>
          {contact.contactFrequency && (
            <>
              <span>•</span>
              <FrequencyIndicator
                frequency={contact.contactFrequency}
                lastConversationDate={conversations[0]?.timestamp ?? null}
                showLabel
              />
            </>
          )}
        </div>

        {/* Contact Info */}
        {(contact.email ||
          contact.phone ||
          contact.company ||
          contact.jobTitle) && (
          <div className="mb-6 space-y-2 rounded-xl bg-card p-4 shadow-sm">
            {contact.email && (
              <div className="flex items-center gap-2.5 text-sm">
                <Mail size={16} className="text-muted-foreground" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-primary hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone size={16} className="text-muted-foreground" />
                <a
                  href={`tel:${contact.phone}`}
                  className="text-primary hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            )}
            {(contact.company || contact.jobTitle) && (
              <div className="flex items-center gap-2.5 text-sm">
                <Building2 size={16} className="text-muted-foreground" />
                <span>
                  {contact.jobTitle && (
                    <span className="text-foreground">{contact.jobTitle}</span>
                  )}
                  {contact.jobTitle && contact.company && " at "}
                  {contact.company && (
                    <span className="text-foreground">{contact.company}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Social Links */}
        {contact.socialLinks &&
          Object.values(contact.socialLinks).some(Boolean) && (
            <div className="mb-6 flex flex-wrap gap-2">
              {contact.socialLinks.twitter && (
                <a
                  href={`https://x.com/${contact.socialLinks.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  𝕏 {contact.socialLinks.twitter}
                  <ExternalLink size={10} />
                </a>
              )}
              {contact.socialLinks.linkedin && (
                <a
                  href={contact.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  LinkedIn
                  <ExternalLink size={10} />
                </a>
              )}
              {contact.socialLinks.instagram && (
                <a
                  href={`https://instagram.com/${contact.socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  IG @{contact.socialLinks.instagram}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}

        {/* Important Dates */}
        {contact.importantDates && contact.importantDates.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-base font-semibold">Important Dates</h2>
            <div className="space-y-2">
              {contact.importantDates.map((d: ImportantDate) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2.5 rounded-xl bg-card p-3 shadow-sm"
                >
                  <Calendar size={16} className="text-primary" />
                  <div className="text-sm">
                    <span className="font-medium">
                      {IMPORTANT_DATE_LABELS[d.label] || d.label}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {d.date}
                      {d.year && ` (${d.year})`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="mb-6 rounded-xl bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              Notes
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {contact.notes}
            </p>
          </div>
        )}

        {/* Frequency Goal */}
        {contact.contactFrequency && (
          <div className="mb-6 rounded-xl border-2 border-secondary/30 bg-accent p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Briefcase size={16} className="text-secondary" />
              Goal: Reach out{" "}
              {CONTACT_FREQUENCIES[contact.contactFrequency]?.label.toLowerCase()}
            </div>
          </div>
        )}

        {/* Active Reminders */}
        {reminders.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-base font-semibold">Active Reminders</h2>
            <ul className="space-y-3">
              {reminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onUpdate={fetchPersonData}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Conversations */}
        <h2 className="mb-3 text-base font-semibold">Interactions</h2>
        {conversations.length === 0 ? (
          <div className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
            No interactions yet. Tap the + button to log one.
          </div>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                onUpdate={fetchPersonData}
                onEdit={setEditingConversation}
                relativeTime={relativeTimeFrom(c.timestamp)}
              />
            ))}
          </ul>
        )}
      </main>

      <EditConversationModal
        isOpen={editingConversation !== null}
        onClose={() => setEditingConversation(null)}
        conversation={editingConversation}
        onUpdate={fetchPersonData}
      />
    </>
  );
}
