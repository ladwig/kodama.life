'use client';

import Link from 'next/link';
import styles from './mein-ticket.module.css';
import { EVENT } from '@/lib/event';

function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
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
            <Link href="/" className={styles.backLink}>← Home</Link>

            <div className={styles.inner}>
                {/* ── Header ── */}
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        Welcome, {buyer.name}
                    </h1>
                </div>

                {/* ── No tickets state ── */}
                {orders.length === 0 && (
                    <div className={styles.emptyState}>
                        <p>You don't have any tickets yet.</p>
                        <Link href="/tickets" className="btn-raw">
                            Buy a Ticket →
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
                                        <div className={styles.ticketMain}>
                                            <p className={styles.ticketEvent}>{EVENT.name.toUpperCase()}</p>
                                            <p className={styles.ticketName}>{ticket.holder_name}</p>
                                            <div className={styles.ticketMeta}>
                                                <span>{formatDate(EVENT.date)}</span>
                                            </div>
                                        </div>
                                        <div className={styles.ticketDivider} />
                                        <div className={styles.ticketStub}>
                                            <span className={styles.ticketCode}>{ticket.ticket_code}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className={styles.orderNote}>
                                Show your ticket code at the entrance.
                            </p>
                        </div>
                    );
                })}

                {/* ── Buy more ── */}
                <div className={styles.buyMore}>
                    <Link href="/tickets" className="btn-raw">
                        Buy More Tickets
                    </Link>
                </div>
            </div>
        </main>
    );
}
