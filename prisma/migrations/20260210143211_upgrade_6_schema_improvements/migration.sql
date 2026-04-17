/*
  Warnings:

  - The `role` column on the `ConversationParticipant` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `EventRegistration` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `role` on the `ClubMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `Notification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `TeamRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'COLLEGE_ADMIN');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'PAID', 'COMPLETED', 'CANCELLED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "ClubMemberRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVENT_REMINDER', 'EVENT_UPDATE', 'EVENT_JOIN', 'CLUB_INVITE', 'CLUB_UPDATE', 'CLUB_JOIN', 'TEAM_REQUEST', 'TEAM_CONNECT', 'COMMENT', 'BADGE_EARNED', 'SYSTEM', 'GENERAL');

-- CreateEnum
CREATE TYPE "TeamRequestType" AS ENUM ('LOOKING_FOR_TEAM', 'LOOKING_FOR_MEMBER');

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('MEMBER', 'ADMIN');

-- AlterTable
-- AlterTable
ALTER TABLE "ClubMember" ALTER COLUMN "role" TYPE "ClubMemberRole" USING "role"::text::"ClubMemberRole";

-- AlterTable
ALTER TABLE "ConversationParticipant" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "ConversationParticipant" ALTER COLUMN "role" TYPE "ConversationRole" USING "role"::text::"ConversationRole";
ALTER TABLE "ConversationParticipant" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "EventRegistration" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EventRegistration" ALTER COLUMN "status" TYPE "RegistrationStatus" USING "status"::text::"RegistrationStatus";
ALTER TABLE "EventRegistration" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::text::"NotificationType";

-- AlterTable
ALTER TABLE "TeamRequest" ALTER COLUMN "type" TYPE "TeamRequestType" USING "type"::text::"TeamRequestType";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "TeamRequest_eventId_idx" ON "TeamRequest"("eventId");

-- CreateIndex
CREATE INDEX "TeamRequest_creatorId_idx" ON "TeamRequest"("creatorId");
