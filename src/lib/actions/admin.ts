'use server';

import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ActionState } from '@/types';
import { revalidatePath } from 'next/cache';
import { AuditAction, AuditEntityType } from '@/lib/audit';

// Middleware-like check
async function isAdmin() {
    const session = await getSession();
    return session?.user?.role === 'ADMIN';
}



import { createProtectedAction } from '@/lib/protected-action';
import { z } from 'zod';
import { isOk } from '@/lib/api-response';

// ─────────────────────────────────────────────────
// Protected Actions
// ─────────────────────────────────────────────────

const verifyEntitySchema = z.object({
    type: z.enum(['CLUB', 'EVENT']),
    id: z.string(),
    approve: z.boolean(),
    reason: z.string().optional()
});

export const verifyEntityAction = createProtectedAction(verifyEntitySchema, async (data, session) => {
    const timestamp = new Date();
    const actorId = session.userId;

    if (data.approve) {
        if (data.type === 'CLUB') {
            await prisma.club.update({
                where: { id: data.id },
                data: {
                    verified: true,
                    verifiedBy: actorId,
                    verifiedAt: timestamp,
                    rejectionReason: null
                }
            });
        } else {
            await prisma.event.update({
                where: { id: data.id },
                data: {
                    verified: true,
                    verifiedBy: actorId,
                    verifiedAt: timestamp,
                    rejectionReason: null
                }
            });
        }
    } else {
        // Rejection Logic
        const rejectionReason = data.reason || 'No reason provided';
        if (data.type === 'CLUB') {
            await prisma.club.update({
                where: { id: data.id },
                data: {
                    verified: false,
                    rejectionReason,
                    verifiedBy: actorId,
                    verifiedAt: timestamp
                }
            });
        } else {
            await prisma.event.update({
                where: { id: data.id },
                data: {
                    verified: false,
                    rejectionReason,
                    verifiedBy: actorId,
                    verifiedAt: timestamp
                }
            });
        }
    }

    revalidatePath('/admin');
    revalidatePath('/admin/verification');
    return { success: true };
}, {
    requiredRoles: ['ADMIN'],
    audit: {
        action: (data: z.infer<typeof verifyEntitySchema>): AuditAction => data.approve ? 'APPROVE' : 'REJECT',
        entityType: (data: z.infer<typeof verifyEntitySchema>): AuditEntityType => data.type === 'CLUB' ? 'Club' : 'Event',
        getEntityId: (data: z.infer<typeof verifyEntitySchema>) => data.id
    }
});

// ─────────────────────────────────────────────────
// Legacy Wrapper
// ─────────────────────────────────────────────────

/** @deprecated Use verifyEntityAction */
export async function verifyEntity(type: 'CLUB' | 'EVENT', id: string, approve: boolean, reason?: string): Promise<ActionState> {
    const result = await verifyEntityAction({ type, id, approve, reason });
    if (isOk(result)) {
        return { success: true };
    }
    return { success: false, error: result.error };
}
