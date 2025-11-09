"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { relativeTimeFrom } from "@/lib/utils";
import type { Person, Conversation, Reminder } from "@/types";
import ReminderItem from "@/components/ReminderItem";
import ConversationItem from "@/components/ConversationItem";
import EditConversationModal from "@/components/EditConversationModal";

export default function PersonDetail() {
  const params = useParams();
  const [person, setPerson] = useState<Person | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);

  const fetchPersonData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/people/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          return;
        }
        throw new Error("Failed to fetch person");
      }
      const data = await res.json();
      setPerson(data);

      // Fetch reminders
      const remindersRes = await fetch(
        `/api/reminders?personId=${params.id}&status=PENDING`
      );
      if (remindersRes.ok) {
        const remindersData = await remindersRes.json();
        setReminders(remindersData);
      }

      // Fetch conversations
      const conversationsRes = await fetch(
        `/api/conversations?personId=${params.id}`
      );
      if (conversationsRes.ok) {
        const conversationsData = await conversationsRes.json();
        setConversations(conversationsData);
      }
    } catch (error) {
      console.error("Error fetching person data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading...</div>
    );
  }

  if (!person) {
    return <div className="p-6 text-center text-gray-500">Not found</div>;
  }

  return (
    <>
      <main className="mx-auto max-w-md p-6 pb-24">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#FF6B6B] transition-colors hover:bg-red-50"
            >
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
          <span className="text-gray-900">{conversations.length}</span>{" "}
          conversations • Last talked:{" "}
          <span className="text-gray-900">
            {conversations[0]
              ? relativeTimeFrom(conversations[0].timestamp)
              : "—"}
          </span>
        </div>

        {/* Active Reminders */}
        {reminders.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-base font-semibold text-gray-800">
              Active Reminders
            </h2>
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

        <h2 className="mb-3 text-base font-semibold text-gray-800">
          Conversations
        </h2>
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


