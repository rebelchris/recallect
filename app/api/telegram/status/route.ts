import { NextResponse } from "next/server";
import { getTelegramStatus } from "@/lib/telegram";

export async function GET() {
  return NextResponse.json(getTelegramStatus());
}
