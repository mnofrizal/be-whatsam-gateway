import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create admin user
  const adminEmail = "admin@whatsapp-gateway.com";
  const adminPassword = "AdminPassword123!";
  const adminName = "System Administrator";

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("✅ Admin user already exists:", adminEmail);
  } else {
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "ADMINISTRATOR",
        tier: "MAX",
        isActive: true,
      },
    });

    console.log("✅ Admin user created successfully:");
    console.log("   Email:", admin.email);
    console.log("   Name:", admin.name);
    console.log("   Role:", admin.role);
    console.log("   Tier:", admin.tier);
    console.log("   Password:", adminPassword);
  }

  // Create sample basic user for testing
  const testEmail = "test@example.com";
  const testPassword = "TestPassword123!";
  const testName = "Test User";

  const existingTest = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (existingTest) {
    console.log("✅ Test user already exists:", testEmail);
  } else {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(testPassword, saltRounds);

    const testUser = await prisma.user.create({
      data: {
        name: testName,
        email: testEmail,
        passwordHash,
        role: "USER",
        tier: "BASIC",
        isActive: true,
      },
    });

    console.log("✅ Test user created successfully:");
    console.log("   Email:", testUser.email);
    console.log("   Name:", testUser.name);
    console.log("   Role:", testUser.role);
    console.log("   Tier:", testUser.tier);
    console.log("   Password:", testPassword);
  }

  console.log("🎉 Database seeding completed successfully!");
  console.log("");
  console.log("📋 Summary:");
  console.log("   Admin Email:", adminEmail);
  console.log("   Admin Password:", adminPassword);
  console.log("   Test Email:", testEmail);
  console.log("   Test Password:", testPassword);
  console.log("");
  console.log(
    "🚀 You can now start the server and test with these credentials!"
  );
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
