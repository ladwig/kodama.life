import styles from './thanks.module.css';

// The full home page still lives in HomeClient.js — it's just not rendered any more.
function Flame({ className }) {
    // fire1.png is a square APNG with the flame in a narrow band — the wrapper
    // crops the transparent padding so it sits tight against the text.
    return (
        <span className={`${styles.flameBox} ${className}`}>
            <img src="/fire1.png" alt="" className={styles.flameImg} />
        </span>
    );
}

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.frame}>
                <Flame className={styles.flameLeft} />
                <div className={styles.text}>
                    <h1 className={styles.title}>Thank you!</h1>
                    <p className={styles.sub}>See you next time</p>
                </div>
                <Flame className={styles.flameRight} />
            </div>
        </main>
    );
}
