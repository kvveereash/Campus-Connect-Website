import type { ReactNode } from 'react';
import styles from './ProblemPage.module.css';

/** The shell for not-found and error screens: what happened, and what to do next. */
export default function ProblemPage({
    kicker,
    title,
    text,
    actions,
    reference,
}: {
    kicker: string;
    title: ReactNode;
    text: string;
    actions: ReactNode;
    /** The error digest, so a report can be matched to the server log. */
    reference?: string;
}) {
    return (
        <div className={styles.wrap}>
            <div className={styles.box}>
                <p className={styles.kicker}>{kicker}</p>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.text}>{text}</p>
                <div className={styles.actions}>{actions}</div>
                {reference ? <p className={styles.reference}>Reference {reference}</p> : null}
            </div>
        </div>
    );
}
