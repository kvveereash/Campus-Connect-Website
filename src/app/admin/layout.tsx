import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CheckSquare, Shield, ScrollText, Flag, BarChart3, PartyPopper } from 'lucide-react';
import styles from './layout.module.css';

const LINKS = [
    { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
    { href: '/admin/verification', label: 'Verification', Icon: CheckSquare },
    { href: '/admin/fests', label: 'Fests', Icon: PartyPopper },
    { href: '/admin/reports', label: 'Reports', Icon: Flag },
    { href: '/admin/insights', label: 'Insights', Icon: BarChart3 },
    { href: '/admin/logs', label: 'Audit logs', Icon: ScrollText },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
        redirect('/');
    }

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <Shield size={22} aria-hidden="true" />
                    <h2>Admin</h2>
                </div>
                <nav className={styles.nav} aria-label="Admin">
                    {LINKS.map(({ href, label, Icon }) => (
                        <Link key={href} href={href} className={styles.link}>
                            <Icon size={18} aria-hidden="true" />
                            {label}
                        </Link>
                    ))}
                </nav>
            </aside>

            <main className={styles.main}>{children}</main>
        </div>
    );
}
