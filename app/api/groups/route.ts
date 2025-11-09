import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
