'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteClub } from '@/lib/actions';
import { toast } from 'sonner';

interface ClubAdminControlsProps {
    clubId: string;
}

export default function ClubAdminControls({ clubId }: ClubAdminControlsProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this club? This action cannot be undone and will remove all members and associated data.')) {
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteClub(clubId);
            if (result.success) {
                toast.success('Club deleted successfully');
                router.push('/clubs');
            } else {
                toast.error(result.error || 'Failed to delete club');
                setIsDeleting(false);
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Admin Controls</h3>
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                    backgroundColor: '#ef4444', // Red-500
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    opacity: isDeleting ? 0.7 : 1,
                    transition: 'background-color 0.2s'
                }}
            >
                {isDeleting ? 'Deleting...' : 'Delete Club'}
            </button>
        </div>
    );
}
