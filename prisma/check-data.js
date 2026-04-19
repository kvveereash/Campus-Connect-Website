const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const colleges = await p.college.count();
    const clubs = await p.club.count();
    const events = await p.event.count();
    const users = await p.user.count();
    console.log(`Colleges: ${colleges}, Clubs: ${clubs}, Events: ${events}, Users: ${users}`);
    
    // Show some data
    const colNames = await p.college.findMany({ select: { name: true } });
    console.log('College names:', colNames.map(c => c.name));
}

main().catch(console.error).finally(() => p['$disconnect']());
