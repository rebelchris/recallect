import { NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { contacts, contactsToGroups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getContact } from "@/lib/queries/contacts";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const contact = await getContact(id);
  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(contact);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const {
    name,
    lastName,
    nickname,
    email,
    phone,
    company,
    jobTitle,
    photoUrl,
    notes,
    contactFrequency,
    socialLinks,
    groupIds,
  } = body;

  const existing = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(contacts)
    .set({
      ...(name !== undefined && { name }),
      ...(lastName !== undefined && { lastName: lastName || null }),
      ...(nickname !== undefined && { nickname: nickname || null }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(company !== undefined && { company: company || null }),
      ...(jobTitle !== undefined && { jobTitle: jobTitle || null }),
      ...(photoUrl !== undefined && { photoUrl: photoUrl || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(contactFrequency !== undefined && {
        contactFrequency: contactFrequency || null,
      }),
      ...(socialLinks !== undefined && { socialLinks: socialLinks || null }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contacts.id, id))
    .returning();

  // Handle group reassignment
  if (groupIds !== undefined && Array.isArray(groupIds)) {
    await db
      .delete(contactsToGroups)
      .where(eq(contactsToGroups.contactId, id));

    if (groupIds.length > 0) {
      await db.insert(contactsToGroups).values(
        groupIds.map((groupId: string) => ({
          contactId: id,
          groupId,
        }))
      );
    }
  }

  const result = await getContact(id);
  return NextResponse.json(result);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(contacts).where(eq(contacts.id, id));
  return NextResponse.json({ success: true });
}
