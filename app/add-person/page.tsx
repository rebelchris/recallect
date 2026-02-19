"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { Group } from "@/types";
import { CONTACT_FREQUENCIES, IMPORTANT_DATE_LABELS, type ImportantDateLabel } from "@/lib/constants";

export default function AddPersonPage() {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [contactFrequency, setContactFrequency] = useState<string>("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);

  // Social links
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");

  // Important dates
  const [importantDates, setImportantDates] = useState<
    { label: ImportantDateLabel; date: string; year: string }[]
  >([]);

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

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }

  function addImportantDate() {
    setImportantDates((prev) => [
      ...prev,
      { label: "birthday", date: "", year: "" },
    ]);
  }

  function removeImportantDate(index: number) {
    setImportantDates((prev) => prev.filter((_, i) => i !== index));
  }

  function updateImportantDate(
    index: number,
    field: string,
    value: string
  ) {
    setImportantDates((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const socialLinks: Record<string, string> = {};
      if (twitter) socialLinks.twitter = twitter;
      if (linkedin) socialLinks.linkedin = linkedin;
      if (instagram) socialLinks.instagram = instagram;

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          lastName: lastName || undefined,
          nickname: nickname || undefined,
          email: email || undefined,
          phone: phone || undefined,
          company: company || undefined,
          jobTitle: jobTitle || undefined,
          photoUrl: photoUrl || undefined,
          notes: notes || undefined,
          contactFrequency: contactFrequency || undefined,
          socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
          groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
        }),
      });

      if (!response.ok) {
        console.error("Failed to create contact");
        return;
      }

      const contact = await response.json();

      // Create important dates
      for (const d of importantDates) {
        if (d.date) {
          await fetch("/api/important-dates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contactId: contact.id,
              label: d.label,
              date: d.date,
              year: d.year ? parseInt(d.year) : null,
              recurring: true,
            }),
          });
        }
      }

      router.replace("/");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input p-3.5 text-base text-foreground outline-none transition-colors focus:border-secondary focus:bg-card focus:shadow-sm placeholder:text-muted-foreground";

  return (
    <main className="mx-auto max-w-md p-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
        >
          ← Cancel
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Add Contact</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              First Name *
            </label>
            <input
              required
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Last Name
            </label>
            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Contact info */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Email
          </label>
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Phone
          </label>
          <input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Groups (multi-select) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Groups
          </label>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  selectedGroupIds.includes(group.id)
                    ? "text-white shadow-sm"
                    : "bg-card border border-border hover:bg-muted"
                }`}
                style={
                  selectedGroupIds.includes(group.id)
                    ? { backgroundColor: group.color || "#FF6B6B" }
                    : undefined
                }
              >
                {group.name}
              </button>
            ))}
            {groups.length === 0 && !loading && (
              <span className="text-sm text-muted-foreground">
                No groups yet
              </span>
            )}
          </div>
        </div>

        {/* Contact frequency */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Reach Out Frequency
          </label>
          <select
            value={contactFrequency}
            onChange={(e) => setContactFrequency(e.target.value)}
            className={inputClass}
          >
            <option value="">No goal set</option>
            {Object.entries(CONTACT_FREQUENCIES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>

        {/* Important dates */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Important Dates
          </label>
          <div className="space-y-3">
            {importantDates.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-border bg-muted p-3"
              >
                <select
                  value={d.label}
                  onChange={(e) =>
                    updateImportantDate(i, "label", e.target.value)
                  }
                  className="rounded-lg border border-border bg-card p-2 text-sm text-foreground"
                >
                  {Object.entries(IMPORTANT_DATE_LABELS).map(
                    ([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
                <input
                  type="date"
                  value={d.date}
                  onChange={(e) =>
                    updateImportantDate(i, "date", e.target.value)
                  }
                  className="flex-1 rounded-lg border border-border bg-card p-2 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => removeImportantDate(i)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addImportantDate}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:border-secondary hover:text-foreground"
            >
              <Plus size={14} />
              Add date
            </button>
          </div>
        </div>

        {/* More fields toggle */}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
        >
          {showMore ? (
            <>
              <ChevronUp size={16} />
              Less fields
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              More fields
            </>
          )}
        </button>

        {showMore && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Nickname
              </label>
              <input
                placeholder="Nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Company
                </label>
                <input
                  placeholder="Company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Job Title
                </label>
                <input
                  placeholder="Job title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Photo URL
              </label>
              <input
                placeholder="https://example.com/photo.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Notes
              </label>
              <textarea
                placeholder="Personal notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Social Links */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Social Links
              </label>
              <div className="space-y-2">
                <input
                  placeholder="Twitter/X handle"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="LinkedIn URL"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className={inputClass}
                />
                <input
                  placeholder="Instagram handle"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={!name || saving}
          className="w-full rounded-xl bg-primary p-3.5 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Contact"}
        </button>
      </form>
    </main>
  );
}
