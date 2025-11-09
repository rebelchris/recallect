"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Conversation } from "@/types";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

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
      <li className="rounded-2xl bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-2 text-xs font-medium text-gray-500">
              {relativeTime}
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {conversation.content}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(conversation)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit conversation"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </li>

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation?"
        isDeleting={isDeleting}
      />
    </>
  );
}
