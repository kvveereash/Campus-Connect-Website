'use client';

import { useState, useEffect } from 'react';
import { useTeam } from '@/context/TeamContext';
import { useAuth } from '@/context/AuthContext';
import TeamRequestCard from './TeamRequestCard';
import styles from './TeamFinder.module.css';
import { TeamRequest } from '@/types';

export default function TeamFinder({ eventId }: { eventId: string }) {
    const { getRequestsByEvent, addRequest, deleteRequest, updateRequest, fetchRequests } = useTeam();
    const { user } = useAuth();
    const requests = getRequestsByEvent(eventId);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (eventId) {
            fetchRequests(eventId);
        }
    }, [eventId, fetchRequests]);

    // Form state
    const [type, setType] = useState<'LOOKING_FOR_TEAM' | 'LOOKING_FOR_MEMBER'>('LOOKING_FOR_TEAM');
    const [skills, setSkills] = useState('');
    const [description, setDescription] = useState('');
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const requestData = {
            eventId,
            creatorId: user.id || 'temp-id',
            creatorName: user.name,
            type,
            skills: skills.split(',').map(s => s.trim()).filter(s => s),
            description
        };

        let result;
        if (editingRequestId) {
            result = await updateRequest(editingRequestId, requestData);
        } else {
            result = await addRequest(requestData);
        }

        if (result.success) {
            resetForm();
        } else {
            alert(result.error || 'Failed to save request');
        }
    };

    const resetForm = () => {
        setSkills('');
        setDescription('');
        setType('LOOKING_FOR_TEAM');
        setEditingRequestId(null);
        setShowForm(false);
    };

    const handleEdit = (request: TeamRequest) => {
        setEditingRequestId(request.id);
        setType(request.type);
        setSkills(request.skills.join(', '));
        setDescription(request.description);
        setShowForm(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Find Teammates</h2>
                <button
                    className="btn btn-outline"
                    onClick={() => {
                        if (showForm) {
                            resetForm();
                        } else {
                            setShowForm(true);
                        }
                    }}
                >
                    {showForm ? 'Cancel' : 'Post Request'}
                </button>
            </div>

            {showForm && (
                <div className={styles.formContainer}>
                    <h3 className={styles.formTitle}>
                        {editingRequestId ? 'Edit Request' : 'New Request'}
                    </h3>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>I am...</label>
                            <select
                                className={styles.select}
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                            >
                                <option value="LOOKING_FOR_TEAM">Looking for a Team</option>
                                <option value="LOOKING_FOR_MEMBER">Looking for Members</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Skills (comma separated)</label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="React, Python, Design..."
                                value={skills}
                                onChange={(e) => setSkills(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Tell us about yourself or what you're looking for..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            {editingRequestId ? 'Update Request' : 'Post Request'}
                        </button>
                    </form>
                </div>
            )}

            <div className={styles.list}>
                {requests.length > 0 ? (
                    requests.map((req, index) => {
                        // Generate a deterministic random rotation between -2 and 2 degrees
                        const rotation = (index % 2 === 0 ? 1 : -1) * ((index * 3) % 2 + 0.5);

                        return (
                            <TeamRequestCard
                                key={req.id}
                                request={req}
                                currentUserId={user?.id}
                                onDelete={deleteRequest}
                                onEdit={handleEdit}
                                rotation={rotation}
                            />
                        );
                    })
                ) : (
                    <div className={styles.empty}>
                        <p>No teammate requests yet. Be the first to post!</p>
                    </div>
                )
                }
            </div>
        </div>
    );
}
