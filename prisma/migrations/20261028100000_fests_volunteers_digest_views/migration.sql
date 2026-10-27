-- Fests, volunteer roles, the weekly digest opt-in and per-event view counts.
-- Additive only: new nullable or defaulted columns and new tables.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "digestSentAt" TIMESTAMP(3),
ADD COLUMN     "weeklyDigest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "festId" TEXT;

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "Fest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "coverImage" TEXT,
    "collegeId" TEXT NOT NULL,
    "clubId" TEXT,
    "creatorId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Fest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerRole" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slots" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerSignup" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventView" (
    "eventId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventView_pkey" PRIMARY KEY ("eventId","day","source")
);

-- CreateIndex
CREATE INDEX "Fest_collegeId_idx" ON "Fest"("collegeId");

-- CreateIndex
CREATE INDEX "Fest_startDate_idx" ON "Fest"("startDate");

-- CreateIndex
CREATE INDEX "Fest_deletedAt_idx" ON "Fest"("deletedAt");

-- CreateIndex
CREATE INDEX "VolunteerRole_eventId_idx" ON "VolunteerRole"("eventId");

-- CreateIndex
CREATE INDEX "VolunteerSignup_userId_idx" ON "VolunteerSignup"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerSignup_roleId_userId_key" ON "VolunteerSignup"("roleId", "userId");

-- CreateIndex
CREATE INDEX "Event_festId_idx" ON "Event"("festId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_festId_fkey" FOREIGN KEY ("festId") REFERENCES "Fest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fest" ADD CONSTRAINT "Fest_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fest" ADD CONSTRAINT "Fest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fest" ADD CONSTRAINT "Fest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerRole" ADD CONSTRAINT "VolunteerRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerSignup" ADD CONSTRAINT "VolunteerSignup_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "VolunteerRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerSignup" ADD CONSTRAINT "VolunteerSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventView" ADD CONSTRAINT "EventView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The app reaches these through Prisma as the table owner; with RLS on and no
-- policies, Supabase's public API roles cannot read or write them.
ALTER TABLE "Fest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VolunteerRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VolunteerSignup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventView" ENABLE ROW LEVEL SECURITY;
