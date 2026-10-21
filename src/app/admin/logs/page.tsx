import { getAuditLogs } from '@/lib/data/admin';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { formatIST } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * An audit row's details as one readable line. They are stored as JSON, and
 * rendering the object itself is not something React can do: one row with
 * an object in it took the whole page down.
 */
function describeDetails(details: unknown): string {
    if (details === null || details === undefined || details === '') return 'No details provided';
    if (typeof details !== 'object') return String(details);
    const parts = Object.entries(details as Record<string, unknown>).map(([key, value]) =>
        `${key}: ${typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}`
    );
    return parts.length ? parts.join(' · ') : 'No details provided';
}

export default async function AuditLogsPage() {
    const logs = await getAuditLogs();

    return (
        <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '30px' }}>Audit Logs</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {logs.length === 0 ? (
                    <div style={{ color: '#a1a1aa', textAlign: 'center', padding: '40px' }}>No audit history found.</div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} style={{
                            background: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{
                                padding: '10px',
                                borderRadius: '50%',
                                background: log.action === 'APPROVE' ? 'rgba(34, 197, 94, 0.1)' : log.action === 'REJECT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                color: log.action === 'APPROVE' ? '#22c55e' : log.action === 'REJECT' ? '#ef4444' : '#3b82f6'
                            }}>
                                {log.action === 'APPROVE' && <CheckCircle size={20} />}
                                {log.action === 'REJECT' && <XCircle size={20} />}
                                {log.action === 'DELETE' && <Trash2 size={20} />}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: '600', color: 'white' }}>{log.action}</span>
                                    <span style={{ color: '#71717a' }}>•</span>
                                    <span style={{ color: '#a1a1aa' }}>{log.entityType}</span>
                                </div>
                                <p style={{ margin: 0, color: '#d4d4d8', fontSize: '0.95rem' }}>
                                    {describeDetails(log.details)}
                                </p>
                                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#71717a' }}>
                                    By <span style={{ color: '#a1a1aa' }}>{log.actor.name}</span> • {formatIST(log.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
