"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Group } from "@/types";

export default function AddPersonPage() {
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch("/api/groups");
        const data = await res.json();
        setGroups(data);
      } finally {
        setLoading(false);
      }
    }
    fetchGroups();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          photoUrl: photoUrl || undefined,
          groupId: groupId || undefined
        }),
      });

      if (!response.ok) {
        console.error("Failed to create person");
        return;
      }

      router.replace("/");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-3 text-xl font-semibold">Add Person</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-200 p-3 outline-none focus:border-[#FF8C42]"
        />
        <input
          placeholder="Photo URL (optional)"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          className="w-full rounded-md border border-gray-200 p-3 outline-none focus:border-[#FF8C42]"
        />
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="w-full rounded-md border border-gray-200 p-3 outline-none focus:border-[#FF8C42]"
          disabled={loading}
        >
          <option value="">No group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!name || saving}
          className="w-full rounded-md bg-[#FF6B6B] p-3 font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Create"}
        </button>
      </form>
    </main>
  );
}


