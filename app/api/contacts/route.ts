import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { contacts, contactsToGroups } from "@/db/schema";
import { getContacts } from "@/lib/queries/contacts";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const result = await getContacts({ groupId, search });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, lastName, nickname, email, phone, company, jobTitle, photoUrl, notes, contactFrequency, socialLinks, groupIds } = body;

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      name,
      lastName: lastName || null,
      nickname: nickname || null,
      email: email || null,
      phone: phone || null,
      company: company || null,
      jobTitle: jobTitle || null,
      photoUrl: photoUrl || null,
      notes: notes || null,
      contactFrequency: contactFrequency || null,
      socialLinks: socialLinks || null,
    })
    .returning();

  // Handle group assignments
  if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
    await db.insert(contactsToGroups).values(
      groupIds.map((groupId: string) => ({
        contactId: contact.id,
        groupId,
      }))
    );
  }

  return NextResponse.json(contact);
}
