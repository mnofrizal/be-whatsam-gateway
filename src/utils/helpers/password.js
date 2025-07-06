import bcrypt from "bcryptjs";
import { UnauthorizedError } from "../../middleware/error-handler.js";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hash = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a password with its hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
export const compare = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Validate current password and hash new password
 * @param {string} currentPassword - Current plain text password
 * @param {string} userHash - Current hashed password from database
 * @param {string} newPassword - New plain text password
 * @returns {Promise<string>} New hashed password
 */
export const validateAndHash = async (
  currentPassword,
  userHash,
  newPassword
) => {
  const isValid = await compare(currentPassword, userHash);
  if (!isValid) {
    throw new UnauthorizedError("Current password is incorrect");
  }
  return await hash(newPassword);
};
