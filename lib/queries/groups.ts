import { db } from "@/db/drizzle";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getGroups() {
  const result = await db.query.groups.findMany({
    with: {
      contactsToGroups: true,
    },
    orderBy: [groups.name],
  });

  return result.map((g) => ({
    ...g,
    contactCount: g.contactsToGroups.length,
  }));
}

export async function getGroup(id: string) {
  return db.query.groups.findFirst({
    where: eq(groups.id, id),
  });
}
