'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from '@/app/login/page.module.css'; // Reusing login styles
import { toast } from 'sonner';

export default function SignupPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            setIsLoading(false);
            return;
        }

        const data = new FormData();
        data.append('name', formData.name);
        data.append('email', formData.email);
        data.append('password', formData.password);

        const { signup } = await import('@/lib/actions');
        const result = await signup(null, data);

        if (result.success) {
            toast.success(result.message || 'Account created!');
            window.location.href = '/events';
        } else {
            toast.error(result.error || 'Signup failed');
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Join the movement."
            subtitle="Start your journey with Campus Connect today."
            imageSrc="/auth-hero-signup.png"
        >
            <motion.div
                className={styles.ticketWrapper}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Main Ticket Body */}
                <div className={styles.ticketBody}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>New Member</h2>
                        <p className={styles.subtitle}>Apply for your Campus Pass</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Full Name</label>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email Address</label>
                            <input
                                type="email"
                                className={styles.input}
                                placeholder="student@college.edu"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Password</label>
                            <input
                                type="password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Confirm Password</label>
                            <input
                                type="password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : 'ISSUE TICKET'}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748b' }}>
                        Already have a ticket? <Link href="/login" className={styles.link}>Sign in</Link>
                    </div>
                </div>

                {/* The Stub (Tears away) */}
                <motion.div
                    className={styles.ticketStub}
                    initial={{ opacity: 0.8 }}
                    animate={isLoading ? { x: 50, rotate: 5, opacity: 0.5 } : { x: 0, rotate: 0, opacity: 1 }}
                >
                    <div className={styles.stubContent}>REGISTER</div>
                    <div className={styles.barcode} />
                    <div
                        style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.7rem', color: '#1a1a1a' }}
                        suppressHydrationWarning
                    >
                        REQ: {Math.floor(Math.random() * 999999).toString().padStart(6, '0')}
                    </div>
                </motion.div>
            </motion.div>
        </AuthLayout>
    );
}
