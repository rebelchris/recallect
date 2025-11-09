import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default groups...");

  const defaultGroups = [
    { name: "Family", color: "#4CAF50" },
    { name: "Friends", color: "#2196F3" },
    { name: "Work", color: "#FF9800" },
    { name: "Other", color: "#9E9E9E" },
  ];

  for (const group of defaultGroups) {
    await prisma.group.upsert({
      where: { name: group.name },
      update: {},
      create: {
        name: group.name,
        color: group.color,
        userId: null, // System-wide default groups
      },
    });
  }

  console.log("Default groups seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
