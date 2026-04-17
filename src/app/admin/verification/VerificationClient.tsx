'use client';

import { verifyEntity } from '@/lib/actions/admin';
import { useState } from 'react';
import { Check, X, Building2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import AdminRejectionModal from '@/components/admin/AdminRejectionModal';
import EmptyState from '@/components/common/EmptyState';

interface VerificationClientProps {
    initialData: { clubs: any[], events: any[] } | null;
}

export default function VerificationClient({ initialData }: VerificationClientProps) {
    const [data, setData] = useState(initialData);

    // Modal State
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<{ type: 'CLUB' | 'EVENT', id: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleVerify(type: 'CLUB' | 'EVENT', id: string, approve: boolean) {
        if (!approve) {
            // Open modal for rejection
            setSelectedItem({ type, id });
            setRejectModalOpen(true);
            return;
        }

        const res = await verifyEntity(type, id, true);
        if (res.success) {
            toast.success('Item verified successfully');
            // Remove the item from local state
            if (data) {
                if (type === 'CLUB') {
                    setData({ ...data, clubs: data.clubs.filter((c: any) => c.id !== id) });
                } else {
                    setData({ ...data, events: data.events.filter((e: any) => e.id !== id) });
                }
            }
        } else {
            toast.error('Error: ' + res.error);
        }
    }

    async function handleConfirmRejection(reason: string) {
        if (!selectedItem) return;
        setIsSubmitting(true);
        const res = await verifyEntity(selectedItem.type, selectedItem.id, false, reason);
        setIsSubmitting(false);
        setRejectModalOpen(false);

        if (res.success) {
            toast.success('Item rejected successfully');
            // Remove the item from local state
            if (data) {
                if (selectedItem.type === 'CLUB') {
                    setData({ ...data, clubs: data.clubs.filter((c: any) => c.id !== selectedItem.id) });
                } else {
                    setData({ ...data, events: data.events.filter((e: any) => e.id !== selectedItem.id) });
                }
            }
        } else {
            toast.error('Error: ' + res.error);
        }
        setSelectedItem(null);
    }

    if (!data || (data.clubs.length === 0 && data.events.length === 0)) {
        return (
            <div className="flex items-center justify-center p-8">
                <EmptyState
                    title="All Caught Up!"
                    description="There are no clubs or events pending verification at the moment."
                    icon="✨"
                />
            </div>
        );
    }

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Verification Queue</h1>

            {/* Clubs Section */}
            {data.clubs.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={20} color="#8b5cf6" />
                        Pending Clubs
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {data.clubs.map((club: any) => (
                            <VerificationItem
                                key={club.id}
                                title={club.name}
                                subtitle={`Created by ${club.admin?.name} (${club.admin?.email})`}
                                onApprove={() => handleVerify('CLUB', club.id, true)}
                                onReject={() => handleVerify('CLUB', club.id, false)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Events Section */}
            {data.events.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={20} color="#ec4899" />
                        Pending Events
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {data.events.map((event: any) => (
                            <VerificationItem
                                key={event.id}
                                title={event.title}
                                subtitle={`Organized by ${event.organizer?.name} • ${event.club?.name || 'Independent'}`}
                                onApprove={() => handleVerify('EVENT', event.id, true)}
                                onReject={() => handleVerify('EVENT', event.id, false)}
                            />
                        ))}
                    </div>
                </div>
            )}
            {/* Rejection Modal */}
            <AdminRejectionModal
                isOpen={rejectModalOpen}
                onClose={() => {
                    setRejectModalOpen(false);
                    setSelectedItem(null);
                }}
                onConfirm={handleConfirmRejection}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}

function VerificationItem({ title, subtitle, onApprove, onReject }: any) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div>
                <h3 style={{ margin: 0, fontWeight: '600' }}>{title}</h3>
                <p style={{ margin: '4px 0 0 0', color: '#a1a1aa', fontSize: '0.9rem' }}>{subtitle}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={onReject}
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                    title="Reject"
                >
                    <X size={18} />
                </button>
                <button
                    onClick={onApprove}
                    style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                    title="Approve"
                >
                    <Check size={18} />
                </button>
            </div>
        </div>
    );
}
