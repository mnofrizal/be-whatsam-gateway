-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "display_name" VARCHAR(100);

-- Add comment to the column
COMMENT ON COLUMN "sessions"."display_name" IS 'WhatsApp account display name (e.g., "John Doe", "ABC Company")';