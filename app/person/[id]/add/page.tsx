"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { calculateQuickReminderDate } from "@/lib/conversationHelpers";
import InteractionTypeSelector from "@/components/InteractionTypeSelector";
import type { InteractionType } from "@/lib/constants";

type FollowUpTemplate = {
  id: string;
  title: string;
  message: string;
  reminderDays: number;
};

type SmartReminderPreset = {
  label: string;
  days: number;
};

export default function AddConversation() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [content, setContent] = useState("");
  const [type, setType] = useState<InteractionType>("other");
  const [saving, setSaving] = useState(false);
  const [contactFirstName, setContactFirstName] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldStopRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string>("");
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [setReminder, setSetReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const copiedTemplateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const followUpTemplates = useMemo(
    () => buildFollowUpTemplates({ type, content, contactFirstName }),
    [type, content, contactFirstName]
  );

  const smartReminderPresets = useMemo(
    () => buildSmartReminderPresets({ type, content }),
    [type, content]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadContact() {
      try {
        const response = await fetch(`/api/contacts/${id}`);
        if (!response.ok) return;
        const contact = await response.json();
        if (cancelled) return;
        setContactFirstName(extractFirstName(contact.name || ""));
      } catch (error) {
        console.error("Failed to fetch contact for assistant context:", error);
      }
    }

    void loadContact();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (copiedTemplateTimeoutRef.current) {
        clearTimeout(copiedTemplateTimeoutRef.current);
      }
    };
  }, []);

  function startListening() {
    const SpeechRecognitionAPI =
      (
        window as typeof window & {
          SpeechRecognition?: new () => SpeechRecognition;
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).SpeechRecognition ||
      (
        window as typeof window & {
          SpeechRecognition?: new () => SpeechRecognition;
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setVoiceError(
        "Voice recognition is not supported in your browser. Please type instead."
      );
      setShowTextFallback(true);
      return;
    }

    shouldStopRef.current = false;
    setVoiceError("");
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    const resetTimeout = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => stopListening(), 30000);
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      resetTimeout();
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        setContent((prev) =>
          (prev ? prev + " " : "") + finalTranscript.trim()
        );
      }
    };

    recognition.onend = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (event.error === "no-speech") {
        setVoiceError("No speech detected. Try again?");
        setShowTextFallback(true);
      } else if (event.error === "not-allowed") {
        setVoiceError("Microphone access denied.");
        setShowTextFallback(true);
      } else if (event.error === "network") {
        setVoiceError("Network error.");
        setShowTextFallback(true);
      } else if (event.error === "aborted") {
        return;
      } else {
        setVoiceError(`Voice recognition error: ${event.error}`);
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
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    recognitionRef.current?.stop();
    setListening(false);
  }

  function setQuickReminder(days: number) {
    setReminderDate(calculateQuickReminderDate(days));
  }

  function applyReminderPreset(days: number) {
    setSetReminder(true);
    setQuickReminder(days);
  }

  async function copyFollowUpTemplate(template: FollowUpTemplate) {
    try {
      await navigator.clipboard.writeText(template.message);
      setCopiedTemplateId(template.id);
      if (copiedTemplateTimeoutRef.current) {
        clearTimeout(copiedTemplateTimeoutRef.current);
      }
      copiedTemplateTimeoutRef.current = setTimeout(() => {
        setCopiedTemplateId((current) =>
          current === template.id ? null : current
        );
      }, 1800);
    } catch {
      setVoiceError("Could not copy follow-up text.");
    }
  }

  async function onSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: id,
          content,
          type,
          skipAutoReminder: setReminder,
        }),
      });

      if (!response.ok) {
        console.error("Failed to create conversation");
        return;
      }

      const conversation = await response.json();

      if (setReminder && reminderDate && conversation.id) {
        await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation.id,
            contactId: id,
            remindAt: reminderDate,
          }),
        });
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6 pb-24">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">
        Log Interaction
      </h1>

      {/* Interaction Type */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Type
        </label>
        <InteractionTypeSelector value={type} onChange={setType} />
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What did you talk about?"
        className="h-52 w-full resize-none rounded-xl border border-border bg-input p-4 text-base text-foreground outline-none transition-colors focus:border-secondary focus:bg-card focus:shadow-sm placeholder:text-muted-foreground"
      />

      {/* Post-interaction assistant */}
      <section className="mt-5 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            Post-interaction assistant
          </p>
          <p className="text-xs text-muted-foreground">
            Quick follow-up drafts
          </p>
        </div>
        <div className="space-y-2">
          {followUpTemplates.map((template) => (
            <article
              key={template.id}
              className="rounded-lg border border-border bg-muted/40 p-3"
            >
              <p className="text-sm font-medium text-foreground">
                {template.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {template.message}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyFollowUpTemplate(template)}
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {copiedTemplateId === template.id ? "Copied" : "Copy text"}
                </button>
                <button
                  type="button"
                  onClick={() => applyReminderPreset(template.reminderDays)}
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Remind me in {template.reminderDays}d
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Reminder Section */}
      <div className="mt-5 rounded-xl border border-border bg-muted p-4">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={setReminder}
            onChange={(e) => setSetReminder(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-semibold text-foreground">
            Remind me about this
          </span>
        </label>

        {setReminder && (
          <div className="mt-4 space-y-3">
            {smartReminderPresets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {smartReminderPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setQuickReminder(preset.days)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-secondary hover:bg-accent"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "In 1 week", days: 7 },
                { label: "In 2 weeks", days: 14 },
                { label: "In 3 weeks", days: 21 },
                { label: "In 1 month", days: 30 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setQuickReminder(days)}
                  className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-secondary hover:bg-accent"
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Or pick a specific date:
              </label>
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-secondary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Voice error */}
      {voiceError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {voiceError}
        </div>
      )}

      {/* Listening indicator */}
      {listening && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border-2 border-primary bg-accent p-4">
          <div className="relative flex h-4 w-4 items-center justify-center">
            <div className="absolute h-4 w-4 animate-ping rounded-full bg-primary opacity-75"></div>
            <div className="relative h-4 w-4 rounded-full bg-primary"></div>
          </div>
          <span className="font-semibold text-primary">
            Listening... (auto-stops after 30s of silence)
          </span>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={() => {
            if (listening) stopListening();
            else startListening();
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-all ${
            listening
              ? "border-2 border-primary bg-accent text-primary"
              : "border border-border bg-card text-foreground hover:bg-muted hover:shadow"
          }`}
          aria-label={listening ? "Stop recording" : "Start recording"}
        >
          <svg
            className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          {listening ? "Stop recording" : "Start recording"}
        </button>
        {showTextFallback && !listening && (
          <button
            onClick={() => {
              setShowTextFallback(false);
              setVoiceError("");
            }}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Type instead
          </button>
        )}
        <button
          onClick={onSave}
          disabled={!content || saving || (setReminder && !reminderDate)}
          className="ml-auto rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </main>
  );
}

function buildFollowUpTemplates({
  type,
  content,
  contactFirstName,
}: {
  type: InteractionType;
  content: string;
  contactFirstName: string;
}): FollowUpTemplate[] {
  const name = contactFirstName ? ` ${contactFirstName}` : "";
  const interactionLabel =
    type === "call"
      ? "call"
      : type === "email"
        ? "email exchange"
        : type === "meeting"
          ? "meeting"
          : type === "coffee" || type === "dinner" || type === "hangout"
            ? "catch-up"
            : "chat";

  const topic = summarizeConversation(content);

  return [
    {
      id: "quick-recap",
      title: "Quick recap",
      message: `Great ${interactionLabel} today${name}. ${
        topic
          ? `Good talking about ${topic}.`
          : "Thanks again for the time."
      }`,
      reminderDays: 2,
    },
    {
      id: "next-step",
      title: "Next-step nudge",
      message: `Following up on our ${interactionLabel}${name}. Want to lock one next step this week?`,
      reminderDays: 7,
    },
  ];
}

function buildSmartReminderPresets({
  type,
  content,
}: {
  type: InteractionType;
  content: string;
}): SmartReminderPreset[] {
  const presets: SmartReminderPreset[] = [];
  const lower = content.toLowerCase();

  if (
    type === "meeting" ||
    type === "coffee" ||
    type === "dinner" ||
    type === "hangout"
  ) {
    presets.push(
      { label: "Send recap tomorrow", days: 1 },
      { label: "Check in next week", days: 7 }
    );
  } else if (type === "call" || type === "text" || type === "email" || type === "whatsapp") {
    presets.push(
      { label: "Follow up in 2 days", days: 2 },
      { label: "Check in next week", days: 7 }
    );
  } else {
    presets.push(
      { label: "Follow up in 3 days", days: 3 },
      { label: "Check in next week", days: 7 }
    );
  }

  if (/\bintro|introduc/.test(lower)) {
    presets.unshift({ label: "Check intro in 5 days", days: 5 });
  }

  if (/\bproposal|quote|pricing|contract/.test(lower)) {
    presets.unshift({ label: "Nudge in 2 days", days: 2 });
  }

  const deduped: SmartReminderPreset[] = [];
  for (const preset of presets) {
    if (!deduped.some((item) => item.label === preset.label && item.days === preset.days)) {
      deduped.push(preset);
    }
  }

  return deduped.slice(0, 3);
}

function summarizeConversation(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const snippet = cleaned.slice(0, 80);
  if (snippet.length < cleaned.length) {
    return `${snippet}...`;
  }
  return snippet;
}

function extractFirstName(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "";
  return cleaned.split(" ")[0];
}
