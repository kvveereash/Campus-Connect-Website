'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ActionState } from '@/types';
import { revalidatePath } from 'next/cache';

// Middleware-like check
async function isAdmin() {
    const session = await getSession();
    return session?.user?.role === 'ADMIN';
}

export async function getAdminStats() {
    if (!(await isAdmin())) return null;

    const [userCount, eventCount, clubCount, pendingClubs, pendingEvents] = await Promise.all([
        prisma.user.count(),
        prisma.event.count(),
        prisma.club.count(),
        prisma.club.count({ where: { verified: false } }),
        prisma.event.count({ where: { verified: false } })
    ]);

    return {
        userCount,
        eventCount,
        clubCount,
        pendingClubs,
        pendingEvents
    };
}

export async function getChartData() {
    if (!(await isAdmin())) return null;

    const [eventsByCategory, clubsByCategory] = await Promise.all([
        prisma.event.groupBy({
            by: ['category'],
            _count: { id: true }
        }),
        prisma.club.groupBy({
            by: ['category'],
            _count: { id: true }
        })
    ]);

    return {
        eventsByCategory: eventsByCategory.map(e => ({ name: e.category, value: e._count.id })),
        clubsByCategory: clubsByCategory.map(c => ({ name: c.category, value: c._count.id }))
    };
}

export async function getPendingContent() {
    if (!(await isAdmin())) return null;

    const [rawClubs, events] = await Promise.all([
        prisma.club.findMany({
            where: {
                verified: false,
                rejectionReason: null
            },
            include: {
                members: {
                    where: { role: 'ADMIN' },
                    include: { user: { select: { name: true, email: true } } },
                    take: 1
                }
            }
        }),
        prisma.event.findMany({
            where: {
                verified: false,
                rejectionReason: null
            },
            include: { creator: { select: { name: true } }, club: { select: { name: true } } }
        })
    ]);

    const clubs = rawClubs.map(club => ({
        ...club,
        admin: club.members[0]?.user || { name: 'Unknown', email: 'N/A' }
    }));

    return { clubs, events };
}

export async function getAuditLogs() {
    if (!(await isAdmin())) return [];

    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                actor: {
                    select: { name: true, email: true }
                }
            }
        });
        return logs;
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
    }
}

export async function verifyEntity(type: 'CLUB' | 'EVENT', id: string, approve: boolean, reason?: string): Promise<ActionState> {
    if (!(await isAdmin())) return { success: false, error: 'Unauthorized' };

    const session = await getSession();
    const actorId = session!.userId!;

    try {
        const timestamp = new Date();

        if (approve) {
            if (type === 'CLUB') {
                await prisma.club.update({
                    where: { id },
                    data: {
                        verified: true,
                        verifiedBy: actorId,
                        verifiedAt: timestamp,
                        rejectionReason: null
                    }
                });
            } else {
                await prisma.event.update({
                    where: { id },
                    data: {
                        verified: true,
                        verifiedBy: actorId,
                        verifiedAt: timestamp,
                        rejectionReason: null
                    }
                });
            }

            // Create Audit Log
            await prisma.auditLog.create({
                data: {
                    action: 'APPROVE',
                    entityType: type,
                    entityId: id,
                    actorId: actorId,
                    details: 'Verified successfully'
                }
            });

        } else {
            // Rejection Logic
            if (type === 'CLUB') {
                await prisma.club.update({
                    where: { id },
                    data: {
                        verified: false,
                        rejectionReason: reason || 'No reason provided',
                        verifiedBy: actorId,
                        verifiedAt: timestamp
                    }
                });
            } else {
                await prisma.event.update({
                    where: { id },
                    data: {
                        verified: false,
                        rejectionReason: reason || 'No reason provided',
                        verifiedBy: actorId,
                        verifiedAt: timestamp
                    }
                });
            }

            // Create Audit Log
            await prisma.auditLog.create({
                data: {
                    action: 'REJECT',
                    entityType: type,
                    entityId: id,
                    actorId: actorId,
                    details: reason || 'No reason provided'
                }
            });
        }

        revalidatePath('/admin');
        revalidatePath('/admin/verification');
        return { success: true };
    } catch (error) {
        console.error('Verification error:', error);
        return { success: false, error: 'Failed to verify entity' };
    }
}
