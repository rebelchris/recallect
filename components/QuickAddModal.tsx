"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Plus, Mic } from "lucide-react";
import { calculateQuickReminderDate } from "@/lib/conversationHelpers";
import type { Person, Group } from "@/types";

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

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);

  // Two-step flow
  const [step, setStep] = useState<"select" | "input">("select");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // New person creation
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonGroupId, setNewPersonGroupId] = useState<string>("");

  // Conversation input
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Reminder
  const [setReminder, setSetReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  // Voice recording
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldStopRef = useRef(false);

  // Fetch people and groups when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPeople();
      fetchGroups();
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

  async function fetchGroups() {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }

  function handleClose() {
    // Reset all state
    setStep("select");
    setSelectedPerson(null);
    setIsCreatingNew(false);
    setNewPersonName("");
    setNewPersonGroupId("");
    setContent("");
    setSearchQuery("");
    setSetReminder(false);
    setReminderDate("");
    stopListening();
    onClose();
  }

  function setQuickReminder(days: number) {
    setReminderDate(calculateQuickReminderDate(days));
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
        body: JSON.stringify({
          name: newPersonName.trim(),
          groupId: newPersonGroupId || undefined
        }),
      });

      if (res.ok) {
        const newPerson = await res.json();
        setSelectedPerson(newPerson);
        setIsCreatingNew(false);
        setNewPersonName("");
        setNewPersonGroupId("");
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
    const SpeechRecognitionAPI = (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition || (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    shouldStopRef.current = false;
    const recognition = new SpeechRecognitionAPI();
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

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
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

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      style={{ width: "min(90vw, 420px)", maxHeight: "85vh", margin: 0 }}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-xl font-bold tracking-tight">
            {step === "select" ? "Quick Add" : selectedPerson?.name}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 transition-colors hover:bg-gray-100 active:bg-gray-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5">
          {step === "select" ? (
            <>
              {/* Search bar */}
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 transition-colors focus-within:border-[#FF8C42] focus-within:bg-white">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
                  autoFocus
                />
              </div>

              {/* Create new person inline */}
              {isCreatingNew ? (
                <div className="mb-4 rounded-xl border-2 border-[#FF8C42] bg-orange-50 p-4">
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
                        setNewPersonGroupId("");
                      }
                    }}
                    className="w-full rounded border-none bg-transparent text-base outline-none placeholder:text-gray-500"
                    autoFocus
                  />
                  <select
                    value={newPersonGroupId}
                    onChange={(e) => setNewPersonGroupId(e.target.value)}
                    className="mt-3 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none focus:border-[#FF8C42]"
                  >
                    <option value="">No group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleCreateNewPerson}
                      disabled={!newPersonName.trim() || saving}
                      className="rounded-lg bg-[#FF6B6B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#FF5555] disabled:opacity-60"
                    >
                      {saving ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingNew(false);
                        setNewPersonName("");
                        setNewPersonGroupId("");
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="mb-4 flex w-full items-center gap-2.5 rounded-xl border-2 border-dashed border-gray-300 p-4 transition-all hover:border-[#FF8C42] hover:bg-orange-50/50"
                >
                  <Plus size={20} className="text-[#FF6B6B]" />
                  <span className="text-sm font-semibold text-gray-700">Create new person</span>
                </button>
              )}

              {/* People list */}
              {loading ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : filteredPeople.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  {searchQuery ? "No people found" : "No people yet"}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filteredPeople.map((person) => (
                    <li key={person.id}>
                      <button
                        onClick={() => handleSelectPerson(person)}
                        className="w-full rounded-xl p-4 text-left transition-all hover:bg-gray-50 active:bg-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-900">{person.name}</div>
                          {person.group && (
                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-medium"
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
                className="mb-4 h-44 w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-base outline-none transition-colors focus:border-[#FF8C42] focus:bg-white"
                autoFocus
              />

              {/* Reminder Section */}
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/30 p-4">
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
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#FF8C42]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep("select")}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                >
                  Back
                </button>

                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    startListening();
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    stopListening();
                  }}
                  onPointerCancel={(e) => {
                    e.preventDefault();
                    stopListening();
                  }}
                  onPointerLeave={(e) => {
                    if (listening) {
                      e.preventDefault();
                      stopListening();
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all select-none touch-none ${
                    listening
                      ? "border-2 border-[#FF6B6B] bg-red-50 text-[#FF6B6B] scale-95"
                      : "border border-gray-200 hover:bg-gray-50"
                  }`}
                  aria-label="Press and hold to record voice"
                  title="Press and hold to record voice"
                >
                  <Mic size={16} className={listening ? "animate-pulse" : ""} />
                  <span className="text-sm font-medium">
                    {listening ? "Recording..." : "Hold to speak"}
                  </span>
                </button>

                <button
                  onClick={handleSaveConversation}
                  disabled={!content.trim() || saving || (setReminder && !reminderDate)}
                  className="ml-auto rounded-lg bg-[#FF6B6B] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#FF5555] disabled:opacity-60"
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
