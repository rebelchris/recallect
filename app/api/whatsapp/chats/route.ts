import { NextResponse } from "next/server";
import { getWhatsAppClient } from "@/lib/whatsapp";
import { matchContact } from "@/lib/whatsapp-sync";

export async function GET() {
  const client = getWhatsAppClient();
  if (!client) {
    return NextResponse.json(
      { error: "WhatsApp not connected" },
      { status: 400 }
    );
  }

  const chats = await client.getChats();

  const result = await Promise.all(
    chats
      .filter((chat) => !chat.isGroup)
      .slice(0, 50)
      .map(async (chat) => {
        const contact = await matchContact(chat.id._serialized);
        return {
          id: chat.id._serialized,
          name: chat.name,
          lastMessage: chat.lastMessage?.body?.slice(0, 100) || null,
          timestamp: chat.lastMessage?.timestamp
            ? new Date(chat.lastMessage.timestamp * 1000).toISOString()
            : null,
          matchedContact: contact,
        };
      })
  );

  return NextResponse.json(result);
}
