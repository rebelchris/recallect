"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import QuickAddModal from "./QuickAddModal";

interface FloatingAddButtonProps {
  personId?: string;
}

export default function FloatingAddButton({ personId }: FloatingAddButtonProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();
  const [detectedPersonId, setDetectedPersonId] = useState<string | undefined>(personId);

  // Detect if we're on a person page and extract the person ID
  useEffect(() => {
    if (personId) {
      setDetectedPersonId(personId);
      return;
    }

    // Match pattern: /person/[id] or /person/[id]/...
    const personPageMatch = pathname.match(/^\/person\/([^\/]+)/);
    if (personPageMatch) {
      setDetectedPersonId(personPageMatch[1]);
    } else {
      setDetectedPersonId(undefined);
    }
  }, [pathname, personId]);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B6B] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
        aria-label="Quick add conversation"
      >
        <Plus size={24} />
      </button>

      <QuickAddModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedPersonId={detectedPersonId}
      />
    </>
  );
}
