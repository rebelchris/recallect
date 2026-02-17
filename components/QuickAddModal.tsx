"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Plus, Mic } from "lucide-react";
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

  // Data fetching state
  const [people, setPeople] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal navigation state
  const [step, setStep] = useState<ModalStep>("select");
  const [selectedPerson, setSelectedPerson] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // New person creation state
  const [newPerson, setNewPerson] = useState<NewPersonState>(INITIAL_NEW_PERSON);

  // Conversation input state
  const [content, setContent] = useState("");
  const [type, setType] = useState<InteractionType>("other");
  const [saving, setSaving] = useState(false);

  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState("");

  // Voice recognition hook
  const handleTranscript = useCallback((transcript: string) => {
    setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
  }, []);

  const {
    isListening,
    error: voiceError,
    toggle: toggleVoice,
    stop: stopVoice,
  } = useVoiceRecognition({
    onTranscript: handleTranscript,
  });

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPeople();
      fetchGroups();
    }
  }, [isOpen]);

  // Handle preselected person
  useEffect(() => {
    if (isOpen && preselectedPersonId && people.length > 0) {
      const person = people.find((p) => p.id === preselectedPersonId);
      if (person) {
        setSelectedPerson(person);
        setStep("input");
      }
    }
  }, [isOpen, preselectedPersonId, people]);

  // Manage dialog open/close
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

  function handleSelectPerson(person: Contact) {
    setSelectedPerson(person);
    setStep("input");
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
        body: JSON.stringify({
          contactId: selectedPerson.id,
          content: content.trim(),
          type,
        }),
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

  function toggleGroupSelection(groupId: string) {
    setNewPerson((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
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
        {/* Header */}
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

        {/* Content */}
        <div className="overflow-y-auto p-5">
          {step === "select" ? (
            <SelectPersonStep
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              loading={loading}
              people={filteredPeople}
              groups={groups}
              newPerson={newPerson}
              saving={saving}
              onSelectPerson={handleSelectPerson}
              onNewPersonChange={setNewPerson}
              onToggleGroup={toggleGroupSelection}
              onCreatePerson={handleCreateNewPerson}
            />
          ) : (
            <InputConversationStep
              content={content}
              type={type}
              isListening={isListening}
              voiceError={voiceError}
              reminderEnabled={reminderEnabled}
              reminderDate={reminderDate}
              saving={saving}
              onContentChange={setContent}
              onTypeChange={setType}
              onToggleVoice={toggleVoice}
              onReminderToggle={setReminderEnabled}
              onReminderDateChange={setReminderDate}
              onBack={() => setStep("select")}
              onSave={handleSaveConversation}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}

// --- Sub-components ---

interface SelectPersonStepProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
  people: Contact[];
  groups: Group[];
  newPerson: NewPersonState;
  saving: boolean;
  onSelectPerson: (person: Contact) => void;
  onNewPersonChange: (state: NewPersonState) => void;
  onToggleGroup: (groupId: string) => void;
  onCreatePerson: () => void;
}

function SelectPersonStep({
  searchQuery,
  onSearchChange,
  loading,
  people,
  groups,
  newPerson,
  saving,
  onSelectPerson,
  onNewPersonChange,
  onToggleGroup,
  onCreatePerson,
}: SelectPersonStepProps) {
  return (
    <>
      {/* Search */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-input px-4 py-3 transition-colors focus-within:border-secondary focus-within:bg-card">
        <Search size={18} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          autoFocus
        />
      </div>

      {/* Create new contact */}
      {newPerson.isCreating ? (
        <div className="mb-4 rounded-xl border-2 border-secondary bg-accent p-4">
          <input
            type="text"
            placeholder="Enter contact's name..."
            value={newPerson.name}
            onChange={(e) =>
              onNewPersonChange({ ...newPerson, name: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreatePerson();
              if (e.key === "Escape") onNewPersonChange({ ...newPerson, isCreating: false, name: "", groupIds: [] });
            }}
            className="w-full rounded border-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => onToggleGroup(group.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  newPerson.groupIds.includes(group.id)
                    ? "text-white"
                    : "border border-border bg-card"
                }`}
                style={
                  newPerson.groupIds.includes(group.id)
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
              onClick={onCreatePerson}
              disabled={!newPerson.name.trim() || saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() =>
                onNewPersonChange({ isCreating: false, name: "", groupIds: [] })
              }
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onNewPersonChange({ ...newPerson, isCreating: true })}
          className="mb-4 flex w-full items-center gap-2.5 rounded-xl border-2 border-dashed border-border p-4 text-foreground transition-all hover:border-secondary hover:bg-accent"
        >
          <Plus size={20} className="text-primary" />
          <span className="text-sm font-semibold">Create new contact</span>
        </button>
      )}

      {/* People list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : people.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {searchQuery ? "No contacts found" : "No contacts yet"}
        </div>
      ) : (
        <ul className="space-y-2">
          {people.map((person) => (
            <li key={person.id}>
              <button
                onClick={() => onSelectPerson(person)}
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
  );
}

interface InputConversationStepProps {
  content: string;
  type: InteractionType;
  isListening: boolean;
  voiceError: string | null;
  reminderEnabled: boolean;
  reminderDate: string;
  saving: boolean;
  onContentChange: (value: string) => void;
  onTypeChange: (value: InteractionType) => void;
  onToggleVoice: () => void;
  onReminderToggle: (enabled: boolean) => void;
  onReminderDateChange: (date: string) => void;
  onBack: () => void;
  onSave: () => void;
}

function InputConversationStep({
  content,
  type,
  isListening,
  voiceError,
  reminderEnabled,
  reminderDate,
  saving,
  onContentChange,
  onTypeChange,
  onToggleVoice,
  onReminderToggle,
  onReminderDateChange,
  onBack,
  onSave,
}: InputConversationStepProps) {
  const QUICK_REMINDERS = [
    { label: "In 1 week", days: 7 },
    { label: "In 2 weeks", days: 14 },
    { label: "In 1 month", days: 30 },
  ];

  return (
    <>
      {/* Interaction Type */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Type
        </label>
        <InteractionTypeSelector value={type} onChange={onTypeChange} />
      </div>

      {/* Content textarea */}
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="What did you talk about?"
        className="mb-4 h-36 w-full resize-none rounded-xl border border-border bg-input p-4 text-base text-foreground outline-none transition-colors focus:border-secondary focus:bg-card placeholder:text-muted-foreground"
        autoFocus
      />

      {/* Voice error */}
      {voiceError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {voiceError}
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border-2 border-primary bg-accent p-4">
          <div className="relative flex h-4 w-4 items-center justify-center">
            <div className="absolute h-4 w-4 animate-ping rounded-full bg-primary opacity-75" />
            <div className="relative h-4 w-4 rounded-full bg-primary" />
          </div>
          <span className="font-semibold text-primary">Listening...</span>
        </div>
      )}

      {/* Reminder section */}
      <div className="mb-4 rounded-xl border border-border bg-muted p-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-foreground">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => onReminderToggle(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-semibold">Remind me about this</span>
        </label>

        {reminderEnabled && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_REMINDERS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => onReminderDateChange(calculateQuickReminderDate(days))}
                  className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-secondary hover:bg-accent"
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => onReminderDateChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-secondary"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Back
        </button>

        <button
          onClick={onToggleVoice}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            isListening
              ? "border-2 border-primary bg-accent text-primary"
              : "border border-border text-foreground hover:bg-muted"
          }`}
          aria-label={isListening ? "Stop recording" : "Start recording"}
        >
          <Mic size={16} className={isListening ? "animate-pulse" : ""} />
          <span className="text-sm font-medium">
            {isListening ? "Stop" : "Record"}
          </span>
        </button>

        <button
          onClick={onSave}
          disabled={!content.trim() || saving || (reminderEnabled && !reminderDate)}
          className="ml-auto rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </>
  );
}
