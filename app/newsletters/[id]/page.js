import { notFound } from 'next/navigation';
import { NEWSLETTERS } from '@/lib/newsletters';
import NewsletterFAQ from './NewsletterFAQ';
import IllustratedButtons from '@/app/components/IllustratedButtons';
import MiniMonsters from '@/app/components/MiniMonsters';
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

                <p className={styles.date}>{newsletter.date}</p>

                {newsletter.content.map((block, i) => {
                    if (block.type === 'text') {
                        const content = block.segments
                            ? block.segments.map((s, j) => s.bold ? <strong key={j}>{s.text}</strong> : s.text)
                            : block.italic ? <em>{block.text}</em> : block.text;
                        return (
                            <p key={i} className={styles.paragraph} {...(i === 0 ? { 'data-description': 'true' } : {})}>
                                {content}
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

                <div className={styles.ctaWrap}>
                    <IllustratedButtons />
                </div>

                <NewsletterFAQ />
            </div>
        </main>
    );
}
