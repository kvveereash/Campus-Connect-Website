import { getAuditLogs } from '@/lib/data/admin';
import { ScrollText, CheckCircle, XCircle, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
    const logs = await getAuditLogs();

    return (
        <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '30px' }}>Audit Logs</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {logs.length === 0 ? (
                    <div style={{ color: '#a1a1aa', textAlign: 'center', padding: '40px' }}>No audit history found.</div>
                ) : (
                    logs.map((log: any) => (
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
                                    {log.details || 'No details provided'}
                                </p>
                                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#71717a' }}>
                                    By <span style={{ color: '#a1a1aa' }}>{log.actor.name}</span> • {new Date(log.createdAt).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
