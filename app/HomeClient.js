'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { playKeyboard, playSuccess, preloadSounds } from '@/lib/sounds';

function formatPrice(cents) {
    return `${(cents / 100).toFixed(0)} €`;
}

function FireImg({ className, hovered }) {
    const canvasRef = useRef(null);
    const [imgKey, setImgKey] = useState(0);

    useEffect(() => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
        };
        img.src = '/fire1.png';
    }, []);

    useEffect(() => {
        if (hovered) setImgKey(k => k + 1);
    }, [hovered]);

    return (
        <>
            <canvas ref={canvasRef} className={className} style={{ display: hovered ? 'none' : 'block' }} />
            <img key={imgKey} src="/fire1.png" alt="" className={className} style={{ display: hovered ? 'block' : 'none' }} />
        </>
    );
}

const COLLISION_IGNORE = new Set(['html', 'body', 'main', 'div', 'section', 'header', 'footer', 'nav']);

function MiniMonster({ startX, startY, direction, onDone }) {
    const wrapRef = useRef(null);
    const imgRef = useRef(null);
    const canvasRef = useRef(null);

    // Draw first frame to canvas for rest state
    useEffect(() => {
        const src = new window.Image();
        src.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = src.naturalWidth;
            canvas.height = src.naturalHeight;
            canvas.getContext('2d').drawImage(src, 0, 0);
        };
        src.src = '/mini-monster1.png';
    }, []);

    useEffect(() => {
        let alive = true;
        let raf;
        let hoverPaused = false;
        let x = startX;
        let y = startY;
        // More diagonal: 25–55° off horizontal
        const angleDeg = (25 + Math.random() * 30) * (Math.PI / 180);
        const speed = 0.38;
        const vx = direction * speed * Math.cos(angleDeg);
        const vy = (Math.random() < 0.5 ? 1 : -1) * speed * Math.sin(angleDeg);

        const wrap = wrapRef.current;
        const img = imgRef.current;
        const canvas = canvasRef.current;

        function setRestMode(on) {
            if (img) img.style.display = on ? 'none' : 'block';
            if (canvas) canvas.style.display = on ? 'block' : 'none';
        }

        function die() {
            if (!alive) return;
            alive = false;
            cancelAnimationFrame(raf);
            if (wrap) { wrap.style.transition = 'opacity 1s ease'; wrap.style.opacity = '0'; }
            setTimeout(onDone, 1000);
        }

        function onMouseEnter() {
            hoverPaused = true;
            cancelAnimationFrame(raf);
            setRestMode(true);
        }

        function onMouseLeave() {
            hoverPaused = false;
            if (!alive) return;
            setRestMode(false);
            raf = requestAnimationFrame(tick);
        }

        function hitTest(px, py) {
            img.style.visibility = 'hidden';
            if (canvas) canvas.style.visibility = 'hidden';
            const el = document.elementFromPoint(px, py);
            img.style.visibility = '';
            if (canvas) canvas.style.visibility = '';
            return el && !COLLISION_IGNORE.has(el.tagName.toLowerCase()) && el.dataset?.monster !== 'true';
        }

        function tick() {
            if (!alive) return;

            x += vx;
            y += vy;
            if (wrap) { wrap.style.left = x + 'px'; wrap.style.top = y + 'px'; }

            const rect = wrap?.getBoundingClientRect();
            if (!rect || rect.width === 0) { raf = requestAnimationFrame(tick); return; }

            // Walls — treat edges as hitboxes, die on contact
            if (vx > 0 && rect.right >= window.innerWidth) { die(); return; }
            if (vx < 0 && rect.left <= 0) { die(); return; }
            if (vy < 0 && rect.top <= 0) { die(); return; }
            if (vy > 0 && rect.bottom >= window.innerHeight) { die(); return; }
            const frontX = vx > 0 ? rect.right + 1 : rect.left - 1;

            // Multi-point collision along leading edge and vertical direction
            const points = [
                [frontX, rect.top + rect.height * 0.25],
                [frontX, rect.top + rect.height * 0.55],
                [frontX, rect.top + rect.height * 0.85],
                [rect.left + rect.width * 0.5, vy > 0 ? rect.bottom + 1 : rect.top - 1],
            ];
            for (const [px, py] of points) {
                if (px < 0 || px > window.innerWidth || py < 0 || py > window.innerHeight) continue;
                if (hitTest(px, py)) { die(); return; }
            }

            raf = requestAnimationFrame(tick);
        }

        wrap?.addEventListener('mouseenter', onMouseEnter);
        wrap?.addEventListener('mouseleave', onMouseLeave);

        setTimeout(() => { if (alive && wrap) { wrap.style.transition = 'opacity 1.5s ease'; wrap.style.opacity = '1'; } }, 50);
        raf = requestAnimationFrame(tick);

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            wrap?.removeEventListener('mouseenter', onMouseEnter);
            wrap?.removeEventListener('mouseleave', onMouseLeave);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            ref={wrapRef}
            style={{
                position: 'fixed',
                left: startX,
                top: startY,
                width: 34,
                opacity: 0,
                pointerEvents: 'auto',
                zIndex: 10,
                transform: direction < 0 ? 'scaleX(-1)' : 'none',
            }}
        >
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'none' }} />
            <img ref={imgRef} src="/mini-monster1.png" data-monster="true" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
    );
}

