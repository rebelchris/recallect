import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSessionOrMock } from "@/lib/serverAuth";

export async function GET() {
  const session = await getServerSessionOrMock();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { userId: null }, // System-wide default groups
      ],
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(groups);
}
