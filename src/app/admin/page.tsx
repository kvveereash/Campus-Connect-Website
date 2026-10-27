import { getAdminStats, getChartData } from '@/lib/data/admin';
import { Users, Calendar, Building2, AlertCircle, Flag } from 'lucide-react';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import styles from './admin.module.css';
import AdminCharts from '@/components/admin/AdminCharts';

export default async function AdminDashboard() {
    // A layout and its page render in parallel, so the page checks for itself
    // rather than relying on the layout's redirect having happened first.
    const isAdmin = (await getSession())?.user?.role === 'ADMIN';
    const [stats, chartData, openReports] = await Promise.all([
        getAdminStats(),
        getChartData(),
        isAdmin ? prisma.report.count({ where: { status: 'OPEN' } }) : 0,
    ]);

    if (!stats) return null;

    return (
        <div>
            <h1 className={styles.dashboardHeader}>Dashboard Overview</h1>

            <div className={styles.statsGrid}>
                <StatCard
                    title="Total Users"
                    value={stats.userCount}
                    icon={<Users size={24} color="#3b82f6" />}
                />
                <StatCard
                    title="Total Events"
                    value={stats.eventCount}
                    icon={<Calendar size={24} color="#ec4899" />}
                />
                <StatCard
                    title="Total Clubs"
                    value={stats.clubCount}
                    icon={<Building2 size={24} color="#8b5cf6" />}
                />
                <StatCard
                    title="Pending Reviews"
                    value={stats.pendingClubs + stats.pendingEvents}
                    icon={<AlertCircle size={24} color="#eab308" />}
                    highlight
                />
                <StatCard
                    title="Open reports"
                    value={openReports}
                    icon={<Flag size={24} color="var(--color-danger)" />}
                    highlight={openReports > 0}
                />
            </div>

            {chartData && (
                <AdminCharts
                    eventsData={chartData.eventsByCategory}
                    clubsData={chartData.clubsByCategory}
                />
            )}
        </div>
    );
}

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    highlight?: boolean;
}

function StatCard({ title, value, icon, highlight = false }: StatCardProps) {
    return (
        <div className={`${styles.statCard} ${highlight ? styles.statCardHighlight : ''}`}>
            <div>
                <p className={styles.statLabel}>{title}</p>
                <h3 className={styles.statValue}>{value}</h3>
            </div>
            <div className={styles.iconContainer}>
                {icon}
            </div>
        </div>
    );
}
