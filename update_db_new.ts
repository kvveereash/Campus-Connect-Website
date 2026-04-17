import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.event.updateMany({
            where: {
                title: {
                    contains: 'Hackathon',
                    mode: 'insensitive'
                }
            },
            data: {
                thumbnail: '/featured-hackathon.jpg'
            }
        });
        console.log(`Updated ${result.count} event(s).`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
