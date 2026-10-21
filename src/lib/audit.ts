/* Not 'use server'. With that directive every export here was a server
   action, so getRecentAuditLogs handed the audit log (actor names and email
   addresses) to anyone who called it, and audit() let anyone write entries.
   These are helpers for other server code only. */
import 'server-only';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Turns any value into something the audit log's JSON column accepts:
 * Dates become strings, undefined fields drop out, exactly as they would
 * in the stored row.
 */
export function toAuditJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null));
}

/**
 * Audit Log Types
 */
export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'ACCESS'
    | 'LOGIN'
    | 'LOGOUT'
    | 'FAILED_LOGIN'
    | 'PERMISSION_DENIED'
    | 'PAYMENT'
    | 'REGISTRATION'
    | 'APPROVE'
    | 'REJECT';

export type AuditEntityType =
    | 'User'
    | 'Event'
    | 'Club'
    | 'College'
    | 'Registration'
    | 'Payment'
    | 'Post'
    | 'Message'
    | 'TeamRequest'
    | 'ClubMember';

/**
 * Create an audit log entry
 * 
 * @param actorId - The user performing the action
 * @param action - The type of action being performed
 * @param entityType - The type of entity being acted upon
 * @param entityId - The ID of the entity being acted upon
 * @param details - Optional additional details about the action
 * 
 * @example
 * ```typescript
 * await audit(session.userId, 'DELETE', 'Event', eventId, { 
 *     title: event.title,
 *     reason: 'User requested deletion'
 * });
 * ```
 */
export async function audit(
    actorId: string,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    details?: Prisma.InputJsonObject
): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                actorId,
                action,
                entityType,
                entityId,
                details: details ?? undefined,
            }
        });

        // Also log to structured logger for real-time monitoring
        logger.info('Audit log created', {
            actorId,
            action,
            entityType,
            entityId,
            type: 'audit',
        });
    } catch (error) {
        // Don't fail the main operation if audit logging fails
        logger.error('Failed to create audit log', error as Error, {
            actorId,
            action,
            entityType,
            entityId,
        });
    }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
    entityType: AuditEntityType,
    entityId: string,
    limit: number = 50
) {
    return prisma.auditLog.findMany({
        where: {
            entityType,
            entityId,
        },
        include: {
            actor: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                }
            }
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });
}

/**
 * Get audit logs for a specific user (actor)
 */
export async function getAuditLogsByActor(
    actorId: string,
    limit: number = 50
) {
    return prisma.auditLog.findMany({
        where: {
            actorId,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });
}

/**
 * Get recent audit logs (for admin dashboard)
 */
export async function getRecentAuditLogs(limit: number = 100) {
    return prisma.auditLog.findMany({
        include: {
            actor: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                }
            }
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });
}

/**
 * Batch audit logging for bulk operations
 */
export async function auditBatch(
    entries: Array<{
        actorId: string;
        action: AuditAction;
        entityType: AuditEntityType;
        entityId: string;
        details?: Prisma.InputJsonObject;
    }>
): Promise<void> {
    try {
        await prisma.auditLog.createMany({
            data: entries.map(entry => ({
                actorId: entry.actorId,
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                details: entry.details ?? undefined,
            }))
        });
    } catch (error) {
        logger.error('Failed to create batch audit logs', error as Error);
    }
}
