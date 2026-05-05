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
            alert('Error generating the PDF.');
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
            if (!res.ok) throw new Error(data.error || 'Error');
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

    const hasTickets = orders.length > 0;
    const buyerFirstName = buyer?.name?.trim()?.split(/\s+/)?.[0] || '';

    return (
        <main className={`${styles.container} ${hasTickets ? styles.containerBuyer : ''}`}>
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
                <Image
                    src="/sidequest-logo.png"
                    alt="sidequest"
                    width={420}
                    height={100}
                    priority
                    className={styles.logo}
                />
                <p className={styles.details}>
                    August 22, 2026
                    <br />
                    Kiekebusch See
                </p>
                {!hasTickets && <div className={styles.description}>
                    <p>
                        {buyerFirstName
                            ? `Some days follow a plan, ${buyerFirstName}, and some days open a small, almost invisible door that you didn't know was there, but step through anyway.`
                            : "Some days follow a plan, and some days open a small, almost invisible door that you didn't know was there, but step through anyway."}
                    </p>
                    <p>
                        Sidequest begins exactly there, in that gentle shift, where the light feels a little softer, the air a little curious, and something in the background starts to hum like it's been waiting for you.
                    </p>
                    <p>
                        You drift, not lost but lightly unassigned, past leaves that seem to whisper, past sounds that feel familiar in a way you can't quite explain, until you realize you're moving with people who somehow already speak the same rhythm.
                    </p>
                    <p>
                        Time stretches just enough to notice it loosening, and then you stop noticing altogether, because there's nothing to hold onto and nothing you need to.
                    </p>
                    <p>
                        As the day leans into night, everything becomes slightly stranger and warmer at the same time, like the world is trying something new and you're part of it.
                    </p>
                    <p>
                        And later, without really deciding to, you return, carrying something small and unnameable, like a secret you didn't mean to keep but are glad you did.
                    </p>
                </div>}

                {/* ── Has tickets ── */}
                {hasTickets && (
                    <div className={styles.buyerSection}>
                        {orders.map((order) => {
                            const orderTickets = ticketsByOrder[order.id] || [];
                            if (orderTickets.length === 0) return null;
                            return (
                                <div key={order.id} className={styles.orderBlock}>
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
                                {isGeneratingPDF ? '⏳ Generating...' : '↓ Download as PDF'}
                            </a>
                            <Link href="/tickets" className={styles.moreTicketsLink} style={{ margin: 0 }}>
                                + More tickets
                            </Link>
                        </div>
                    </div>
                )}

                {/* ── No tickets yet ── */}
                {!hasTickets && (
                    <div className={styles.guestSection}>
                        <div className={styles.actionContainer}>
                            <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <Link href="/tickets" className={styles.moreTicketsLink} style={{ marginTop: '0.25rem' }}>
                                    Buy ticket →
                                </Link>
                                <a
                                    href="https://chat.whatsapp.com/FNgs9Xla6tnL9mphP9juxV?mode=gi_t"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.moreTicketsLink}
                                    style={{ marginTop: '0.25rem' }}
                                >
                                    Join WhatsApp group →
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Newsletter (always shown) ── */}
                <div className={styles.actionContainer}>
                    <div className={styles.newsletterMinimal}>
                        {newsletterState === 'success' ? (
                            <div className={styles.successBox}>
                                🌿 You are in! We will keep you posted.
                            </div>
                        ) : (
                            <form onSubmit={handleNewsletter} className={styles.newsletterForm}>
                                <p className={styles.formLabel}>Stay in the loop</p>
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
                                        placeholder="Email"
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
                    </div>
                </div>
            </div>
        </main>
    );
}
