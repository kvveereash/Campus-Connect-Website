import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const events = await prisma.event.findMany({
            select: { id: true, title: true, thumbnail: true }
        });
        console.log('--- DATABASE STATE ---');
        console.log(JSON.stringify(events, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
