"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { calculateQuickReminderDate } from "@/lib/conversationHelpers";

export default function AddConversation() {
    const {id} = useParams()
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldStopRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string>("");
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [setReminder, setSetReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  function startListening() {
    const SpeechRecognitionAPI = (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition || (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setVoiceError("Voice recognition is not supported in your browser. Please type instead.");
      setShowTextFallback(true);
      return;
    }

    shouldStopRef.current = false;
    setVoiceError("");
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // Auto-stop after 30 seconds of silence
    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 30000);
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalTranscript = "";

      // Reset the 30-second timeout on every result
      resetTimeout();

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
      // Clean up timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Always stop when recognition ends to avoid reprocessing audio
      setListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Clean up timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Handle different error types with user-friendly messages
      if (event.error === 'no-speech') {
        setVoiceError("No speech detected. Try again?");
        setShowTextFallback(true);
      } else if (event.error === 'not-allowed') {
        setVoiceError("Microphone access denied. Please check your browser settings and allow microphone access.");
        setShowTextFallback(true);
      } else if (event.error === 'network') {
        setVoiceError("Network error. Please check your connection and try again.");
        setShowTextFallback(true);
      } else if (event.error === 'aborted') {
        // Just stop, don't show error for user-initiated stops
        return;
      } else {
        setVoiceError(`Voice recognition error: ${event.error}. Try typing instead.`);
        setShowTextFallback(true);
      }

      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
    resetTimeout();
  }

  function stopListening() {
    shouldStopRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    recognitionRef.current?.stop();
    setListening(false);
  }

  function setQuickReminder(days: number) {
    setReminderDate(calculateQuickReminderDate(days));
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

      if (!response.ok) {
        console.error("Failed to create conversation");
        return;
      }

      const conversation = await response.json();

      // Create the reminder if enabled
      if (setReminder && reminderDate && conversation.id) {
        const reminderResponse = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            personId: id,
            remindAt: reminderDate,
          }),
        });

        if (!reminderResponse.ok) {
          console.error("Failed to create reminder");
        }
      }

      // Use back() to return to the previous page, which will trigger a fresh fetch
      router.back();
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

      {/* Error message */}
      {voiceError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {voiceError}
        </div>
      )}

      {/* Listening indicator */}
      {listening && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border-2 border-[#FF6B6B] bg-red-50 p-4">
          <div className="relative flex h-4 w-4 items-center justify-center">
            <div className="absolute h-4 w-4 animate-ping rounded-full bg-[#FF6B6B] opacity-75"></div>
            <div className="relative h-4 w-4 rounded-full bg-[#FF6B6B]"></div>
          </div>
          <span className="font-semibold text-[#FF6B6B]">Listening... (auto-stops after 30s of silence)</span>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={() => {
            if (listening) {
              stopListening();
            } else {
              startListening();
            }
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-all ${
            listening
              ? "border-2 border-[#FF6B6B] bg-red-50 text-[#FF6B6B]"
              : "border border-gray-200 bg-white hover:bg-gray-50 hover:shadow"
          }`}
          aria-label={listening ? "Stop recording" : "Start recording"}
          title={listening ? "Click to stop recording" : "Click to start recording"}
        >
          <svg className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          {listening ? "Stop recording" : "Start recording"}
        </button>
        {showTextFallback && !listening && (
          <button
            onClick={() => {
              setShowTextFallback(false);
              setVoiceError("");
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            Type instead
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


