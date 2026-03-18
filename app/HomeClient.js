'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

export default function HomeClient({ buyer, tickets }) {
    const [newsletterName, setNewsletterName] = useState('');
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterState, setNewsletterState] = useState('idle'); // idle | loading | success | error
    const [newsletterError, setNewsletterError] = useState('');

    async function handleNewsletter(e) {
        e.preventDefault();
        setNewsletterState('loading');
        setNewsletterError('');
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newsletterName, email: newsletterEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Fehler');
            setNewsletterState('success');
        } catch (err) {
            setNewsletterError(err.message);
            setNewsletterState('error');
        }
    }

    return (
        <main className={styles.container}>
            {/* Ink splatter dots */}
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />

            <div className={styles.content}>
                <h1 className={styles.title}>Kodama</h1>
                <p className={styles.details}>
                    22. August 2026
                    <br />
                    Kiekebusch See
                </p>

                <Image
                    className={styles.illustration}
                    src="/kodama.png"
                    alt="Kodama spirit"
                    width={200}
                    height={240}
                    priority
                />

                {/* ── Ticket-Käufer: Ticket Cards ── */}
                {buyer && tickets.length > 0 && (
                    <div className={styles.ticketSection}>
                        <p className={styles.sectionLabel}>Deine Tickets, {buyer.name.split(' ')[0]} 🌿</p>
                        <div className={styles.ticketGrid}>
                            {tickets.map((t) => (
                                <div key={t.id} className={styles.ticketCard}>
                                    <span className={styles.ticketCode}>{t.ticket_code}</span>
                                    <span className={styles.ticketHolder}>{t.holder_name}</span>
                                </div>
                            ))}
                        </div>
                        <Link href="/mein-ticket" className={styles.linkBtn}>
                            Alle Tickets ansehen →
                        </Link>
                    </div>
                )}

                {/* ── Gast: Newsletter + CTA ── */}
                {!buyer && (
                    <div className={styles.guestSection}>
                        {/* Programm / Info */}
                        <div className={styles.infoRow}>
                            <span className={styles.pill}>🎶 Live-Musik</span>
                            <span className={styles.pill}>🌊 Badesee</span>
                            <span className={styles.pill}>🌙 Nacht</span>
                            <span className={styles.pill}>🌲 Natur</span>
                        </div>

                        {/* Newsletter */}
                        {newsletterState === 'success' ? (
                            <div className={styles.successBox}>
                                <span>🌿 Du bist dabei! Wir melden uns.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleNewsletter} className={styles.newsletterForm}>
                                <p className={styles.formLabel}>Updates erhalten</p>
                                <div className={styles.inputRow}>
                                    <input
                                        id="newsletter-name"
                                        type="text"
                                        placeholder="Name"
                                        value={newsletterName}
                                        onChange={(e) => setNewsletterName(e.target.value)}
                                        required
                                        className={styles.input}
                                    />
                                    <input
                                        id="newsletter-email"
                                        type="email"
                                        placeholder="E-Mail"
                                        value={newsletterEmail}
                                        onChange={(e) => setNewsletterEmail(e.target.value)}
                                        required
                                        className={styles.input}
                                    />
                                    <button
                                        type="submit"
                                        className={styles.btnPrimary}
                                        disabled={newsletterState === 'loading'}
                                    >
                                        {newsletterState === 'loading' ? '...' : 'Anmelden'}
                                    </button>
                                </div>
                                {newsletterState === 'error' && (
                                    <p className={styles.errorText}>{newsletterError}</p>
                                )}
                            </form>
                        )}

                        {/* Ticket CTA */}
                        <Link href="/tickets" className={styles.ticketCTA}>
                            Ticket kaufen →
                        </Link>
                    </div>
                )}

                {/* ── Ticket-Käufer ohne Tickets (Edge-Case) ── */}
                {buyer && tickets.length === 0 && (
                    <div className={styles.guestSection}>
                        <Link href="/tickets" className={styles.ticketCTA}>
                            Ticket kaufen →
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
