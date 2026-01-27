import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CheckSquare, Shield, ScrollText } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session || session.user.role !== 'ADMIN') {
        redirect('/');
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#09090b', color: 'white' }}>
            {/* Sidebar */}
            <aside style={{ width: '250px', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
                    <Shield size={24} color="#8b5cf6" />
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Admin Panel</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Link href="/admin" style={navLinkStyle}>
                        <LayoutDashboard size={18} />
                        Overview
                    </Link>
                    <Link href="/admin/verification" style={navLinkStyle}>
                        <CheckSquare size={18} />
                        Verification
                    </Link>
                    <Link href="/admin/logs" style={navLinkStyle}>
                        <ScrollText size={18} />
                        Audit Logs
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px' }}>
                {children}
            </main>
        </div>
    );
}

const navLinkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    color: '#a1a1aa',
    textDecoration: 'none',
    transition: 'all 0.2s',
    fontSize: '0.95rem'
} as const;
