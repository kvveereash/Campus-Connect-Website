'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './page.module.css';
import { toast } from 'sonner';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const submitData = new FormData();
        submitData.append('email', formData.email);
        submitData.append('password', formData.password);

        const { login } = await import('@/lib/actions');
        const result = await login(null, submitData);

        if (result.success) {
            toast.success(result.message || 'Welcome back!');
            // Hard refresh to update auth state from server cookies
            window.location.href = '/events';
        } else {
            toast.error(result.error || 'Login failed');
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back."
            subtitle="Connect with the best minds across campuses."
        >
            <motion.div
                className={styles.ticketWrapper}
                animate={isLoading ? { x: -20 } : { x: 0 }} // Shake on loading? Or maybe just separate on success.
            >
                {/* Main Ticket Body */}
                <div className={styles.ticketBody}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Admit One</h2>
                        <p className={styles.subtitle}>Campus Connect Member Access</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Identity (Email)</label>
                            <input
                                type="email"
                                name="email"
                                className={styles.input}
                                placeholder="student@university.edu"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Secret (Password)</label>
                            <input
                                type="password"
                                name="password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>

                        <div className={styles.actions}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <input type="checkbox" style={{ accentColor: '#1a1a1a' }} /> Remember me
                            </label>
                            <Link href="/forgot-password" className={styles.link}>
                                Lost Ticket?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Verifying...' : 'STAMP TO ENTER'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748b' }}>
                        New here? <Link href="/signup" className={styles.link}>Get a Pass</Link>
                    </div>
                </div>

                {/* The Stub (Tears away) */}
                <motion.div
                    className={styles.ticketStub}
                    animate={isLoading ? { x: 50, rotate: 5, opacity: 0.5 } : { x: 0, rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className={styles.stubContent}>ADMIT ONE</div>
                    <div className={styles.barcode} />
                    <div
                        style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.7rem', color: '#1a1a1a' }}
                        suppressHydrationWarning
                    >
                        NO: {Math.floor(Math.random() * 100000).toString().padStart(6, '0')}
                    </div>
                </motion.div>
            </motion.div>
        </AuthLayout>
    );
}