function spawnData(existing = []) {
    const direction = Math.random() < 0.5 ? 1 : -1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const MIN_DIST = 150;

    for (let i = 0; i < 30; i++) {
        const x = Math.random() * (W - 60) + 10;
        const y = Math.random() * (H - 60) + 10;
        const tooClose = existing.some(m => Math.hypot(m.startX - x, m.startY - y) < MIN_DIST);
        if (tooClose) continue;
        const hit = document.elementFromPoint(x + 17, y + 17);
        if (!hit || COLLISION_IGNORE.has(hit.tagName.toLowerCase())) {
            return { id: Math.random(), startX: x, startY: y, direction };
        }
    }
    return { id: Math.random(), startX: Math.random() * (W - 60) + 10, startY: Math.random() * (H - 60) + 10, direction };
}

export default function HomeClient({ buyer, orders, tickets }) {
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterState, setNewsletterState] = useState('idle');
    const [newsletterError, setNewsletterError] = useState('');

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [btnHovered, setBtnHovered] = useState(false);
    const [monsters, setMonsters] = useState([]);

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
                body: JSON.stringify({ email: newsletterEmail }),
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

    useEffect(() => {
        preloadSounds();
        if (sessionStorage.getItem('playSuccess')) {
            sessionStorage.removeItem('playSuccess');
            playSuccess();
        }
    }, []);

    useEffect(() => {
        const timers = [
            setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 600),
            setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 2200),
            setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 4000),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);


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
                    src="/sidequest-logo.svg"
                    alt="sidequest"
                    width={340}
                    height={102}
                    priority
                    className={styles.logo}
                />
                <p className={styles.details}>
                    August 22, 2026
                    <br />
                    outskirts of Berlin
                </p>
                {!hasTickets && <div className={styles.description}>
                    <p>
                        {buyerFirstName
                            ? `Some days follow a plan, ${buyerFirstName}, and some days open a small, almost invisible door that you didn't know was there, but step through anyway.`
                            : "Some days follow a plan, and some days open a small, almost invisible door that you didn't know was there, but step through anyway."}
                    </p>
                    <p>
                        Sidequest begins exactly there, in that gentle shift, where the light feels a little softer, the air a little curious, and something in the background starts to hum like it&apos;s been waiting for you.
                    </p>
                    <p>
                        You drift, not lost but lightly unassigned, past leaves that seem to whisper, past sounds that feel familiar in a way you can&apos;t quite explain, until you realize you&apos;re moving with people who somehow already speak the same rhythm.
                    </p>
                    <p>
                        Time stretches just enough to notice it loosening, and then you stop noticing altogether, because there&apos;s nothing to hold onto and nothing you need to.
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
                            <div className={styles.illustratedBtns}>
                                <Link
                                    href="/tickets"
                                    className={styles.illustratedBtn}
                                    onClick={playKeyboard}
                                    onMouseEnter={() => setBtnHovered(true)}
                                    onMouseLeave={() => setBtnHovered(false)}
                                >
                                    <FireImg className={styles.illustratedBtnImgLeft} hovered={btnHovered} />
                                    <span className={styles.illustratedBtnLabel}>BUY TICKET</span>
                                    <FireImg className={styles.illustratedBtnImgRight} hovered={btnHovered} />
                                </Link>
                                <a
                                    href="https://t.me/+RjM5ar5Y-Y81MGFi"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.illustratedBtn}
                                    onClick={playKeyboard}
                                >
                                    <img src="/cerchio3.png" alt="" className={styles.illustratedBtnCircle} />
                                    <span className={styles.illustratedBtnLabel}>ENTER TELEGRAM GROUP</span>
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
                                Signed up. You&apos;ll hear from us when there&apos;s something to say.
                            </div>
                        ) : (
                            <form onSubmit={handleNewsletter} className={styles.newsletterForm}>
                                <div className={styles.newsletterBox}>
                                    <div className={styles.newsletterBoxInner}>
                                        <input
                                            id="newsletter-email"
                                            type="email"
                                            placeholder="Enter email address for updates"
                                            value={newsletterEmail}
                                            onChange={(e) => setNewsletterEmail(e.target.value)}
                                            required
                                            className={styles.newsletterInput}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className={`${styles.newsletterArrow} ${newsletterEmail.length > 0 ? styles.newsletterArrowVisible : ''}`}
                                        disabled={newsletterState === 'loading'}
                                    >
                                        {newsletterState === 'loading' ? '…' : <img src="/arrow.svg" alt="→" width={16} height={15} />}
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

            {monsters.map(m => (
                <MiniMonster
                    key={m.id}
                    startX={m.startX}
                    startY={m.startY}
                    direction={m.direction}
                    onDone={() => {
                        setMonsters(prev => prev.filter(x => x.id !== m.id));
                        setTimeout(() => setMonsters(prev => [...prev, spawnData(prev)]), 1500 + Math.random() * 2000);
                    }}
                />
            ))}
        </main>
    );
}
