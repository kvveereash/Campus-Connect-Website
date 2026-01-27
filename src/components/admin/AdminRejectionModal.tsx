'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X } from 'lucide-react';

interface AdminRejectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isSubmitting: boolean;
}

export default function AdminRejectionModal({ isOpen, onClose, onConfirm, isSubmitting }: AdminRejectionModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!reason.trim()) {
            setError('Please provide a reason for rejection.');
            return;
        }
        onConfirm(reason);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute', inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        style={{
                            width: '90%', maxWidth: '500px',
                            backgroundColor: '#18181b', // zinc-900 hardcoded to match dark theme preference
                            border: '1px solid #27272a',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                            zIndex: 10,
                            color: 'white'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Reject Verification</h3>
                            <button
                                onClick={onClose}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '10px' }}>
                                Please specify why this submission is being rejected. This reason will be logged and visible to other admins.
                            </p>
                            <textarea
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    if (error) setError('');
                                }}
                                placeholder="e.g. Inappropriate content, Missing required details..."
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '12px',
                                    backgroundColor: '#27272a',
                                    border: `1px solid ${error ? '#ef4444' : '#3f3f46'}`,
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    resize: 'vertical'
                                }}
                            />
                            {error && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{error}</span>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #3f3f46',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    backgroundColor: '#ef4444',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: 500,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting ? 0.7 : 1
                                }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
