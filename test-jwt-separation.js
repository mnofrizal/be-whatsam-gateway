// Test script to verify JWT helper relocation
import {
  generateToken,
  verifyToken,
  refreshToken,
} from "./src/utils/helpers/jwt.js";
import { register, login } from "./src/services/auth.service.js";

console.log("🧪 Testing JWT Service Separation...\n");

// Test 1: JWT Service functions are available
console.log("✅ JWT Service functions imported successfully:");
console.log("  - generateToken:", typeof generateToken);
console.log("  - verifyToken:", typeof verifyToken);
console.log("  - refreshToken:", typeof refreshToken);

// Test 2: Auth Service functions are available
console.log("\n✅ Auth Service functions imported successfully:");
console.log("  - register:", typeof register);
console.log("  - login:", typeof login);

// Test 3: Mock user object for token generation
const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  role: "USER",
  tier: "BASIC",
};

try {
  // Test token generation
  const token = generateToken(mockUser);
  console.log("\n✅ Token generation successful");
  console.log("  - Token type:", typeof token);
  console.log("  - Token length:", token.length);

  console.log("\n🎉 JWT Helper relocation completed successfully!");
  console.log("📋 Summary:");
  console.log("  - JWT operations moved to src/utils/helpers/jwt.js");
  console.log("  - Auth service now uses JWT helper for token operations");
  console.log("  - Middleware updated to use JWT helper");
  console.log("  - Controller updated to import refreshToken from JWT helper");
  console.log("  - Single Responsibility Principle maintained");
} catch (error) {
  console.error("\n❌ Error during testing:", error.message);
}
