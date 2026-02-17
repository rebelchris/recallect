"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Plus, Mic, ChevronLeft, Bell } from "lucide-react";
import { calculateQuickReminderDate } from "@/lib/conversationHelpers";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import InteractionTypeSelector from "./InteractionTypeSelector";
import type { Contact, Group } from "@/types";
import type { InteractionType } from "@/lib/constants";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPersonId?: string;
}

type ModalStep = "select" | "input";

interface NewPersonState {
  isCreating: boolean;
  name: string;
  groupIds: string[];
}

const INITIAL_NEW_PERSON: NewPersonState = {
  isCreating: false,
  name: "",
  groupIds: [],
};

export default function QuickAddModal({
  isOpen,
  onClose,
  preselectedPersonId,
}: QuickAddModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [people, setPeople] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ModalStep>("select");
  const [selectedPerson, setSelectedPerson] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPerson, setNewPerson] = useState<NewPersonState>(INITIAL_NEW_PERSON);
  const [content, setContent] = useState("");
  const [type, setType] = useState<InteractionType>("other");
  const [saving, setSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  const handleTranscript = useCallback((transcript: string) => {
    setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
  }, []);

  const { isListening, error: voiceError, toggle: toggleVoice, stop: stopVoice } = 
    useVoiceRecognition({ onTranscript: handleTranscript });

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

  function resetModal() {
    setStep("select");
    setSelectedPerson(null);
    setNewPerson(INITIAL_NEW_PERSON);
    setContent("");
    setType("other");
    setSearchQuery("");
    setReminderEnabled(false);
    setReminderDate("");
    stopVoice();
  }

  function handleClose() {
    resetModal();
    onClose();
  }

  async function handleCreateNewPerson() {
    if (!newPerson.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPerson.name.trim(),
          groupIds: newPerson.groupIds.length > 0 ? newPerson.groupIds : undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSelectedPerson(created);
        setNewPerson(INITIAL_NEW_PERSON);
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
        body: JSON.stringify({ contactId: selectedPerson.id, content: content.trim(), type }),
      });
      if (res.ok) {
        const conversation = await res.json();
        if (reminderEnabled && reminderDate && conversation.id) {
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

  const filteredPeople = people.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed inset-0 m-0 h-full max-h-full w-full max-w-full bg-background p-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-border sm:shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col sm:h-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          {step === "input" ? (
            <button
              onClick={() => setStep("select")}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          ) : (
            <h2 className="text-lg font-semibold">New interaction</h2>
          )}
          {step === "input" && (
            <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold">
              {selectedPerson?.name}
            </h2>
          )}
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {step === "select" ? (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground/60 focus:border-foreground/20 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Create new */}
              {newPerson.isCreating ? (
                <div className="mb-4 rounded-xl border border-border bg-muted/50 p-4">
                  <input
                    type="text"
                    placeholder="Name..."
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateNewPerson();
                      if (e.key === "Escape") setNewPerson(INITIAL_NEW_PERSON);
                    }}
                    className="w-full bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
                    autoFocus
                  />
                  {groups.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setNewPerson((prev) => ({
                            ...prev,
                            groupIds: prev.groupIds.includes(group.id)
                              ? prev.groupIds.filter((id) => id !== group.id)
                              : [...prev.groupIds, group.id],
                          }))}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            newPerson.groupIds.includes(group.id) ? "text-white" : "bg-background"
                          }`}
                          style={
                            newPerson.groupIds.includes(group.id)
                              ? { backgroundColor: group.color || "#64748b" }
                              : undefined
                          }
                        >
                          {group.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleCreateNewPerson}
                      disabled={!newPerson.name.trim() || saving}
                      className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
                    >
                      {saving ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => setNewPerson(INITIAL_NEW_PERSON)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setNewPerson({ ...newPerson, isCreating: true })}
                  className="mb-4 flex w-full items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                >
                  <Plus size={18} />
                  New contact
                </button>
              )}

              {/* People list */}
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
              ) : filteredPeople.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No results" : "No contacts yet"}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPeople.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => {
                        setSelectedPerson(person);
                        setStep("input");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <span className="font-medium">
                        {person.name}
                        {person.lastName ? ` ${person.lastName}` : ""}
                      </span>
                      {person.groups && person.groups.length > 0 && (
                        <div className="flex gap-1">
                          {person.groups.slice(0, 2).map((g) => (
                            <span
                              key={g.id}
                              className="rounded-md px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${g.color || "#64748b"}15`,
                                color: g.color || "#64748b",
                              }}
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Type selector */}
              <div className="mb-5">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Type
                </label>
                <InteractionTypeSelector value={type} onChange={setType} />
              </div>

              {/* Content */}
              <div className="mb-5">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notes
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What did you talk about?"
                  className="h-32 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground/60 focus:border-foreground/20 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Voice */}
              {voiceError && (
                <p className="mb-4 text-sm text-danger">{voiceError}</p>
              )}
              {isListening && (
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
                  </span>
                  Listening...
                </div>
              )}

              {/* Reminder */}
              <div className="mb-5 rounded-lg border border-border p-4">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Bell size={14} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Set reminder</span>
                </label>
                {reminderEnabled && (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "1 week", days: 7 },
                        { label: "2 weeks", days: 14 },
                        { label: "1 month", days: 30 },
                      ].map(({ label, days }) => (
                        <button
                          key={days}
                          onClick={() => setReminderDate(calculateQuickReminderDate(days))}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="datetime-local"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-foreground/20 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleVoice}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    isListening
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Mic size={16} className={isListening ? "animate-pulse" : ""} />
                  {isListening ? "Stop" : "Record"}
                </button>
                <button
                  onClick={handleSaveConversation}
                  disabled={!content.trim() || saving || (reminderEnabled && !reminderDate)}
                  className="ml-auto rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
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
