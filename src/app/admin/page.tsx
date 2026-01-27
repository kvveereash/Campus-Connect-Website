import { getAdminStats, getChartData } from '@/lib/actions/admin';
import { Users, Calendar, Building2, AlertCircle } from 'lucide-react';
import styles from './admin.module.css';
import AdminCharts from '@/components/admin/AdminCharts';

export default async function AdminDashboard() {
    const stats = await getAdminStats();
    const chartData = await getChartData();

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

function StatCard({ title, value, icon, highlight = false }: any) {
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
