"use client";

import * as React from 'react'
import { useState, useRef } from "react";
import {useParams, useRouter} from "next/navigation";

export default function AddConversation() {
    const {id} = useParams()
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldStopRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [setReminder, setSetReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    shouldStopRef.current = false;
    const recognition: SpeechRecognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalTranscript = "";

      // Only process final results to avoid duplicates
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + " ";
        }
      }

      // Only update if we have final results
      if (finalTranscript) {
        setContent((prev) => (prev ? prev + " " : "") + finalTranscript.trim());
      }
    };

    recognition.onend = () => {
      // Only stop if user manually stopped, otherwise restart
      if (shouldStopRef.current) {
        setListening(false);
      } else {
        // Auto-restart if it stopped unexpectedly
        recognition.start();
      }
    };

    recognition.onerror = (event: any) => {
      // Only stop on actual errors, not on aborted/no-speech
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  function stopListening() {
    shouldStopRef.current = true;
    recognitionRef.current?.stop();
    setListening(false);
  }

  function setQuickReminder(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setReminderDate(date.toISOString().slice(0, 16));
  }

  async function onSave() {
    setSaving(true);
    try {
      // Create the conversation
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: id, content }),
      });

      const conversation = await response.json();

      // Create the reminder if enabled
      if (setReminder && reminderDate && conversation.id) {
        await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            personId: id,
            remindAt: reminderDate,
          }),
        });
      }

      router.replace(`/person/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-3 text-xl font-semibold">Add Conversation</h1>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What did you talk about?"
        className="h-48 w-full resize-none rounded-lg border border-gray-200 p-3 outline-none focus:border-[#FF8C42]"
      />

      {/* Reminder Section */}
      <div className="mt-4 rounded-lg border border-gray-200 p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={setReminder}
            onChange={(e) => setSetReminder(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#FF6B6B] focus:ring-[#FF6B6B]"
          />
          <span className="font-medium">Remind me about this</span>
        </label>

        {setReminder && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuickReminder(7)}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
              >
                In 1 week
              </button>
              <button
                onClick={() => setQuickReminder(14)}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
              >
                In 2 weeks
              </button>
              <button
                onClick={() => setQuickReminder(21)}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
              >
                In 3 weeks
              </button>
              <button
                onClick={() => setQuickReminder(30)}
                className="rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
              >
                In 1 month
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-600">Or pick a specific date:</label>
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 outline-none focus:border-[#FF8C42]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {!listening ? (
          <button onClick={startListening} className="rounded-md border border-gray-200 px-3 py-2">
            Start voice
          </button>
        ) : (
          <button onClick={stopListening} className="rounded-md border border-gray-200 px-3 py-2">
            Stop
          </button>
        )}
        <button
          onClick={onSave}
          disabled={!content || saving || (setReminder && !reminderDate)}
          className="rounded-md bg-[#FF6B6B] px-4 py-2 text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </main>
  );
}


