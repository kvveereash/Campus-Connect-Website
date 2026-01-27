
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPending() {
    const pendingClubs = await prisma.club.count({ where: { verified: false } });
    const pendingEvents = await prisma.event.count({ where: { verified: false } });
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    console.log(`Pending Clubs: ${pendingClubs}`);
    console.log(`Pending Events: ${pendingEvents}`);
    console.log(`Admin User: ${adminUser ? adminUser.email : 'None found'}`);
}

checkPending()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
