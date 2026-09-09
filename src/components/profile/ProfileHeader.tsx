'use client';

import { User } from '@/types';
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
        toast.success('Profile link copied');
    };

    // Was falling back to a hardcoded COLLEGES list whose ids ('c1','c2') do
    // not exist in the database, so the fallback could never match anyway.
    const collegeName = user.college?.name || 'Unknown University';

    // department and year are nullable columns, but the User type declares
    // them as plain strings — so `user.department.toUpperCase()` threw for
    // anyone who signed up and never filled them in, which is everyone on
    // their first visit. The line is omitted rather than filled with a
    // placeholder: a profile with no department should say nothing about one.
    const studyLine = [user.department, user.year]
        .filter(Boolean)
        .map((v) => String(v).toUpperCase())
        .join(' · ');

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
                    <span className={styles.labelSub}>Student</span>
                    <span className={styles.labelMain}>Campus Connect</span>
                </div>

                {/* Was "OFFICIAL DOCUMENT". It is not one. */}
                <div className={styles.verticalText}>Member</div>
            </div>

            {/* Right Section - User Data */}
            <div className={styles.idContent}>
                <div className={styles.idHeaderRow}>
                    <h1 className={styles.idName}>{user.name}</h1>
                </div>

                <div className={styles.idMetadata}>
                    {studyLine && (
                        <div className={styles.idMetaLine}>
                            <GraduationCap size={16} className={styles.metaIcon} />
                            <span className={styles.idDeptYear}>{studyLine}</span>
                        </div>
                    )}
                    <div className={styles.idMetaLine}>
                        <Building2 size={16} className={styles.metaIcon} />
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
                    >
                        Copy profile link
                    </Button>

                    <div className={styles.idUtilityActions}>
                        <button onClick={onEdit} className={styles.utilLink}>Edit profile</button>
                        <span className={styles.utilDivider}>|</span>
                        <button onClick={onLogout} className={styles.utilLinkLogout}>Sign out</button>
                    </div>
                </div>

                {/* Integrated Skills & Badges */}
                <div className={styles.idExtraInfo}>
                    {user.skills && user.skills.length > 0 && (
                        <div className={styles.idExtraGroup}>
                            <span className={styles.idExtraLabel}>Skills</span>
                            <div className={styles.idSkillTags}>
                                {user.skills.map((skill: string) => (
                                    <span key={skill} className={styles.idSkillTag}>{skill}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {badges && badges.length > 0 && (
                        <div className={styles.idExtraGroup}>
                            <span className={styles.idExtraLabel}>Badges</span>
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
