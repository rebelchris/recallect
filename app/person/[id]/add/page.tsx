"use client";

import * as React from 'react'
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AddConversation({ params } ) {
    const { id } = React.use(params)
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition: SpeechRecognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setContent((prev) => (prev ? prev + " " : "") + transcript.trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function onSave() {
    setSaving(true);
    try {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: id, content }),
      });
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
          disabled={!content || saving}
          className="rounded-md bg-[#FF6B6B] px-4 py-2 text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </main>
  );
}


