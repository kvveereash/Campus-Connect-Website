import Skeleton, { LoadingRegion } from '@/components/Skeleton';
import page from '@/app/profile/page.module.css';
import hero from '@/components/profile/ProfileHero.module.css';

/* The profile hero's own classes: the blue cover is already blue, so the page
   arrives as content filling in rather than a grey box turning into one. */
export default function ProfileLoading() {
    return (
        <LoadingRegion label="Loading profile" className={page.container}>
            <section className={hero.hero}>
                <div className={hero.cover} />
                <div className={hero.body}>
                    <div className={hero.topRow}>
                        <div className={hero.avatar}>
                            <Skeleton height="100%" borderRadius="50%" />
                        </div>
                    </div>
                    <div className={hero.identity}>
                        <div className={hero.name}>
                            <Skeleton width="min(100%, 9ch)" height="0.9em" />
                        </div>
                        <div className={hero.meta}>
                            <Skeleton width="220px" height="14px" />
                        </div>
                        <div className={hero.bio} style={{ display: 'grid', gap: '10px' }}>
                            <Skeleton height="16px" />
                            <Skeleton width="60%" height="16px" />
                        </div>
                    </div>
                    <div className={hero.lower}>
                        <dl className={hero.stats}>
                            {['Attending', 'Hosted', 'Clubs'].map((label) => (
                                <div key={label} className={hero.stat}>
                                    <dt>{label}</dt>
                                    <dd>
                                        <Skeleton width="36px" height="30px" />
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>
        </LoadingRegion>
    );
}
