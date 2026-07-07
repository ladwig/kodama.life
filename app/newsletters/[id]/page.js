import { notFound } from 'next/navigation';
import { NEWSLETTERS } from '@/lib/newsletters';
import NewsletterFAQ from './NewsletterFAQ';
import IllustratedButtons from '@/app/components/IllustratedButtons';
import MiniMonsters from '@/app/components/MiniMonsters';
import NewsletterSignup from '@/app/components/NewsletterSignup';
import styles from './newsletter.module.css';

export default async function NewsletterPage({ params }) {
    const { id } = await params;
    const newsletter = NEWSLETTERS[id];
    if (!newsletter) notFound();

    return (
        <main className={styles.page}>
            <MiniMonsters />
            <div className={styles.content}>
                <div className={styles.logoWrap}>
                    <img
                        src="https://loveatfirstside.quest/sidequest-logo.png"
                        alt="sidequest"
                        className={styles.logo}
                    />
                </div>

                <NewsletterSignup />

                <p className={styles.date}>{newsletter.date}</p>

                {newsletter.content.map((block, i) => {
                    if (block.type === 'heading') {
                        return <h3 key={i} className={styles.heading}>{block.text}</h3>;
                    }
                    if (block.type === 'text') {
                        const content = block.segments
                            ? block.segments.map((s, j) =>
                                s.href ? <a key={j} href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: '#0670DB' }}>{s.text}</a>
                                : s.bold ? <strong key={j}>{s.text}</strong>
                                : s.text
                              )
                            : block.italic ? <em>{block.text}</em> : block.text;
                        return (
                            <p key={i} className={styles.paragraph} {...(i === 0 ? { 'data-description': 'true' } : {})}>
                                {content}
                            </p>
                        );
                    }
                    if (block.type === 'images') {
                        return (
                            <div key={i} className={block.srcs.length === 1 ? styles.imageSingle : styles.imageGrid}>
                                {block.srcs.map((src, j) => (
                                    <img key={j} src={src} alt="" className={block.srcs.length === 1 ? styles.singleImage : styles.gridImage} />
                                ))}
                            </div>
                        );
                    }
                    return null;
                })}

                <div className={styles.ctaWrap}>
                    <IllustratedButtons ticketHref="/api/auth/magic?redirect=/tickets" />
                </div>

                <NewsletterFAQ />
            </div>
        </main>
    );
}
