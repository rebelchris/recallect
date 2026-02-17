"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Plus, Mic } from "lucide-react";
import { calculateQuickReminderDate } from "@/lib/conversationHelpers";
import InteractionTypeSelector from "./InteractionTypeSelector";
import type { Contact, Group } from "@/types";
import type { InteractionType } from "@/lib/constants";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPersonId?: string;
}

export default function QuickAddModal({
  isOpen,
  onClose,
  preselectedPersonId,
}: QuickAddModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [people, setPeople] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const [step, setStep] = useState<"select" | "input">("select");
  const [selectedPerson, setSelectedPerson] = useState<Contact | null>(null);

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonGroupIds, setNewPersonGroupIds] = useState<string[]>([]);

  const [content, setContent] = useState("");
  const [type, setType] = useState<InteractionType>("other");
  const [saving, setSaving] = useState(false);

  const [setReminder, setSetReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string>("");
  const [showTextFallback, setShowTextFallback] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldStopRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPeople();
      fetchGroups();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && preselectedPersonId && people.length > 0) {
      const person = people.find((p) => p.id === preselectedPersonId);
      if (person) {
        setSelectedPerson(person);
        setStep("input");
      }
    }
  }, [isOpen, preselectedPersonId, people]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  async function fetchPeople() {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) setPeople(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function fetchGroups() {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) setGroups(await res.json());
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }

  function handleClose() {
    setStep("select");
    setSelectedPerson(null);
    setIsCreatingNew(false);
    setNewPersonName("");
    setNewPersonGroupIds([]);
    setContent("");
    setType("other");
    setSearchQuery("");
    setSetReminder(false);
    setReminderDate("");
    setVoiceError("");
    setShowTextFallback(false);
    stopListening();
    onClose();
  }

  function setQuickReminder(days: number) {
    setReminderDate(calculateQuickReminderDate(days));
  }

  function handleSelectPerson(person: Contact) {
    setSelectedPerson(person);
    setStep("input");
  }

  async function handleCreateNewPerson() {
    if (!newPersonName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPersonName.trim(),
          groupIds:
            newPersonGroupIds.length > 0 ? newPersonGroupIds : undefined,
        }),
      });
      if (res.ok) {
        const newPerson = await res.json();
        setSelectedPerson(newPerson);
        setIsCreatingNew(false);
        setNewPersonName("");
        setNewPersonGroupIds([]);
        setStep("input");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveConversation() {
    if (!selectedPerson || !content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedPerson.id,
          content: content.trim(),
          type,
        }),
      });
      if (res.ok) {
        const conversation = await res.json();
        if (setReminder && reminderDate && conversation.id) {
          await fetch("/api/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: conversation.id,
              contactId: selectedPerson.id,
              remindAt: reminderDate,
            }),
          });
        }
        router.refresh();
        handleClose();
      }
    } finally {
      setSaving(false);
    }
  }

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
      setVoiceError("Voice recognition is not supported.");
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
      if (event.error !== "aborted") {
        setVoiceError(`Voice error: ${event.error}`);
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

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-card p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      style={{ width: "min(90vw, 420px)", maxHeight: "85vh", margin: 0 }}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {step === "select" ? "Quick Add" : selectedPerson?.name}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-foreground transition-colors hover:bg-muted active:bg-muted"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {step === "select" ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-input px-4 py-3 transition-colors focus-within:border-secondary focus-within:bg-card">
                <Search size={18} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>

              {isCreatingNew ? (
                <div className="mb-4 rounded-xl border-2 border-secondary bg-accent p-4">
                  <input
                    type="text"
                    placeholder="Enter contact's name..."
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateNewPerson();
                      if (e.key === "Escape") {
                        setIsCreatingNew(false);
                        setNewPersonName("");
                        setNewPersonGroupIds([]);
                      }
                    }}
                    className="w-full rounded border-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() =>
                          setNewPersonGroupIds((prev) =>
                            prev.includes(group.id)
                              ? prev.filter((id) => id !== group.id)
                              : [...prev, group.id]
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          newPersonGroupIds.includes(group.id)
                            ? "text-white"
                            : "bg-card border border-border"
                        }`}
                        style={
                          newPersonGroupIds.includes(group.id)
                            ? { backgroundColor: group.color || "#FF6B6B" }
                            : undefined
                        }
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleCreateNewPerson}
                      disabled={!newPersonName.trim() || saving}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      {saving ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingNew(false);
                        setNewPersonName("");
                        setNewPersonGroupIds([]);
                      }}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="mb-4 flex w-full items-center gap-2.5 rounded-xl border-2 border-dashed border-border p-4 text-foreground transition-all hover:border-secondary hover:bg-accent"
                >
                  <Plus size={20} className="text-primary" />
                  <span className="text-sm font-semibold">
                    Create new contact
                  </span>
                </button>
              )}

              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : filteredPeople.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No contacts found" : "No contacts yet"}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredPeople.map((person) => (
                    <li key={person.id}>
                      <button
                        onClick={() => handleSelectPerson(person)}
                        className="w-full rounded-xl p-4 text-left text-foreground transition-all hover:bg-muted active:bg-muted"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">
                            {person.name}
                            {person.lastName ? ` ${person.lastName}` : ""}
                          </div>
                          {person.groups && person.groups.length > 0 && (
                            <div className="flex gap-1">
                              {person.groups.slice(0, 2).map((group) => (
                                <span
                                  key={group.id}
                                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                                  style={{
                                    backgroundColor: group.color
                                      ? `${group.color}20`
                                      : "#FF6B6B20",
                                    color: group.color || "#FF6B6B",
                                  }}
                                >
                                  {group.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
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
                className="mb-4 h-36 w-full resize-none rounded-xl border border-border bg-input p-4 text-base text-foreground outline-none transition-colors focus:border-secondary focus:bg-card placeholder:text-muted-foreground"
                autoFocus
              />

              {voiceError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {voiceError}
                </div>
              )}

              {listening && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border-2 border-primary bg-accent p-4">
                  <div className="relative flex h-4 w-4 items-center justify-center">
                    <div className="absolute h-4 w-4 animate-ping rounded-full bg-primary opacity-75"></div>
                    <div className="relative h-4 w-4 rounded-full bg-primary"></div>
                  </div>
                  <span className="font-semibold text-primary">
                    Listening...
                  </span>
                </div>
              )}

              {/* Reminder */}
              <div className="mb-4 rounded-xl border border-border bg-muted p-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-foreground">
                  <input
                    type="checkbox"
                    checked={setReminder}
                    onChange={(e) => setSetReminder(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-semibold">
                    Remind me about this
                  </span>
                </label>

                {setReminder && (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "In 1 week", days: 7 },
                        { label: "In 2 weeks", days: 14 },
                        { label: "In 1 month", days: 30 },
                      ].map(({ label, days }) => (
                        <button
                          key={days}
                          onClick={() => setQuickReminder(days)}
                          className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-secondary hover:bg-accent"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="datetime-local"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-secondary"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep("select")}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Back
                </button>

                <button
                  onClick={() => {
                    if (listening) stopListening();
                    else startListening();
                  }}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    listening
                      ? "border-2 border-primary bg-accent text-primary"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                  aria-label={listening ? "Stop recording" : "Start recording"}
                >
                  <Mic
                    size={16}
                    className={listening ? "animate-pulse" : ""}
                  />
                  <span className="text-sm font-medium">
                    {listening ? "Stop" : "Record"}
                  </span>
                </button>

                <button
                  onClick={handleSaveConversation}
                  disabled={
                    !content.trim() ||
                    saving ||
                    (setReminder && !reminderDate)
                  }
                  className="ml-auto rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
