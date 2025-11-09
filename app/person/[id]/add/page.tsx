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
    <main className="mx-auto max-w-md p-6 pb-24">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Add Conversation</h1>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What did you talk about?"
        className="h-52 w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-base outline-none transition-colors focus:border-[#FF8C42] focus:bg-white focus:shadow-sm"
      />

      {/* Reminder Section */}
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50/30 p-4">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={setReminder}
            onChange={(e) => setSetReminder(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#FF6B6B] focus:ring-[#FF6B6B]"
          />
          <span className="text-sm font-semibold text-gray-800">Remind me about this</span>
        </label>

        {setReminder && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuickReminder(7)}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium transition-colors hover:border-[#FF8C42] hover:bg-orange-50"
              >
                In 1 week
              </button>
              <button
                onClick={() => setQuickReminder(14)}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium transition-colors hover:border-[#FF8C42] hover:bg-orange-50"
              >
                In 2 weeks
              </button>
              <button
                onClick={() => setQuickReminder(21)}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium transition-colors hover:border-[#FF8C42] hover:bg-orange-50"
              >
                In 3 weeks
              </button>
              <button
                onClick={() => setQuickReminder(30)}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium transition-colors hover:border-[#FF8C42] hover:bg-orange-50"
              >
                In 1 month
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Or pick a specific date:</label>
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#FF8C42] focus:shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {!listening ? (
          <button onClick={startListening} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:bg-gray-50 hover:shadow">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Start voice
          </button>
        ) : (
          <button onClick={stopListening} className="flex items-center gap-2 rounded-lg border-2 border-[#FF6B6B] bg-red-50 px-4 py-2.5 text-sm font-medium text-[#FF6B6B] shadow-sm transition-colors hover:bg-red-100">
            <svg className="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Stop
          </button>
        )}
        <button
          onClick={onSave}
          disabled={!content || saving || (setReminder && !reminderDate)}
          className="ml-auto rounded-lg bg-[#FF6B6B] px-5 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-[#FF5555] hover:shadow disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </main>
  );
}


