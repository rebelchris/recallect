import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppClient } from "@/lib/whatsapp";
import { importAllChats, importChatHistory } from "@/lib/whatsapp-sync";

export async function POST(req: NextRequest) {
  const client = getWhatsAppClient();
  if (!client) {
    return NextResponse.json(
      { error: "WhatsApp not connected" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { chatId, limit = 50 } = body;

  if (chatId) {
    const result = await importChatHistory(chatId, limit);
    return NextResponse.json(result);
  }

  // Import all chats
  const result = await importAllChats(limit);
  return NextResponse.json(result);
}
