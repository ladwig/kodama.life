import styles from './thanks.module.css';

// The full home page still lives in HomeClient.js — it's just not rendered any more.
export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.frame}>
                <img src="/fire1.png" alt="" className={`${styles.flame} ${styles.flameLeft}`} />
                <div className={styles.text}>
                    <h1 className={styles.title}>Thank you!</h1>
                    <p className={styles.sub}>See you next time</p>
                </div>
                <img src="/fire1.png" alt="" className={`${styles.flame} ${styles.flameRight}`} />
            </div>
        </main>
    );
}
