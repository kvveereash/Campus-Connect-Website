import styles from './Recruitment.module.css';

/** A club's application questions, numbered. Rendered on the server and inside the apply form. */
export default function RecruitmentQuestions({ questions }: { questions: string[] }) {
    return (
        <ol className={styles.questions}>
            {questions.map((q, i) => (
                <li key={i} className={styles.question}>
                    <span className={styles.number}>{String(i + 1).padStart(2, '0')}</span>
                    <span>{q}</span>
                </li>
            ))}
        </ol>
    );
}
