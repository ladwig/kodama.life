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
                        Deine Tickets{' '}
                        <span className={styles.titleAccent}>🌿</span>
                    </h1>
                    <p className={styles.subtitle}>
                        {buyer.name} · {totalTickets} Ticket{totalTickets !== 1 ? 's' : ''} für Kodama
                    </p>
                </div>

                {/* ── Event info banner ── */}
                <div className={styles.eventBanner}>
                    <div className={styles.eventBannerItem}>
                        <span className={styles.bannerIcon}>📅</span>
                        <span>22. August 2026</span>
                    </div>
                    <div className={styles.eventBannerDivider} />
                    <div className={styles.eventBannerItem}>
                        <span className={styles.bannerIcon}>📍</span>
                        <span>Kiekebusch See</span>
                    </div>
                    <div className={styles.eventBannerDivider} />
                    <div className={styles.eventBannerItem}>
                        <span className={styles.bannerIcon}>🎟</span>
                        <span>{totalTickets} Ticket{totalTickets !== 1 ? 's' : ''}</span>
                    </div>
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
                                    <p className={styles.orderLabel}>Bestellung</p>
                                    <p className={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <div className={styles.orderMeta}>
                                    <span className={styles.badge}>bezahlt</span>
                                    <span className={styles.orderPrice}>{formatPrice(order.total_price)}</span>
                                </div>
                            </div>

                            <div className={styles.ticketList}>
                                {orderTickets.map((ticket) => (
                                    <div key={ticket.id} className={styles.ticketCard}>
                                        <div className={styles.ticketCardLeft}>
                                            <span className={styles.ticketCode}>{ticket.ticket_code}</span>
                                            <span className={styles.ticketHolder}>{ticket.holder_name}</span>
                                        </div>
                                        <div className={styles.ticketPerforations}>
                                            {Array.from({ length: 8 }).map((_, i) => (
                                                <span key={i} className={styles.perforation} />
                                            ))}
                                        </div>
                                        <div className={styles.ticketCardRight}>
                                            <span className={styles.ticketRightLabel}>Kodama</span>
                                            <span className={styles.ticketRightDate}>22.08.2026</span>
                                            <span className={styles.ticketPrice}>{formatPrice(order.price_per_ticket)}</span>
                                        </div>
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
