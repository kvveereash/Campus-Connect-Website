'use client';

import { User } from '@/types';
import { COLLEGES } from '@/lib/data';
import styles from '@/app/profile/page.module.css';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Badge from '@/components/Badge';
import { Mail, GraduationCap, Building2, MapPin } from 'lucide-react';

interface ProfileHeaderProps {
    user: User;
    badges: BadgeType[];
    onEdit: () => void;
    onLogout: () => void;
}

export interface BadgeType {
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedDate?: Date | string;
}

export default function ProfileHeader({ user, badges = [], onEdit, onLogout }: ProfileHeaderProps) {
    const handleShareProfile = () => {
        const url = `${window.location.origin}/profile/${user.id}`;
        navigator.clipboard.writeText(url);
        toast.success('Profile link copied to clipboard!');
    };

    const collegeName = user.college?.name || COLLEGES.find(c => c.id === user.collegeId)?.name || 'Unknown University';

    return (
        <div className={styles.idCardContainer}>
            {/* Left Sidebar - Branding & Avatar */}
            <div className={styles.idSidebar}>
                <div className={styles.sidebarTopClip}>
                    <div className={styles.clipHole} />
                </div>

                <div className={styles.idAvatarContainer}>
                    <div className={styles.idAvatarBorder}>
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className={styles.idAvatarImage}
                            />
                        ) : (
                            <div className={styles.idAvatarPlaceholder}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.sidebarLabel}>
                    <span className={styles.labelSub}>STUDENT IDENTITY</span>
                    <span className={styles.labelMain}>CAMPUS CONNECT</span>
                </div>

                <div className={styles.verticalText}>
                    OFFICIAL DOCUMENT
                </div>
            </div>

            {/* Right Section - User Data */}
            <div className={styles.idContent}>
                <div className={styles.idDottedBg} />

                {/* Verified Stamp Overlay */}
                <div className={styles.verifiedStamp}>
                    VERIFIED
                </div>

                <div className={styles.idHeaderRow}>
                    <h1 className={styles.idName}>{user.name}</h1>
                </div>

                <div className={styles.idMetadata}>
                    <div className={styles.idMetaLine}>
                        <GraduationCap size={18} className={styles.metaIcon} />
                        <span className={styles.idDeptYear}>{user.department.toUpperCase()} • {user.year.toUpperCase()}</span>
                    </div>
                    <div className={styles.idMetaLine}>
                        <Building2 size={18} className={styles.metaIcon} />
                        <span className={styles.idCollege}>{collegeName.toUpperCase()}</span>
                    </div>
                </div>

                {user.bio && (
                    <div className={styles.idBioBlock}>
                        <div className={styles.bioQuoteLine} />
                        <p className={styles.idBioText}>
                            {user.bio}
                        </p>
                    </div>
                )}

                <div className={styles.idFooterActions}>
                    <Button
                        onClick={handleShareProfile}
                        variant="primary"
                        size="sm"
                        className={styles.idFollowBtn}
                        leftIcon={<span className="text-sm">+</span>}
                    >
                        Share Profile
                    </Button>

                    <div className={styles.idUtilityActions}>
                        <button onClick={onEdit} className={styles.utilLink}>Edit</button>
                        <span className={styles.utilDivider}>|</span>
                        <button onClick={onLogout} className={styles.utilLinkLogout}>Logout</button>
                    </div>
                </div>

                {/* Integrated Skills & Badges */}
                <div className={styles.idExtraInfo}>
                    {user.skills && user.skills.length > 0 && (
                        <div className={styles.idExtraGroup}>
                            <span className={styles.idExtraLabel}>SKILLS / EXPERTISE</span>
                            <div className={styles.idSkillTags}>
                                {user.skills.map((skill: string) => (
                                    <span key={skill} className={styles.idSkillTag}>{skill}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {badges && badges.length > 0 && (
                        <div className={styles.idExtraGroup}>
                            <span className={styles.idExtraLabel}>ACHIEVEMENTS</span>
                            <div className={styles.idBadgesMini}>
                                {badges.map((badge) => (
                                    <div key={badge.id} className={styles.idBadgeMini} title={badge.name}>
                                        {badge.icon}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
