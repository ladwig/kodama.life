import { notFound } from 'next/navigation';
import Link from 'next/link';
import { NEWSLETTERS } from '@/lib/newsletters';
import NewsletterFAQ from './NewsletterFAQ';
import styles from './newsletter.module.css';

export default async function NewsletterPage({ params }) {
    const { id } = await params;
    const newsletter = NEWSLETTERS[id];
    if (!newsletter) notFound();

    return (
        <main className={styles.page}>
            <div className={styles.content}>
                <div className={styles.logoWrap}>
                    <img
                        src="https://loveatfirstside.quest/sidequest-logo.png"
                        alt="sidequest"
                        className={styles.logo}
                    />
                </div>

                <p className={styles.date}>{newsletter.date}</p>

                {newsletter.content.map((block, i) => {
                    if (block.type === 'text') {
                        return (
                            <p key={i} className={styles.paragraph}>
                                {block.italic ? <em>{block.text}</em> : block.text}
                            </p>
                        );
                    }
                    if (block.type === 'images') {
                        return (
                            <div key={i} className={styles.imageGrid}>
                                {block.srcs.map((src, j) => (
                                    <img key={j} src={src} alt="" className={styles.gridImage} />
                                ))}
                            </div>
                        );
                    }
                    return null;
                })}

                <div className={styles.ctaRow}>
                    <a
                        href="https://t.me/+RjM5ar5Y-Y81MGFi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.ctaBtn}
                    >
                        Join Telegram
                    </a>
                    <Link href="/tickets" className={`${styles.ctaBtn} ${styles.ctaBtnPrimary}`}>
                        Get your ticket
                    </Link>
                </div>

                <hr className={styles.divider} />

                <NewsletterFAQ />
            </div>
        </main>
    );
}
