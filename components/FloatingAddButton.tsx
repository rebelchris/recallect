"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import QuickAddModal from "./QuickAddModal";

export default function FloatingAddButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B6B] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
        aria-label="Quick add conversation"
      >
        <Plus size={24} />
      </button>

      <QuickAddModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
