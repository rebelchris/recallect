import { NextResponse } from "next/server";
import { initWhatsApp, getWhatsAppStatus } from "@/lib/whatsapp";

export async function POST() {
  const current = getWhatsAppStatus();
  if (current.status === "ready") {
    return NextResponse.json({ message: "Already connected" });
  }

  // Initialize in background (don't await — it takes time for QR/auth)
  initWhatsApp().catch((err) => {
    console.error("WhatsApp init error:", err);
  });

  return NextResponse.json({ message: "Connecting..." });
}
