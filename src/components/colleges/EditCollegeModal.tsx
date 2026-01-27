'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updateCollege } from '@/lib/actions';
import { X } from 'lucide-react';

interface EditCollegeModalProps {
    college: {
        id: string;
        name: string;
        description: string;
        location: string;
        logo: string;
    };
    onClose: () => void;
}

export default function EditCollegeModal({ college, onClose }: EditCollegeModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        description: college.description,
        location: college.location,
        logo: college.logo
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await updateCollege(college.id, formData);
            if (result.success) {
                toast.success('College profile updated successfully');
                onClose();
            } else {
                toast.error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{
                background: '#1e293b',
                width: '100%', maxWidth: '500px',
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
                padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>Edit College Profile</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', fontSize: '0.95rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>Logo URL</label>
                        <input
                            type="text"
                            value={formData.logo}
                            onChange={e => setFormData({ ...formData, logo: e.target.value })}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', fontSize: '0.95rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            rows={6}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                padding: '10px 20px', borderRadius: '8px', border: 'none',
                                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                                color: 'white', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
                                opacity: isLoading ? 0.7 : 1
                            }}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
