"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import type { Group, Person } from "@/types";
import Link from "next/link";

export default function EditPersonPage() {
  const params = useParams();
  const id = params.id as string;
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return (
      <main className="mx-auto max-w-md p-4">
        <div className="text-center text-gray-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="mb-3 flex items-center gap-2">
        <Link href={`/person/${id}`} className="rounded-md px-2 py-1 text-sm text-[#FF6B6B]">
          ← Cancel
        </Link>
        <h1 className="text-xl font-semibold">Edit Person</h1>
      </div>
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
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </main>
  );
}
