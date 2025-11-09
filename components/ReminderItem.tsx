"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Reminder } from "@/types";

interface ReminderItemProps {
  reminder: Reminder;
  onUpdate: () => void;
}

export default function ReminderItem({ reminder, onUpdate }: ReminderItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDismiss = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISMISSED" }),
      });

      if (res.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to dismiss reminder:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <li className="rounded-2xl border-2 border-[#FF8C42] bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#FF6B6B]">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">
              {new Date(reminder.remindAt).toLocaleDateString()} at{" "}
              {new Date(reminder.remindAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {reminder.conversation && (
            <div className="mt-2 text-sm leading-relaxed text-gray-700">
              {reminder.conversation.content.substring(0, 100)}
              {reminder.conversation.content.length > 100 && "..."}
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          disabled={isUpdating}
          className="flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-white hover:text-green-600 transition-colors disabled:opacity-50"
          title="Mark as done"
        >
          <Check className="w-5 h-5" />
        </button>
      </div>
    </li>
  );
}
