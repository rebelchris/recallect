"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Conversation } from "@/types";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import InteractionTypeIcon from "./InteractionTypeIcon";

interface ConversationItemProps {
  conversation: Conversation;
  onUpdate: () => void;
  onEdit: (conversation: Conversation) => void;
  relativeTime: string;
}

export default function ConversationItem({
  conversation,
  onUpdate,
  onEdit,
  relativeTime,
}: ConversationItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowDeleteDialog(false);
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <li className="group rounded-2xl bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <InteractionTypeIcon
                type={conversation.type || "other"}
                size={14}
                showLabel
                className="text-muted-foreground"
              />
              <span>•</span>
              <span>{relativeTime}</span>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {conversation.content}
            </div>
          </div>
          <div className="flex gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              onClick={() => onEdit(conversation)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600"
              title="Edit conversation"
              aria-label="Edit conversation"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete conversation"
              aria-label="Delete conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </li>

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Interaction"
        message="Are you sure you want to delete this interaction?"
        isDeleting={isDeleting}
      />
    </>
  );
}
