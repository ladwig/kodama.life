'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './directions.module.css';

// ponytail: content lives right here — replace the copy and drop images into
// public/directions/, then list them below. No CMS until there's a second page.
const SECTIONS = [
    {
        heading: 'Getting there',
        body: `Directions text goes here. Replace this paragraph with the real copy.

Blank lines become new paragraphs.`,
    },
];

// e.g. { src: '/directions/map.jpg', alt: 'Map to the venue', caption: 'The last turn' }
const IMAGES = [];

export default function DirectionsClient() {
    const [code, setCode] = useState('');
    const [guest, setGuest] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Remember the guest so a refresh doesn't ask again
    useEffect(() => {
        const saved = localStorage.getItem('sq_directions_guest');
        if (saved) setGuest(saved);
    }, []);

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

    return (
        <main className={styles.container}>
            <Link href="/" className={styles.backLink}>← Home</Link>

            <div className={styles.inner}>
                {guest === null ? (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>Directions</h1>
                            <p className={styles.subtitle}>Enter your ticket code to see how to get there.</p>
                        </div>

                        <form onSubmit={submit} className={styles.form}>
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
                            <button type="submit" disabled={loading || !code.trim()} className="btn-raw btn-raw-full">
                                {loading ? 'Checking…' : 'Show directions →'}
                            </button>
                            {error && <p className={styles.error}>{error}</p>}
                        </form>
                    </>
                ) : (
                    <>
                        <div className={styles.header}>
                            <h1 className={styles.title}>
                                Directions{guest ? ` — ${guest}` : ''}
                            </h1>
                            <p className={styles.subtitle}>22. Aug 2026</p>
                        </div>

                        {SECTIONS.map((s) => (
                            <section key={s.heading} className={styles.section}>
                                <h2 className={styles.sectionHead}>{s.heading}</h2>
                                {s.body.split('\n\n').map((p, i) => (
                                    <p key={i} className={styles.body}>{p}</p>
                                ))}
                            </section>
                        ))}

                        {IMAGES.map((img) => (
                            <figure key={img.src} className={styles.figure}>
                                <Image
                                    src={img.src}
                                    alt={img.alt}
                                    width={1200}
                                    height={800}
                                    className={styles.image}
                                />
                                {img.caption && <figcaption className={styles.caption}>{img.caption}</figcaption>}
                            </figure>
                        ))}
                    </>
                )}
            </div>
        </main>
    );
}
