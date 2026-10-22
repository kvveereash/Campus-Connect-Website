-- "Interested" saves. See the EventInterest model.

-- CreateTable
CREATE TABLE "EventInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderSentAt" TIMESTAMP(3),

    CONSTRAINT "EventInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventInterest_eventId_idx" ON "EventInterest"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInterest_userId_eventId_key" ON "EventInterest"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every public table has RLS on with no policies: Prisma connects as the
-- owner and is unaffected, and Supabase's public API roles see nothing.
ALTER TABLE "EventInterest" ENABLE ROW LEVEL SECURITY;
