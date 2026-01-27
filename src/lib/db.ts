import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

const db = globalForPrisma.prisma ?? prismaClientSingleton()

export default db

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
