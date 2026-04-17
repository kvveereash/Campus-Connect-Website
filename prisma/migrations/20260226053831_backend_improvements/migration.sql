-- AlterTable: AuditLog - Cast details from text to JSONB (preserves existing data)
ALTER TABLE "AuditLog" ALTER COLUMN "details" TYPE JSONB USING CASE WHEN "details" IS NOT NULL THEN "details"::JSONB ELSE NULL END;

-- AlterTable: Badge - Add timestamps with defaults for existing rows
ALTER TABLE "Badge" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: ChatRoom - Add timestamps with defaults for existing rows
ALTER TABLE "ChatRoom" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: College - Add timestamps with defaults for existing rows
ALTER TABLE "College" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Notification - Add updatedAt with default for existing rows
ALTER TABLE "Notification" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
