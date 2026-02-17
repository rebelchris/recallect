import { NextResponse } from "next/server";
import { destroyWhatsApp } from "@/lib/whatsapp";

export async function POST() {
  await destroyWhatsApp();
  return NextResponse.json({ message: "Disconnected" });
}
