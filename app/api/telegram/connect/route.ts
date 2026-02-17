import { NextResponse } from "next/server";
import { initTelegram, getTelegramStatus } from "@/lib/telegram";

export async function POST() {
  const current = getTelegramStatus();
  if (current.status === "connected") {
    return NextResponse.json({ message: "Already connected", ...current });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not set in .env.local" },
      { status: 400 }
    );
  }

  try {
    await initTelegram(token);
    return NextResponse.json({
      message: "Connected",
      ...getTelegramStatus(),
    });
  } catch (err) {
    console.error("Telegram connect error:", err);
    return NextResponse.json(
      { error: "Failed to connect. Check your bot token." },
      { status: 500 }
    );
  }
}
