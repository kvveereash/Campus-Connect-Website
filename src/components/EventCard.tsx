import { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { EventWithRelations } from '@/lib/actions';
import styles from './EventCard.module.css';
import { motion } from 'framer-motion';
import { useModal } from '@/context/ModalContext';

interface EventCardProps {
    event: EventWithRelations;
    index?: number;
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
    const { openModal } = useModal();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const formatDate = (dateStr: string | Date) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { month: '---', day: '--', weekday: '---' };
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return {
            month: months[d.getMonth()],
            day: d.getDate(),
            weekday: days[d.getDay()]
        };
    };

    const dateInfo = formatDate(event.date);
    const hostCollege = event.hostCollege;

    // Helper for category badge styles
    const getCategoryStyle = (cat: string) => {
        switch (cat) {
            case 'Hackathon': return styles.badgeHackathon;
            case 'Fest': return styles.badgeFest;
            case 'Workshop': return styles.badgeWorkshop;
            case 'Cultural': return styles.badgeCultural;
            default: return styles.badgeHackathon;
        }
    };

    // Helper for category icon placeholder
    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'Hackathon': return '💻';
            case 'Fest': return '🎉';
            case 'Workshop': return '💡';
            default: return '📅';
        }
    };

    const isPrimaryCard = index % 2 === 0;

    return (
        <motion.div
            className={styles.card}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
        >
            {/* Thumbnail */}
            <div className={styles.thumbnailWrapper}>
                <Image
                    src={event.thumbnail || '/hero.png'}
                    alt={event.title}
                    fill
                    className={styles.thumbnail}
                />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        openModal('SHARE', {
                            eventUrl: `${window.location.origin}/events/${event.id}`,
                            eventName: event.title
                        });
                    }}
                    style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        zIndex: 2,
                    }}
                    title="Share Event"
                    aria-label={`Share ${event.title}`}
                >
                    <span aria-hidden="true">📤</span>
                </button>
                {mounted && (
                    <div className={`${styles.priceTag} ${(event.price === 0 || event.price === undefined) ? styles.freeTag : ''}`}>
                        {(event.price === 0 || event.price === undefined) ? 'FREE' : `$${event.price}`}
                    </div>
                )}
            </div>

            <div className={styles.header}>
                <div className={styles.categoryGroup}>
                    <span className={`${getCategoryStyle(event.category)} px-2 py-0.5 rounded text-xs flex items-center gap-1`}>
                        <span className={styles.categoryIcon}>{getCategoryIcon(event.category)}</span>
                        {event.category}
                    </span>
                </div>
                <div className={styles.dateBadge}>
                    {mounted ? (
                        <>
                            <span>
                                {dateInfo.month} {dateInfo.day}
                            </span>
                            <span className={styles.dateSubtext}>
                                {dateInfo.weekday}
                            </span>
                        </>
                    ) : (
                        <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '4px' }} />
                    )}
                </div>
            </div>

            <h3 className={styles.title}>{event.title}</h3>

            <div className={styles.detailsGrid}>
                <div className={styles.statItem}>
                    <span>👥</span>
                    <span>{event.registrationCount} Reg.</span>
                </div>
                <div className={styles.statItem}>
                    <span>📍</span>
                    <span className="truncate">{event.venue}</span>
                </div>
            </div>

            <div className={styles.hostRow}>
                <div className={styles.hostLogoWrapper}>
                    {/* Prioritize Club Logo, then College Logo */}
                    {event.club?.logo ? (
                        <Image
                            src={event.club.logo}
                            alt={event.club.name}
                            width={24}
                            height={24}
                            className={styles.hostLogo}
                        />
                    ) : hostCollege?.logo ? (
                        <Image
                            src={hostCollege.logo}
                            alt={hostCollege.name}
                            width={24}
                            height={24}
                            className={styles.hostLogo}
                        />
                    ) : null}
                </div>
                <p className={styles.host}>
                    Hosted by <strong>{event.club ? event.club.name : (hostCollege?.name || 'Unknown College')}</strong>
                </p>
            </div>

            <div className={styles.footer}>
                <Button
                    href={`/events/${event.id}`}
                    variant={isPrimaryCard ? 'primary' : 'outline'}
                    fullWidth
                    aria-label={`View details for ${event.title}`}
                >
                    View Details
                </Button>
            </div>
        </motion.div >
    );
}
