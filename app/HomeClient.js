'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

function formatPrice(cents) {
    return `${(cents / 100).toFixed(0)} €`;
}

export default function HomeClient({ buyer, orders, tickets }) {
    const [newsletterName, setNewsletterName] = useState('');
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterState, setNewsletterState] = useState('idle');
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

    // Group tickets by order
    const ticketsByOrder = {};
    tickets.forEach((t) => {
        if (!ticketsByOrder[t.order_id]) ticketsByOrder[t.order_id] = [];
        ticketsByOrder[t.order_id].push(t);
    });

    const isBuyer = !!buyer;

    return (
        <main className={`${styles.container} ${isBuyer ? styles.containerBuyer : ''}`}>
            {/* Ink splatter dots */}
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />

            <div className={styles.content}>
                {/* ── Hero ── */}
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

                {/* ── Guest view ── */}
                {!isBuyer && (
                    <div className={styles.guestSection}>
                        <div className={styles.infoRow}>
                            <span className={styles.pill}>🎶 Live-Musik</span>
                            <span className={styles.pill}>🌊 Badesee</span>
                            <span className={styles.pill}>🌙 Nacht</span>
                            <span className={styles.pill}>🌲 Natur</span>
                        </div>

                        {newsletterState === 'success' ? (
                            <div className={styles.successBox}>
                                🌿 Du bist dabei! Wir melden uns.
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
                                        className={styles.btnSmall}
                                        disabled={newsletterState === 'loading'}
                                    >
                                        {newsletterState === 'loading' ? '…' : 'Anmelden'}
                                    </button>
                                </div>
                                {newsletterState === 'error' && (
                                    <p className={styles.errorText}>{newsletterError}</p>
                                )}
                            </form>
                        )}

                        <Link href="/tickets" className={styles.ticketCTA}>
                            Ticket kaufen →
                        </Link>
                    </div>
                )}

                {/* ── Buyer view: full ticket cards inline ── */}
                {isBuyer && (
                    <div className={styles.buyerSection}>
                        <p className={styles.welcomeLabel}>
                            Willkommen zurück, {buyer.name.split(' ')[0]} 🌿
                        </p>

                        {/* Event banner removed as requested */}

                        {/* Ticket cards grouped by order */}
                        {orders.length === 0 && (
                            <div className={styles.emptyTickets}>
                                <p>Noch keine Tickets.</p>
                                <Link href="/tickets" className={styles.ticketCTA}>Jetzt kaufen →</Link>
                            </div>
                        )}

                        {orders.map((order) => {
                            const orderTickets = ticketsByOrder[order.id] || [];
                            return (
                                <div key={order.id} className={styles.orderBlock}>
                                    {/* Order meta removed as requested */}

                                    <div className={styles.ticketList}>
                                        {orderTickets.map((ticket) => (
                                            <div key={ticket.id} className={styles.ticketCard}>
                                                <div className={styles.ticketLeft}>
                                                    <span className={styles.ticketCode}>{ticket.ticket_code}</span>
                                                    <span className={styles.ticketHolder}>{ticket.holder_name}</span>
                                                    <span className={styles.ticketHolder}>{formatPrice(order.price_per_ticket)}</span>
                                                </div>
                                                <div className={styles.ticketPerfs}>
                                                    {Array.from({ length: 7 }).map((_, i) => (
                                                        <span key={i} className={styles.perf} />
                                                    ))}
                                                </div>
                                                <div className={styles.ticketRight} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        <Link href="/tickets" className={styles.moreTicketsLink}>
                            + Weitere Tickets kaufen
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
