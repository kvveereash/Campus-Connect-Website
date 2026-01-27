
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function makeAdmin() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No users found. Please sign up first.');
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
    });

    console.log(`User ${user.email} (ID: ${user.id}) is now an ADMIN.`);
}

makeAdmin()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
