'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { playKeyboard, preloadSounds } from '@/lib/sounds';
import { FAQ_ITEMS } from '@/lib/faq';

function FAQ() {
    const [open, setOpen] = useState(null);
    return (
        <div className={styles.faq}>
            {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={styles.faqItem}>
                    <button
                        className={styles.faqTitle}
                        onClick={() => setOpen(open === i ? null : i)}
                        aria-expanded={open === i}
                    >
                        {item.q}
                        <span className={styles.faqChevron} aria-hidden="true">{open === i ? '−' : '+'}</span>
                    </button>
                    <div className={styles.faqLine} />
                    {open === i && (
                        <div className={styles.faqBody}>
                            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{item.a}{item.link && <> <a href={item.link.href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{item.link.label}</a></>}</p>
                            {item.images && (
                                <div className={styles.faqImages}>
                                    {item.images.map((src, j) => (
                                        <img key={j} src={src} alt="" className={styles.faqImage} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function formatPrice(cents) {
    return `${(cents / 100).toFixed(0)} €`;
}

// Red doodles that randomly fade in, linger, then fade out — ambient decoration.
function AmbientDoodles() {
    const [items, setItems] = useState([]);
    const idRef = useRef(0);
    useEffect(() => {
        const GIFS = ['/star1.gif', '/star2.gif', '/spiral.gif'];
        let timer;
        const spawn = () => {
            setItems((prev) => {
                if (prev.length >= 3) return prev; // cap at 3 on screen
                const id = ++idRef.current;
                const src = GIFS[Math.floor(Math.random() * GIFS.length)];
                // Spiral reads bigger/denser — scale it down; stars stay as-is.
                const size = src === '/spiral.gif' ? 12 + Math.random() * 10 : 34 + Math.random() * 46;
                const x = 5 + Math.random() * 85;
                const y = 8 + Math.random() * 80;
                const dur = Math.round(4000 + Math.random() * 3000);
                setTimeout(() => setItems((p) => p.filter((i) => i.id !== id)), dur);
                return [...prev, { id, src, size, x, y, dur }];
            });
            timer = setTimeout(spawn, 900 + Math.random() * 1800);
        };
        timer = setTimeout(spawn, 900);
        return () => clearTimeout(timer);
    }, []);
    return items.map((i) => (
        <img key={i.id} src={i.src} alt="" aria-hidden="true"
            style={{ position: 'fixed', left: `${i.x}vw`, top: `${i.y}vh`, width: `${i.size}px`, height: 'auto', pointerEvents: 'none', zIndex: 3, animation: `ambientFade ${i.dur}ms ease-in-out forwards` }} />
    ));
}

function TicketLightbox({ tickets, index, onClose, onNav }) {
    const touchX = useRef(null);
    const t = tickets[index];

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onNav(1);
            if (e.key === 'ArrowLeft') onNav(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, onNav]);

    if (!t) return null;
    const multi = tickets.length > 1;

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                    if (touchX.current === null) return;
                    const dx = e.changedTouches[0].clientX - touchX.current;
                    if (dx > 50) onNav(-1);
                    else if (dx < -50) onNav(1);
                    touchX.current = null;
                }}
                style={{ background: '#fff', padding: '1.5rem', width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', position: 'relative' }}
            >
                <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1, padding: '0.3rem' }}>×</button>

                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=1&data=${encodeURIComponent(t.code)}`}
                    alt={t.code}
                    width={260}
                    height={260}
                    style={{ display: 'block' }}
                />
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 700, letterSpacing: '0.06em', fontSize: '1.1rem' }}>{t.code}</div>
                    <div style={{ fontFamily: "'Funnel Display', sans-serif", textTransform: 'uppercase', fontSize: '0.8rem', opacity: 0.6, marginTop: '0.2rem' }}>{t.name}</div>
                </div>

                {multi && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button onClick={() => onNav(-1)} disabled={index === 0} aria-label="Previous"
                            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.25 : 1, padding: '0.3rem 0.6rem' }}>‹</button>
                        <span style={{ fontFamily: "'Funnel Display', sans-serif", fontSize: '0.75rem', opacity: 0.6 }}>{index + 1} / {tickets.length}</span>
                        <button onClick={() => onNav(1)} disabled={index === tickets.length - 1} aria-label="Next"
                            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: index === tickets.length - 1 ? 'default' : 'pointer', opacity: index === tickets.length - 1 ? 0.25 : 1, padding: '0.3rem 0.6rem' }}>›</button>
                    </div>
                )}
            </div>
        </div>
    );
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

function MiniMonster({ startX, startY, direction, mobile, onDone, src: monsterSrc }) {
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
        src.src = monsterSrc;
    }, []);

    useEffect(() => {
        let alive = true;
        let raf;
        let hoverPaused = false;
        let x = startX;
        let y = startY;
        const angleDeg = mobile ? 0 : (25 + Math.random() * 30) * (Math.PI / 180);
        const speed = 0.38;
        const vx = direction * speed * Math.cos(angleDeg);
        const vy = mobile ? 0 : (Math.random() < 0.5 ? 1 : -1) * speed * Math.sin(angleDeg);

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

            // Multi-point collision along leading edge and vertical direction (desktop only)
            if (mobile) { raf = requestAnimationFrame(tick); return; }
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

        if (mobile) setRestMode(true);
        setTimeout(() => { if (alive && wrap) { wrap.style.transition = 'opacity 1.5s ease'; wrap.style.opacity = '1'; } }, 50);
        const walkTimer = setTimeout(() => {
            if (!alive) return;
            if (mobile) setRestMode(false);
            raf = requestAnimationFrame(tick);
        }, mobile ? 5000 : 0);

        return () => {
            alive = false;
            clearTimeout(walkTimer);
            cancelAnimationFrame(raf);
            wrap?.removeEventListener('mouseenter', onMouseEnter);
            wrap?.removeEventListener('mouseleave', onMouseLeave);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            ref={wrapRef}
            style={{
                position: mobile ? 'absolute' : 'fixed',
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
            <img ref={imgRef} src={monsterSrc} data-monster="true" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
    );
}

const MONSTER_SRCS = ['/mini-monster1.png', '/mini-monster2.gif'];
const lastMonsterSrcs = [];

function pickMonsterSrc() {
    const available = lastMonsterSrcs.length >= 2 && lastMonsterSrcs[lastMonsterSrcs.length - 1] === lastMonsterSrcs[lastMonsterSrcs.length - 2]
        ? MONSTER_SRCS.filter(s => s !== lastMonsterSrcs[lastMonsterSrcs.length - 1])
        : MONSTER_SRCS;
    const src = available[Math.floor(Math.random() * available.length)];
    lastMonsterSrcs.push(src);
    if (lastMonsterSrcs.length > 2) lastMonsterSrcs.shift();
    return src;
}

function spawnData(existing = []) {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        const descEl = document.querySelector('[data-description]');
        const mainEl = descEl?.closest('main');
        const descRect = descEl?.getBoundingClientRect();
        const mainRect = mainEl?.getBoundingClientRect();
        const startX = descRect && mainRect ? descRect.left - mainRect.left : 0;
        const startY = descRect && mainRect ? descRect.top - mainRect.top - 22 : window.innerHeight * 0.35;
        return { id: Math.random(), startX, startY: startY + existing.length * 10, direction: 1, mobile: true, src: pickMonsterSrc() };
    }

    const direction = Math.random() < 0.5 ? 1 : -1;
    const monsterSrc = pickMonsterSrc();
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
            return { id: Math.random(), startX: x, startY: y, direction, mobile: false, src: monsterSrc };
        }
    }
    return { id: Math.random(), startX: Math.random() * (W - 60) + 10, startY: Math.random() * (H - 60) + 10, direction, mobile: false, src: monsterSrc };
}

export default function HomeClient({ buyer, orders, tickets }) {
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterState, setNewsletterState] = useState('idle');
    const [newsletterError, setNewsletterError] = useState('');

    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [btnHovered, setBtnHovered] = useState(false);
    const [monsters, setMonsters] = useState([]);
    const [showHome, setShowHome] = useState(false);

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
            a.download = 'sidequest-tickets.pdf';
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

    // Flat list of tickets in render order, for the QR lightbox
    const flatTickets = orders.flatMap((o) =>
        (ticketsByOrder[o.id] || []).map((t) => ({ code: t.ticket_code, name: t.holder_name, price: o.price_per_ticket }))
    );
    const [lightboxIdx, setLightboxIdx] = useState(null);

    useEffect(() => {
        preloadSounds();
        sessionStorage.removeItem('playSuccess');
    }, []);

    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        const timers = isMobile
            ? [setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 600)]
            : [
                setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 600),
                setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 2200),
                setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 4000),
                setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 5800),
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
                    onClick={hasTickets && !showHome ? () => setShowHome(true) : undefined}
                    style={hasTickets && !showHome ? { cursor: 'pointer' } : undefined}
                />
                <p className={styles.details}>
                    August 22, 2026
                    <br />
                    outskirts of Berlin
                </p>
                {(!hasTickets || showHome) && <>
                {showHome && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <a href="#" onClick={e => { e.preventDefault(); setShowHome(false); }} className={styles.moreTicketsLink} style={{ margin: 0 }}>
                            My tickets
                        </a>
                    </div>
                )}
                <img
                    src="https://cdn.resend.app/b2e18824-71c0-49fb-aae8-668775eb6475"
                    alt="sidequest lineup"
                    style={{ width: '100%', height: 'auto', display: 'block', margin: '0 auto 1.5rem' }}
                />
                {/* ponytail: newsletter signup hidden for now — flip to true to restore */}
                {false && <div className={styles.newsletterMinimal}>
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
                </div>}
                <div className={styles.description} data-description="true">
                    <p style={{ marginBottom: '1.4rem' }}>
                        When the summer starts to tip towards Autumn, the monsters set out on a quest. They head off into the woods with a shared thirst for adventure, unsure of what they are looking for.
                    </p>
                    <p style={{ marginBottom: '1.4rem' }}>
                        The pack grows as they share the trail with other creatures, with no concern for where they came from, what they believe, what they look like, or who they love. Pairs and threes wander off to explore side paths and come back with stories. The quest develops into strange confessions, big questions, and moments of unexpected kindness. For a little while, the monsters become a village. Moving, dancing and shaking through the wilderness together.
                    </p>
                    <p>
                        By the next day the site is quiet again. The trails and footprints fade, but a feeling lingers in the air. Something magical occurred between the trees.
                    </p>
                </div>
                </>}

                {/* ── Has tickets ── */}
                {hasTickets && !showHome && (
                    <div className={styles.buyerSection}>
                        {orders.map((order) => {
                            const orderTickets = ticketsByOrder[order.id] || [];
                            if (orderTickets.length === 0) return null;
                            return (
                                <div key={order.id} className={styles.orderBlock}>
                                    <div className={styles.ticketList}>
                                        {orderTickets.map((ticket) => (
                                            <div key={ticket.id}
                                                onClick={() => setLightboxIdx(flatTickets.findIndex((t) => t.code === ticket.ticket_code))}
                                                style={{ position: 'relative', width: '100%', maxWidth: '380px', margin: '0 auto -6%', aspectRatio: '680 / 340', cursor: 'pointer' }}>
                                                {/* Ticket shape — SVG only, no text */}
                                                <svg
                                                    viewBox="0 0 680 340"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                                >
                                                    <path
                                                        d="M 100,40 L 580,40 a 10,10 0 0 1 0,20 a 10,10 0 0 1 0,20 a 10,10 0 0 1 0,20 a 10,10 0 0 1 0,20 a 10,10 0 0 1 0,20 a 30,30 0 0 0 0,60 a 10,10 0 0 1 0,20 a 10,10 0 0 1 0,20 a 10,10 0 0 1 0,20 a 10,10 0 0 1 0,20 a 10,10 0 0 1 0,20 L 100,300 a 10,10 0 0 1 0,-20 a 10,10 0 0 1 0,-20 a 10,10 0 0 1 0,-20 a 10,10 0 0 1 0,-20 a 10,10 0 0 1 0,-20 a 30,30 0 0 0 0,-60 a 10,10 0 0 1 0,-20 a 10,10 0 0 1 0,-20 a 10,10 0 0 1 0,-20 a 10,10 0 0 1 0,-20 a 10,10 0 0 1 0,-20 Z"
                                                        fill="none" stroke="#000" strokeWidth="3.5"
                                                    />
                                                    <rect x="150" y="62" width="380" height="216" fill="none" stroke="#000" strokeWidth="3.5" />
                                                    <line x1="457" y1="62" x2="457" y2="278" stroke="#000" strokeWidth="3.5" />
                                                </svg>
                                                {/* Main area text — positioned as % of ticket */}
                                                <div style={{ position: 'absolute', left: '26%', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '0.2em' }}>
                                                    <span className={styles.ticketText}>{ticket.holder_name.toUpperCase()}</span>
                                                    <span className={styles.ticketText}>22. Aug 2026</span>
                                                    <span className={styles.ticketText}>{formatPrice(order.price_per_ticket)}</span>
                                                </div>
                                                {/* Stub text — rotated, centered in stub area */}
                                                <div style={{ position: 'absolute', left: '72.5%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', whiteSpace: 'nowrap' }}>
                                                    <span className={styles.ticketText}>{ticket.ticket_code}</span>
                                                </div>
                                                {/* Tiny QR glyph in the main area, bottom-right — hints the ticket is tappable */}
                                                <svg viewBox="0 0 24 24" aria-hidden="true"
                                                    style={{ position: 'absolute', left: '61%', top: '73%', transform: 'translate(-50%, -50%)', width: '5.5%', height: 'auto', fill: '#000', opacity: 0.85 }}>
                                                    <path d="M1 1h7v7H1V1zm2 2v3h3V3H3z" />
                                                    <path d="M16 1h7v7h-7V1zm2 2v3h3V3h-3z" />
                                                    <path d="M1 16h7v7H1v-7zm2 2v3h3v-3H3z" />
                                                    <path d="M11 1h2v2h-2V1zm0 4h2v4h-2V5zM1 11h4v2H1v-2zm6 0h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v4h-2v-4zm4 0h2v2h-2v-2zm4 0h2v4h-2v-4z" />
                                                </svg>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                            <a
                                href="#"
                                onClick={e => { e.preventDefault(); setShowHome(true); }}
                                className={styles.moreTicketsLink}
                                style={{ margin: 0 }}
                            >
                                All Info
                            </a>
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
                {(!hasTickets || showHome) && (
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
                                    <span className={styles.illustratedBtnLabel}>TICKETS</span>
                                    <FireImg className={styles.illustratedBtnImgRight} hovered={btnHovered} />
                                </Link>
                                <a
                                    href="https://telegram.me/+RjM5ar5Y-Y81MGFi"
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
            </div>

            <FAQ />

            <AmbientDoodles />

            {lightboxIdx !== null && (
                <TicketLightbox
                    tickets={flatTickets}
                    index={lightboxIdx}
                    onClose={() => setLightboxIdx(null)}
                    onNav={(dir) => setLightboxIdx((i) => Math.max(0, Math.min(flatTickets.length - 1, i + dir)))}
                />
            )}

            {monsters.map(m => (
                <MiniMonster
                    key={m.id}
                    startX={m.startX}
                    startY={m.startY}
                    direction={m.direction}
                    mobile={m.mobile}
                    src={m.src}
                    onDone={() => {
                        setMonsters(prev => prev.filter(x => x.id !== m.id));
                        const delay = m.mobile ? 800 : 1500 + Math.random() * 2000;
                        setTimeout(() => setMonsters(prev => [...prev, spawnData(prev)]), delay);
                    }}
                />
            ))}
        </main>
    );
}
