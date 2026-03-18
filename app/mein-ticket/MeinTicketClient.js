'use client';

import Link from 'next/link';
import styles from './mein-ticket.module.css';

function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatPrice(cents) {
    return `${(cents / 100).toFixed(0)} €`;
}

export default function MeinTicketClient({ buyer, orders, tickets }) {
    // Group tickets by order_id
    const ticketsByOrder = {};
    tickets.forEach((t) => {
        if (!ticketsByOrder[t.order_id]) ticketsByOrder[t.order_id] = [];
        ticketsByOrder[t.order_id].push(t);
    });

    const totalTickets = tickets.length;

    return (
        <main className={styles.container}>
            <Link href="/" className={styles.backLink}>← Startseite</Link>

            <div className={styles.inner}>
                {/* ── Header ── */}
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        Willkommen, {buyer.name} <span className={styles.titleAccent}>🌿</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Hier findest du später alle Infos zur Anreise, Lineup und mehr.
                    </p>
                </div>

                {/* ── No tickets state ── */}
                {orders.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>Du hast noch keine Tickets.</p>
                        <Link href="/tickets" className={styles.btnPrimary}>
                            Jetzt Ticket kaufen →
                        </Link>
                    </div>
                )}

                {/* ── Orders ── */}
                {orders.map((order) => {
                    const orderTickets = ticketsByOrder[order.id] || [];
                    return (
                        <div key={order.id} className={styles.orderCard}>
                            <div className={styles.orderHeader}>
                                <div>
                                    <p className={styles.orderLabel}>Ticket{orderTickets.length > 1 ? 's' : ''}</p>
                                </div>
                            </div>

                            <div className={styles.ticketList}>
                                {orderTickets.map((ticket) => (
                                    <div key={ticket.id} className={styles.ticketCard}>
                                        <div className={styles.ticketCardLeft}>
                                            <span className={styles.ticketCode}>{ticket.ticket_code}</span>
                                            <span className={styles.ticketHolder}>{ticket.holder_name}</span>
                                            <span className={styles.ticketHolder}>{formatPrice(order.price_per_ticket)}</span>
                                        </div>
                                        <div className={styles.ticketPerforations}>
                                            {Array.from({ length: 8 }).map((_, i) => (
                                                <span key={i} className={styles.perforation} />
                                            ))}
                                        </div>
                                        <div className={styles.ticketCardRight} />
                                    </div>
                                ))}
                            </div>

                            <p className={styles.orderNote}>
                                Zeige den Ticket-Code beim Einlass vor.
                            </p>
                        </div>
                    );
                })}

                {/* ── Buy more ── */}
                <div className={styles.buyMore}>
                    <Link href="/tickets" className={styles.btnSecondary}>
                        Weitere Tickets kaufen
                    </Link>
                </div>
            </div>
        </main>
    );
}
