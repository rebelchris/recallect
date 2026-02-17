import { NextResponse } from "next/server";
import { destroyTelegram } from "@/lib/telegram";

export async function POST() {
  await destroyTelegram();
  return NextResponse.json({ message: "Disconnected", status: "disconnected" });
}
