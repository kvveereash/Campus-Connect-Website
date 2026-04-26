import { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { resolveCollegeImage, resolveEventImage, resolveClubLogo } from '@/lib/college-images';
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
    const [imgSrc, setImgSrc] = useState(resolveEventImage(event.category, event.thumbnail, event.title));
    const [logoSrc, setLogoSrc] = useState(
        event.club 
            ? resolveClubLogo(event.club) 
            : resolveClubLogo({ name: event.college?.name || 'Unknown' })
    );

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
    const getChipClass = (cat: string) => {
        switch (cat) {
            case 'Hackathon': return styles.chipHackathon;
            case 'Fest': return styles.chipFest;
            case 'Workshop': return styles.chipWorkshop;
            case 'Cultural': return styles.chipCultural;
            case 'Social': return styles.chipSocial;
            default: return styles.chipDefault;
        }
    };

    return (
        <motion.div
            className={styles.card}
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ y: -5, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
        >
            <a href={`/events/${event.id}`} style={{ display: 'flex', flexDirection: 'column', flex: 1, textDecoration: 'none', color: 'inherit', height: '100%' }}>
                {/* Image & Top Badges */}
                <div 
                    className={styles.imageContainer} 
                    style={{ flexShrink: 0, position: 'relative', width: '100%', height: '200px', overflow: 'hidden' }}
                >
                    <Image
                        src={imgSrc}
                        alt={event.title || 'Event image'}
                        fill
                        className={styles.image}
                        style={{ objectFit: 'cover' }}
                        onError={() => setImgSrc('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800')}
                    />

                    {/* Price Tag (Top Left) */}
                    {mounted && (
                        <div className={`${styles.priceTag} ${(event.price === 0 || event.price === undefined) ? styles.freeTag : ''}`}>
                            {(event.price === 0 || event.price === undefined) ? 'FREE' : `$${event.price}`}
                        </div>
                    )}

                    {/* Share Button (Top Right) */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            openModal('SHARE', {
                                eventUrl: `${window.location.origin}/events/${event.id}`,
                                eventName: event.title
                            });
                        }}
                        className={styles.shareButton}
                        title="Share Event"
                        aria-label={`Share ${event.title}`}
                    >
                        <span aria-hidden="true" style={{ fontSize: '14px' }}>📤</span>
                    </button>

                    {/* Category Chip (Bottom Left) */}
                    <span className={`${styles.categoryChip} ${getChipClass(event.category)}`}>
                        {event.category || 'General'}
                    </span>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    <h2 className={styles.title}>{event.title || 'Untitled Event'}</h2>
                    <p className={styles.description}>
                        {mounted ? `From ${dateInfo.month} ${dateInfo.day}, ${dateInfo.weekday} • ${event.venue || 'TBA'}` : 'Loading details...'}
                    </p>

                    {/* Next Event / Date Info Box */}
                    {mounted && (
                        <div className={styles.infoBox}>
                            <span className={styles.infoIcon}>📅</span>
                            <span className={styles.infoLabel}>Date:</span>
                            {dateInfo.month} {dateInfo.day} — {dateInfo.weekday}
                        </div>
                    )}

                    {/* Host Info */}
                    <div className={styles.hostRow}>
                        <div className={styles.hostLogoWrapper}>
                            <Image
                                src={logoSrc}
                                alt={event.club?.name || event.college?.name || 'Host'}
                                fill
                                style={{ objectFit: 'cover' }}
                                className={styles.hostLogo}
                                onError={() => setLogoSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(event.club?.name || event.college?.name || 'C')}&background=0F1F1C&color=EBF3F1`)}
                            />
                        </div>
                        <span className={styles.hostText}>
                            Hosted by <strong>{event.club ? event.club.name : (hostCollege?.name || 'Unknown')}</strong>
                        </span>
                    </div>

                    {/* Footer */}
                    <div className={styles.footer} onClick={(e) => e.stopPropagation()}>
                        <span className={styles.stats}>
                            <span style={{ fontSize: '14px' }}>👥</span>
                            {event.registrationCount || 0} Reg.
                        </span>
                        <span className={styles.joinBtn}>
                            View Details
                        </span>
                    </div>
                </div>
            </a>
        </motion.div>
    );
}
