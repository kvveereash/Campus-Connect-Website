-- The day-before reminder claims each registration by setting this in one
-- UPDATE ... RETURNING, so an overlapping or retried run sends nothing twice.
ALTER TABLE "EventRegistration" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
