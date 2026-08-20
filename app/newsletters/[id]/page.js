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
                        src="/sidequest-logo.png"
                        alt="sidequest"
                        className={styles.logo}
                    />
                </div>

                {!newsletter.hideSignup && <NewsletterSignup />}

                <p className={styles.date}>{newsletter.date}</p>

                {newsletter.content.map((block, i) => {
                    if (block.type === 'heading') {
                        return <h3 key={i} className={styles.heading}>{block.text}</h3>;
                    }
                    if (block.type === 'text' || block.type === 'callout') {
                        const renderSegments = (segs) => segs.map((s, j) =>
                            s.href ? <a key={j} href={s.href} {...(s.href.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })} style={{ color: '#0670DB' }}>{s.text}</a>
                            : s.bold ? <strong key={j}>{s.text}</strong>
                            : s.br ? <br key={j} />
                            : s.text
                        );
                        const content = block.segments
                            ? (block.italic ? <em>{renderSegments(block.segments)}</em> : renderSegments(block.segments))
                            : block.italic ? <em>{block.text}</em> : block.text;
                        if (block.type === 'callout') {
                            return (
                                <div key={i} className={styles.callout}>
                                    {block.title && <p className={styles.calloutTitle}>{block.title}</p>}
                                    <p className={styles.paragraph}>{content}</p>
                                </div>
                            );
                        }
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
                    <IllustratedButtons ticketHref="/api/auth/magic?redirect=/tickets" showTicket={false} />
                </div>

                <NewsletterFAQ />
            </div>
        </main>
    );
}
