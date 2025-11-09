"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Plus, Mic } from "lucide-react";
import type { Person } from "@/types";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPersonId?: string;
}

export default function QuickAddModal({ isOpen, onClose, preselectedPersonId }: QuickAddModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // People & search
  const [people, setPeople] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Two-step flow
  const [step, setStep] = useState<"select" | "input">("select");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // New person creation
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");

  // Conversation input
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Reminder
  const [setReminder, setSetReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  // Voice recording
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Fetch people when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPeople();
    }
  }, [isOpen]);

  // Auto-select person if preselectedPersonId is provided
  useEffect(() => {
    if (isOpen && preselectedPersonId && people.length > 0) {
      const person = people.find((p) => p.id === preselectedPersonId);
      if (person) {
        setSelectedPerson(person);
        setStep("input");
      }
    }
  }, [isOpen, preselectedPersonId, people]);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  async function fetchPeople() {
    setLoading(true);
    try {
      const res = await fetch("/api/people");
      if (res.ok) {
        const data = await res.json();
        setPeople(data);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    // Reset all state
    setStep("select");
    setSelectedPerson(null);
    setIsCreatingNew(false);
    setNewPersonName("");
    setContent("");
    setSearchQuery("");
    setSetReminder(false);
    setReminderDate("");
    stopListening();
    onClose();
  }

  function setQuickReminder(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setReminderDate(date.toISOString().slice(0, 16));
  }

  function handleSelectPerson(person: Person) {
    setSelectedPerson(person);
    setStep("input");
  }

  async function handleCreateNewPerson() {
    if (!newPersonName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPersonName.trim() }),
      });

      if (res.ok) {
        const newPerson = await res.json();
        setSelectedPerson(newPerson);
        setIsCreatingNew(false);
        setNewPersonName("");
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
      // Create the conversation
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: selectedPerson.id,
          content: content.trim()
        }),
      });

      if (res.ok) {
        const conversation = await res.json();

        // Create the reminder if enabled
        if (setReminder && reminderDate && conversation.id) {
          await fetch("/api/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: conversation.id,
              personId: selectedPerson.id,
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

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

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      style={{ width: "min(90vw, 400px)", maxHeight: "80vh", margin: 0 }}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">
            {step === "select" ? "Quick Add" : selectedPerson?.name}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4">
          {step === "select" ? (
            <>
              {/* Search bar */}
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none"
                  autoFocus
                />
              </div>

              {/* Create new person inline */}
              {isCreatingNew ? (
                <div className="mb-3 rounded-lg border-2 border-[#FF8C42] bg-orange-50 p-3">
                  <input
                    type="text"
                    placeholder="Enter person's name..."
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateNewPerson();
                      if (e.key === "Escape") {
                        setIsCreatingNew(false);
                        setNewPersonName("");
                      }
                    }}
                    className="w-full rounded border-none bg-transparent outline-none"
                    autoFocus
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleCreateNewPerson}
                      disabled={!newPersonName.trim() || saving}
                      className="rounded-md bg-[#FF6B6B] px-3 py-1 text-sm text-white disabled:opacity-60"
                    >
                      {saving ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingNew(false);
                        setNewPersonName("");
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="mb-3 flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-3 hover:border-[#FF8C42] hover:bg-orange-50"
                >
                  <Plus size={18} className="text-[#FF6B6B]" />
                  <span className="text-sm font-medium">Create new person</span>
                </button>
              )}

              {/* People list */}
              {loading ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : filteredPeople.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  {searchQuery ? "No people found" : "No people yet"}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredPeople.map((person) => (
                    <li key={person.id}>
                      <button
                        onClick={() => handleSelectPerson(person)}
                        className="w-full rounded-lg p-3 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{person.name}</div>
                          {person.group && (
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: person.group.color
                                  ? `${person.group.color}20`
                                  : "#FF6B6B20",
                                color: person.group.color || "#FF6B6B",
                              }}
                            >
                              {person.group.name}
                            </span>
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
              {/* Conversation input */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What did you talk about?"
                className="mb-3 h-40 w-full resize-none rounded-lg border border-gray-200 p-3 outline-none focus:border-[#FF8C42]"
                autoFocus
              />

              {/* Reminder Section */}
              <div className="mb-3 rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setReminder}
                    onChange={(e) => setSetReminder(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#FF6B6B] focus:ring-[#FF6B6B]"
                  />
                  <span className="font-medium text-sm">Remind me about this</span>
                </label>

                {setReminder && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setQuickReminder(7)}
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                      >
                        In 1 week
                      </button>
                      <button
                        onClick={() => setQuickReminder(14)}
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                      >
                        In 2 weeks
                      </button>
                      <button
                        onClick={() => setQuickReminder(21)}
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                      >
                        In 3 weeks
                      </button>
                      <button
                        onClick={() => setQuickReminder(30)}
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                      >
                        In 1 month
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Or pick a specific date:</label>
                      <input
                        type="datetime-local"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF8C42]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep("select")}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  Back
                </button>

                {!listening ? (
                  <button
                    onClick={startListening}
                    className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2"
                  >
                    <Mic size={16} />
                    <span className="text-sm">Voice</span>
                  </button>
                ) : (
                  <button
                    onClick={stopListening}
                    className="flex items-center gap-2 rounded-md border border-[#FF6B6B] bg-red-50 px-3 py-2 text-[#FF6B6B]"
                  >
                    <Mic size={16} />
                    <span className="text-sm">Stop</span>
                  </button>
                )}

                <button
                  onClick={handleSaveConversation}
                  disabled={!content.trim() || saving || (setReminder && !reminderDate)}
                  className="ml-auto rounded-md bg-[#FF6B6B] px-4 py-2 text-white disabled:opacity-60"
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
