import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Prisma 7 requires a driver adapter even in CLI/seed context.
// DATABASE_URL is loaded from .env.local via prisma.config.ts (which uses @next/env).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

const CONDEMNED_SECTION = "Condemned / Pending Disposal";

const INITIAL_SECTIONS: Record<string, string[]> = {
  "PAC & Ground": [
    "HALL", "D1-05 PAC Lobby", "D1-01 Dance Studio", "D1-02 PAL Room 1",
    "D1-02 PAL Room 2", "E1-01 Music Room 1", "E1-02 Band Room",
    "E1-03 Music Room 2", "Conference Room", "B2-06 Teaching Lab", "ITLR",
    "Learning Room 1", "Learning Lab 1", "Learning Lab 2", "Learning Lab 3",
    "LSP", "LSM", "Art Room 1", "Art Room 2", "Science Lab 1", "Science Lab 2", "Spare",
  ],
  "Floor 2": ["F2-01", "F2-02", "F2-03", "G2-01", "G2-02", "G2-03"],
  "Floor 3": [
    "E3-02 SBB Room 1", "E3-03 SBB Room 2", "E3-04 Math Room",
    "F3-01", "F3-02", "G3-01", "G3-02", "G3-03", "G3-04", "G3-05", "G3-06",
  ],
  "Floor 4": ["E4-01", "E4-02", "E4-03", "F4-01", "F4-02", "F4-03", "G4-01", "G4-02", "G4-03"],
  "Floor 5": ["E5-01", "E5-02", "E5-03", "F5-01", "F5-02", "F5-03", "G5-01", "G5-02", "G5-03"],
  "Floor 6": ["E6-01", "E6-02", "E6-03", "F6-01", "F6-02", "F6-03"],
  "Floor 7": ["E7-01", "E7-02", "E7-03", "F7-01", "F7-02", "F7-03"],
  iPad: ["Cart 1", "Cart 2", "Cart 3", "Cart 4", "Cart 5", "6th Floor", "7th Floor", "iPad Cart PE"],
  Others: ["ITLR", "A2-03 STAFF RESOURCE", "Lab Store", "Jeff (Custody)"],
  [CONDEMNED_SECTION]: [CONDEMNED_SECTION],
};

async function main() {
  console.log("Seeding database...");

  const superAdminHash = await bcrypt.hash("admin123", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@investorymap.sg" },
    update: {},
    create: {
      email: "admin@investorymap.sg",
      passwordHash: superAdminHash,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`Super admin: ${superAdmin.email}`);

  const school = await prisma.school.upsert({
    where: { code: "DMPS" },
    update: {},
    create: {
      name: "Damai Primary School",
      code: "DMPS",
      address: "1 Bedok South Ave 3, Singapore 469270",
    },
  });
  console.log(`School: ${school.name} (${school.id})`);

  const schoolAdminHash = await bcrypt.hash("ict123", 12);
  await prisma.user.upsert({
    where: { email: "ict@dmps.edu.sg" },
    update: {},
    create: {
      email: "ict@dmps.edu.sg",
      passwordHash: schoolAdminHash,
      name: "ICT Manager",
      role: Role.SCHOOL_ADMIN,
      schoolId: school.id,
    },
  });

  const teacherHash = await bcrypt.hash("teacher123", 12);
  await prisma.user.upsert({
    where: { email: "teacher@dmps.edu.sg" },
    update: {},
    create: {
      email: "teacher@dmps.edu.sg",
      passwordHash: teacherHash,
      name: "Teacher User",
      role: Role.USER,
      schoolId: school.id,
    },
  });

  let sectionOrder = 0;
  for (const [sectionName, rooms] of Object.entries(INITIAL_SECTIONS)) {
    const section = await prisma.section.upsert({
      where: { schoolId_name: { schoolId: school.id, name: sectionName } },
      update: {},
      create: {
        schoolId: school.id,
        name: sectionName,
        sortOrder: sectionOrder++,
        isProtected: sectionName === CONDEMNED_SECTION,
      },
    });

    for (let i = 0; i < rooms.length; i++) {
      await prisma.room.upsert({
        where: { sectionId_name: { sectionId: section.id, name: rooms[i] } },
        update: {},
        create: {
          sectionId: section.id,
          name: rooms[i],
          sortOrder: i,
        },
      });
    }
  }

  console.log(`Created ${Object.keys(INITIAL_SECTIONS).length} sections`);

  const existingItems = await prisma.item.count({ where: { schoolId: school.id } });
  if (existingItems > 0) {
    console.log(`${existingItems} items already exist — skipping item seed`);
  } else {
    console.log("Import items via CSV or add them through the UI");
  }

  console.log("\n--- Seed complete ---");
  console.log("Login credentials:");
  console.log("  Super Admin: admin@investorymap.sg / admin123");
  console.log("  School Admin: ict@dmps.edu.sg / ict123");
  console.log("  Teacher: teacher@dmps.edu.sg / teacher123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
