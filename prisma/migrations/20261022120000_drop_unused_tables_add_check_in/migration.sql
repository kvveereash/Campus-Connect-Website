-- Three tables no code reads: ChatRoom and ChatMessage are an old chat
-- (4 seed rooms, no messages; chat uses Conversation/Message), and
-- RefreshToken belongs to a token scheme the site never shipped (0 rows).
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_roomId_fkey";
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_senderId_fkey";
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

DROP TABLE "ChatRoom";
DROP TABLE "ChatMessage";
DROP TABLE "RefreshToken";

-- QR check-in: when an organiser scanned this attendee in. Null until then.
ALTER TABLE "EventRegistration" ADD COLUMN "checkedInAt" TIMESTAMP(3);
