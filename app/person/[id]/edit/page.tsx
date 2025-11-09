"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import type { Group, Person } from "@/types";
import Link from "next/link";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { Trash2 } from "lucide-react";

export default function EditPersonPage() {
  const params = useParams();
  const id = params.id as string;
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [groupsRes, personRes] = await Promise.all([
          fetch("/api/groups"),
          fetch(`/api/people/${id}`),
        ]);

        if (!personRes.ok) {
          router.push("/");
          return;
        }

        const groupsData = await groupsRes.json();
        const personData: Person = await personRes.json();

        setGroups(groupsData);
        setName(personData.name);
        setPhotoUrl(personData.photoUrl || "");
        setGroupId(personData.groupId || "");
      } catch (error) {
        console.error("Failed to fetch data:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          photoUrl: photoUrl || undefined,
          groupId: groupId || null,
        }),
      });

      if (res.ok) {
        router.push(`/person/${id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/people/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to delete person:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-md p-6">
        <div className="py-12 text-center text-gray-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/person/${id}`} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#FF6B6B] transition-colors hover:bg-red-50">
          ← Cancel
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Person</h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-base outline-none transition-colors focus:border-[#FF8C42] focus:bg-white focus:shadow-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Photo URL (optional)</label>
          <input
            placeholder="https://example.com/photo.jpg"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-base outline-none transition-colors focus:border-[#FF8C42] focus:bg-white focus:shadow-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Group</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-base outline-none transition-colors focus:border-[#FF8C42] focus:bg-white focus:shadow-sm"
          >
            <option value="">No group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!name || saving}
          className="w-full rounded-xl bg-[#FF6B6B] p-3.5 font-semibold text-white shadow-sm transition-all hover:bg-[#FF5555] hover:shadow disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Delete Person Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Deleting this person will also delete all conversations and reminders
          associated with them.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete Person
        </button>
      </div>

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Person"
        message="Are you sure you want to delete this person? This will also delete all conversations and reminders associated with them."
        itemName={name}
        isDeleting={isDeleting}
      />
    </main>
  );
}
