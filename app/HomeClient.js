'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { playKeyboard, preloadSounds } from '@/lib/sounds';

const FAQ_ITEMS = [
    {
        q: 'Where exactly is the location?',
        a: 'The exact location is shared with ticket holders closer to the event. It\'s easy to reach by public transport and a short walk, or a shared Uber. Expect lots of trees, nature, and a little lake nearby.',
    },
    {
        q: 'What\'s the idea behind this?',
        a: 'Honestly, we got a bit tired of the Berlin club circuit. Same venues, same routines, same everything. We wanted something that felt more like the old days: good music, a proper soundsystem, friends and strangers mixing naturally, out in nature, under the sun. No agenda. Just easy vibes and people actually being present.',
    },
    {
        q: 'What about the music?',
        a: 'We are bringing out the Loud Professional soundsystem. The lineup will be announced to newsletter subscribers first, but the idea is simple: music that makes a sunny day with friends and a cold Sekt feel exactly right. Whether you are deep in the dancefloor or just lying in the grass, it should sound good.',
    },
    {
        q: 'Can I buy a ticket at the door?',
        a: 'No door sales. Every ticket needs to be bought in advance so we can plan properly and have everyone on the guestlist before the event starts. We run this as a private event through our non-profit, so we legally need all guests registered beforehand. We are fully self-financed and every euro counts, so grab your ticket early and tell your friends.',
    },
    {
        q: 'Is there food and drinks?',
        a: 'Alcoholic and non-alcoholic drinks are available throughout the whole event, plus snacks and food to keep you going. The bar is also how we partly finance the whole thing, so grab a drink. And if you want to bring your own meal prep, go for it.',
    },
    {
        q: 'Can I camp?',
        a: 'No camping, but you are welcome to stay as long as you want. Bring a hammock or use our chill areas if you need a rest.',
    },
];

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
                        <p className={styles.faqBody}>{item.a}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

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
    const buyerFirstName = buyer?.name?.trim()?.split(/\s+/)?.[0] || '';

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
                />
                <p className={styles.details}>
                    August 22, 2026
                    <br />
                    outskirts of Berlin
                </p>
                {!hasTickets && <>
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
                <div className={styles.description} data-description="true">
                    <p style={{ marginBottom: '1.4rem' }}>
                        {buyerFirstName
                            ? `Once a year at the end of August, the monsters set out, ${buyerFirstName}. When the summer starts to tip towards Autumn.`
                            : "Once a year at the end of August, the monsters set out. When the summer starts to tip towards Autumn."}
                        {' '}They head off on a quest, not entirely sure if or what they are looking for, just a shared thirst for adventure.
                    </p>
                    <p style={{ marginBottom: '1.4rem' }}>
                        Warmly welcoming other creatures that arrive with kindness and a willingness to share the trail.<br />
                        No concern for where you came from, what you believe, what you look like, or who you love.
                    </p>
                    <p style={{ marginBottom: '1.4rem' }}>
                        The quest develops into strange confessions, big questions, laughter echoing through the trees, moments of unexpected kindness. Pairs and threes wander off to explore side paths and come back with stories.
                    </p>
                    <p style={{ marginBottom: '1.4rem' }}>
                        For a little while, the monsters become a village moving, dancing and shaking through the wilderness together.
                    </p>
                    <p>
                        By the next day the site is quiet again.<br />
                        The paths are empty except for footprints pressed into the dirt and the feeling that something important passed through here together.
                    </p>
                </div>
                </>}

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
                                            <div key={ticket.id} style={{ position: 'relative', width: '100%', maxWidth: '380px', margin: '0 auto -6%', aspectRatio: '680 / 340' }}>
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
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
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
                                    <span className={styles.illustratedBtnLabel}>JOIN THE QUEST</span>
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

                {!hasTickets && <FAQ />}
            </div>

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
