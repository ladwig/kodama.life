'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './directions.module.css';

// ─────────────────────────────────────────────────────────────
// Content. [text](url) in a body becomes a link, blank lines split
// paragraphs, important: true renders as a highlighted box, and any
// section can carry image: { src, alt, caption } (files in public/directions/).
// ─────────────────────────────────────────────────────────────
const MAP_ROUTE = 'https://maps.app.goo.gl/RUWSMyvrqgMyJGxF9';
const MAP_PICKUP = 'https://maps.app.goo.gl/YasYASyZD7DgRxgz7';
const MAP_PARKING = 'https://maps.app.goo.gl/FytSSYLJmLWLQwgw5';

const INTRO = [
    {
        important: true,
        heading: 'No entry without a QR code',
        body: `There won't be any entry without a QR code at the door. Please do not come if you don't have one already — there's little else here to do in the area unless you're open to booking a last minute flight.`,
    },
    {
        body: `Dust off your dancing shoes, shake out your adventure gear, here are the clues to get you to sidequest this weekend.`,
    },
];

const ROUTES = [
    {
        key: 'transit',
        label: 'Public transport, bike or foot',
        hint: '35 min walk or a few minutes by bike from BER',
        sections: [
            {
                body: `First, public transport to BER Airport. From there follow the bike path signs marked ‘Schönefeld’ (we will leave a couple of hints along the way too). It's a few minutes by bike along the marked path, or about a 35-minute walk on that same bike path.

The way may feel strange, but trust us on this one.`,
            },
        ],
        mapLinks: [{ href: MAP_ROUTE, label: 'Open the route · BER to site' }],
    },
    {
        key: 'taxi',
        label: 'Taxi, Uber or car',
        hint: 'Drop-off at the roundabout, then 10 min on foot',
        sections: [
            {
                body: `Take a taxi or Uber, from the airport or straight from Berlin to the drop-off point marked on the map. From there it's roughly 10 min on foot along the bike path.`,
            },
            {
                important: true,
                heading: 'Use the roundabout only',
                body: `Only use the marked pick-up point (the roundabout) for taxis and Uber's and walk the rest of the bike path. Driving a car along the bike path is strictly prohibited.`,
            },
        ],
        mapLinks: [{ href: MAP_PICKUP, label: 'Open the pick-up point · the roundabout' }],
    },
];

// Shown right under the two choices — applies whatever you pick
const CAR_NOTE = {
    heading: 'Please avoid coming by car',
    body: `If you do, please use the [marked path and parking area](${MAP_PARKING}) and do not take any other route.

Please note that the path is uneven in places, so it's not step-free throughout. If you need support getting there or moving around on site, get in touch beforehand.`,
};

// ponytail: [text](url) only — no markdown lib for one link syntax
function renderBody(text) {
    return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!link) return part;
        return (
            <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {link[1]}
            </a>
        );
    });
}

function Section({ sec, i }) {
    return (
        <section className={sec.important ? styles.important : styles.section}>
            {sec.important && <span className={styles.importantTag}>Important</span>}
            {sec.heading && (
                <h2 className={sec.important ? styles.importantHead : styles.sectionHead}>{sec.heading}</h2>
            )}
            {sec.body.split('\n\n').map((para, j) => (
                <p key={j} className={styles.body}>{renderBody(para)}</p>
            ))}
            {sec.image && (
                <figure className={styles.figure}>
                    <Image src={sec.image.src} alt={sec.image.alt} width={1200} height={800} className={styles.image} />
                    {sec.image.caption && <figcaption className={styles.caption}>{sec.image.caption}</figcaption>}
                </figure>
            )}
        </section>
    );
}

export default function DirectionsClient({ initialGuest = null }) {
    const [code, setCode] = useState('');
    const [guest, setGuest] = useState(initialGuest);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [route, setRoute] = useState(null);

    // Remember the guest so a refresh doesn't ask again
    useEffect(() => {
        if (initialGuest !== null) return;
        const saved = localStorage.getItem('sq_directions_guest');
        if (saved !== null) setGuest(saved);
    }, [initialGuest]);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/directions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (res.ok) {
                setGuest(data.name || '');
                localStorage.setItem('sq_directions_guest', data.name || '');
            } else {
                setError(data.error || 'That did not work.');
            }
        } catch {
            setError('Network error. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const chosen = ROUTES.find((r) => r.key === route);

    return (
        <main className={styles.container}>
            {chosen ? (
                <button onClick={() => setRoute(null)} className={styles.backBtn}>← Back</button>
            ) : (
                <Link href="/" className={styles.backLink}>← Home</Link>
            )}

            <div className={styles.inner}>
                {guest === null ? (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>Directions</h1>
                            <p className={styles.subtitle}>Enter your guestlist code (QR code) to see how to get there.</p>
                        </div>

                        <form onSubmit={submit} className={styles.form}>
                            <div className={styles.inputWrap}>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="SQ-XXXX"
                                    autoCapitalize="characters"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className={styles.input}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !code.trim()}
                                    aria-label="Show directions"
                                    className={styles.submit}
                                >
                                    {loading ? '…' : '→'}
                                </button>
                            </div>
                            {error && <p className={styles.error}>{error}</p>}
                        </form>
                    </>
                ) : (
                    <>
                        {chosen ? (
                            <>
                                <h1 className={styles.routeTitle}>{chosen.label}</h1>
                                {chosen.sections.map((sec, i) => <Section key={i} sec={sec} />)}
                                {(chosen.mapLinks || []).map((m) => (
                                    <a
                                        key={m.href}
                                        href={m.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.mapLink}
                                    >
                                        {m.label} →
                                    </a>
                                ))}
                            </>
                        ) : (
                            <>
                                {INTRO.map((sec, i) => <Section key={i} sec={sec} />)}

                                <div className={styles.section}>
                                    <h2 className={styles.sectionHead}>How are you getting here?</h2>
                                    <div className={styles.choices}>
                                        {ROUTES.map((r) => (
                                            <button
                                                key={r.key}
                                                onClick={() => setRoute(r.key)}
                                                className={styles.choice}
                                            >
                                                <span className={styles.choiceLabel}>{r.label}</span>
                                                <span className={styles.choiceHint}>{r.hint}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Section sec={CAR_NOTE} />
                            </>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
