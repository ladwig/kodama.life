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

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    async function handleDownloadPDF(e) {
        e.preventDefault();
        if (isGeneratingPDF) return;
        setIsGeneratingPDF(true);
        try {
            const res = await fetch('/api/tickets/download');
            if (!res.ok) throw new Error('PDF Error');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kodama-tickets.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert('Fehler beim Generieren der PDF.');
        } finally {
            setIsGeneratingPDF(false);
        }
    }

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

                {/* ── Guest view ── */}
                {!isBuyer && (
                    <div className={styles.guestSection}>

                        <div className={styles.actionContainer}>
                            <div className={styles.newsletterMinimal}>
                                {newsletterState === 'success' ? (
                                    <div className={styles.successBox}>
                                        🌿 Du bist dabei! Wir melden uns.
                                    </div>
                                ) : (
                                    <form onSubmit={handleNewsletter} className={styles.newsletterForm}>
                                        <p className={styles.formLabel}>Bleib auf dem Laufenden</p>
                                        <div className={styles.inputGroup}>
                                            <input
                                                id="newsletter-name"
                                                type="text"
                                                placeholder="Name"
                                                value={newsletterName}
                                                onChange={(e) => setNewsletterName(e.target.value)}
                                                required
                                                className={styles.minimalInput}
                                            />
                                            <input
                                                id="newsletter-email"
                                                type="email"
                                                placeholder="E-Mail"
                                                value={newsletterEmail}
                                                onChange={(e) => setNewsletterEmail(e.target.value)}
                                                required
                                                className={styles.minimalInput}
                                            />
                                            <button
                                                type="submit"
                                                className={styles.minimalBtn}
                                                disabled={newsletterState === 'loading'}
                                            >
                                                {newsletterState === 'loading' ? '…' : '→'}
                                            </button>
                                        </div>
                                        {newsletterState === 'error' && (
                                            <p className={styles.errorText}>{newsletterError}</p>
                                        )}
                                    </form>
                                )}

                                <Link href="/tickets" className={styles.moreTicketsLink} style={{ marginTop: '0.25rem' }}>
                                    Ticket kaufen →
                                </Link>
                            </div>
                        </div>
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
                            if (orderTickets.length === 0) return null; // Hier lag das Problem mit dem Ghost-Spacing!
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

                        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'center', marginTop: '-0.25rem', flexWrap: 'wrap' }}>
                            <a 
                                href="#" 
                                onClick={handleDownloadPDF} 
                                className={styles.moreTicketsLink} 
                                style={{ margin: 0, opacity: isGeneratingPDF ? 0.6 : 1, pointerEvents: isGeneratingPDF ? 'none' : 'auto' }}
                            >
                                {isGeneratingPDF ? '⏳ Generiere...' : '↓ als PDF laden'} 
                            </a>
                            <Link href="/tickets" className={styles.moreTicketsLink} style={{ margin: 0 }}>
                                + Weitere Tickets
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
