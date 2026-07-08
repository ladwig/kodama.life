'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './partners.module.css';

const CONTENT = {
    en: {
        subtitle: 'August 22, 2026 · Outskirts of Berlin',
        tagline: 'Partner with sidequest',
        intro: 'sidequest is a fully self-funded, community-driven 21-hour festival pilot. 8 DJs, a LOUD Professional soundsystem, 300–400 guests. An international network of volunteers, collectives, and labels. Pooling existing structures and resources to create something real. By the scene, for the scene.',
        stats: [
            { value: '21h', label: 'Festival' },
            { value: '8', label: 'DJs' },
            { value: '300–400', label: 'Guests' },
            { value: 'LOUD', label: 'Soundsystem' },
        ],
        whyNow: {
            heading: 'Why Partner Now?',
            body: 'This is year one. Founding partners get priority renewal, better terms as we scale, and the chance to grow with us from the start. We\'re building toward a recurring, funded annual event. Editions planned at Sonnenraum this winter and Portugal in early 2027.',
        },
        whatYouGet: {
            heading: 'What You Get',
            items: [
                'Product visibility with real artists and DJs for 21 hours',
                'Exclusivity where relevant (e.g. drinks)',
                'Founding partner credit across all materials and channels',
                'Priority presence at future editions as we grow',
            ],
        },
        asking: {
            heading: "What We're Looking For",
            items: [
                { category: 'Equipment', detail: 'Loan or demo units: Allen & Heath, Technics' },
                { category: 'Drinks', detail: 'Sale-or-return or exclusive partner' },
                { category: 'Infrastructure', detail: 'Toilets, fencing. Sponsored or reduced rate.' },
            ],
        },
        bigger: {
            heading: 'The Bigger Picture',
            body: 'Pilot this year → funding pitch next year → recurring annual event. The scene, the network, the energy is already there. Early partners grow with us.',
        },
        cta: {
            heading: "Let's Talk",
            body: 'Interested in partnering? Get in touch and we\'ll figure something out together.',
            label: 'Get in touch',
        },
    },
    de: {
        subtitle: '22. August 2026 · Berliner Stadtrand',
        tagline: 'Partner werden bei sidequest',
        intro: 'sidequest ist ein vollständig selbstfinanziertes, community-getriebenes 21-Stunden-Festival. 8 DJs, ein LOUD-Professional-Soundsystem, 300–400 Gäste. Ein internationales Netzwerk aus Freiwilligen, Kollektiven und Labels. Bestehende Strukturen zusammenlegen, um etwas Echtes zu schaffen. Von der Szene, für die Szene.',
        stats: [
            { value: '21h', label: 'Festival' },
            { value: '8', label: 'DJs' },
            { value: '300–400', label: 'Gäste' },
            { value: 'LOUD', label: 'Soundsystem' },
        ],
        whyNow: {
            heading: 'Warum jetzt?',
            body: 'Das ist Jahr eins. Gründungspartner erhalten Vorrang bei der Verlängerung, bessere Konditionen im Wachstum und die Chance, von Anfang an dabei zu sein. Wir bauen auf ein jährlich wiederkehrendes Event hin. Editionen geplant im Sonnenraum (Winter) und Portugal (Anfang 2027).',
        },
        whatYouGet: {
            heading: 'Was du bekommst',
            items: [
                'Produktsichtbarkeit bei echten Künstlern und DJs für 21 Stunden',
                'Exklusivität wo relevant (z.B. Getränke)',
                'Gründungspartner-Nennung auf allen Materialien und Kanälen',
                'Priorität bei zukünftigen Editionen',
            ],
        },
        asking: {
            heading: 'Was wir suchen',
            items: [
                { category: 'Equipment', detail: 'Leihgeräte oder Demo-Units: Allen & Heath, Technics' },
                { category: 'Getränke', detail: 'Sale-or-return oder exklusiver Partner' },
                { category: 'Infrastruktur', detail: 'Toiletten, Absperrung — gesponsert oder vergünstigt' },
            ],
        },
        bigger: {
            heading: 'Das große Bild',
            body: 'Pilot dieses Jahr → Finanzierungspitch nächstes Jahr → jährlich wiederkehrendes Event. Die Szene, das Netzwerk, die Energie sind bereits da. Frühe Partner wachsen mit uns.',
        },
        cta: {
            heading: 'Lass uns reden',
            body: 'Interesse an einer Partnerschaft? Schreib uns, wir finden gemeinsam etwas.',
            label: 'Kontakt aufnehmen',
        },
    },
};

export default function PartnersPage() {
    const [lang, setLang] = useState('en');
    const t = CONTENT[lang];

    return (
        <main className={styles.page}>
            <div className={styles.langSwitch}>
                <button onClick={() => setLang('en')} className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}>EN</button>
                <span className={styles.langSep}>/</span>
                <button onClick={() => setLang('de')} className={`${styles.langBtn} ${lang === 'de' ? styles.langActive : ''}`}>DE</button>
            </div>

            <div className={styles.content}>
                <div className={styles.logoWrap}>
                    <Image src="/sidequest-logo.svg" alt="sidequest" width={220} height={66} priority />
                </div>

                <p className={styles.metaLine}>{t.subtitle}</p>
                <h1 className={styles.h1}>{t.tagline}</h1>
                <p className={styles.intro}>{t.intro}</p>

                <img src="https://cdn.resend.app/b2e18824-71c0-49fb-aae8-668775eb6475" alt="sidequest lineup" className={styles.artwork} />

                <div className={styles.divider} />

                <div className={styles.section}>
                    <h2 className={styles.h2}>{t.whyNow.heading}</h2>
                    <p className={styles.body}>{t.whyNow.body}</p>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.h2}>{t.whatYouGet.heading}</h2>
                    <ul className={styles.list}>
                        {t.whatYouGet.items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.h2}>{t.asking.heading}</h2>
                    <div className={styles.askGrid}>
                        {t.asking.items.map((item, i) => (
                            <div key={i} className={styles.askCard}>
                                <span className={styles.askCategory}>{item.category}</span>
                                <span className={styles.askDetail}>{item.detail}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.h2}>{lang === 'en' ? 'Aesthetics' : 'Ästhetik'}</h2>
                    <div className={styles.photoGrid}>
                        {[1, 2, 3, 4].map(n => (
                            <img key={n} src={`/location/location-${n}.webp`} alt="" className={styles.photo} />
                        ))}
                    </div>
                    <img src="/partners/collage.png" alt="sidequest" className={styles.artwork} />
                </div>

                <div className={styles.biggerPicture}>
                    <h2 className={styles.h2}>{t.bigger.heading}</h2>
                    <p className={styles.body}>{t.bigger.body}</p>
                </div>

                <div className={styles.cta}>
                    <h2 className={styles.h2}>{t.cta.heading}</h2>
                    <p className={styles.body}>{t.cta.body}</p>
                    <a href="mailto:hello@loveatfirstside.quest" className={styles.ctaBtn}>{t.cta.label}</a>
                </div>
            </div>
        </main>
    );
}
