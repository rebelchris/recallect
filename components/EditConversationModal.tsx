"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Conversation } from "@/types";

interface EditConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onUpdate: () => void;
}

export default function EditConversationModal({
  isOpen,
  onClose,
  conversation,
  onUpdate,
}: EditConversationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [content, setContent] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (conversation) {
      setContent(conversation.content);
      // Format date for datetime-local input
      const date = new Date(conversation.timestamp);
      const formatted = date.toISOString().slice(0, 16);
      setTimestamp(formatted);
    }
  }, [conversation]);

  useEffect(() => {
    if (isOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!conversation || !content.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          timestamp: new Date(timestamp).toISOString(),
        }),
      });

      if (res.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Failed to update conversation:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="rounded-xl p-0 backdrop:bg-black/50 w-full max-w-md m-auto"
    >
      <div className="bg-card rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">
            Edit Conversation
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Conversation
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-border bg-input text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none placeholder:text-muted-foreground"
              placeholder="What did you talk about?"
              disabled={isSaving}
            />
          </div>

          <div>
            <label
              htmlFor="timestamp"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Date & Time
            </label>
            <input
              type="datetime-local"
              id="timestamp"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-input text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-border bg-muted rounded-b-xl">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className="flex-1 px-4 py-2.5 text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
