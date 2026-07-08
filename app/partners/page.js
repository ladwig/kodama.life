'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './partners.module.css';

const CONTENT = {
    en: {
        subtitle: 'August 22, 2026 · Outskirts of Berlin',
        tagline: 'Partner with sidequest',
        intro: 'sidequest is a fully self-funded, community-driven festival. Not a commercial event. Not a brand activation. A pilot built by people who care deeply about underground culture and want to do it properly: high-quality sound, intentional programming, a curated crowd of 300–400, and an experience that actually means something. Built with contributions from SOUP.fm, QS1, Clubcommission, Daycare, Waking Life, and Giegling, supported by a team of volunteers working between Berlin and Lisbon.',
        stats: [
            { value: '21h', label: 'Festival' },
            { value: '8', label: 'DJs' },
            { value: '300–400', label: 'Guests' },
            { value: 'LOUD', label: 'Soundsystem' },
        ],
        whyNow: {
            heading: 'Why Partner Now?',
            body: 'This is year one of something we intend to keep building. The pilot is self-funded to prove the concept and the audience. Next year we go after proper funding. Early partners come in at ground level, with better terms, priority renewal, and a real say in how the partnership grows. We\'re already planning a winter edition at Sonnenraum and a Portugal date in early 2027.',
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
            body: 'This pilot is the proof of concept. Next year we pitch for proper funding and build it bigger. The goal is a recurring annual event with a fixed identity, a growing audience, and real infrastructure behind it. The scene, the network, the energy is already there.',
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
        intro: 'sidequest ist ein vollständig selbstfinanziertes, community-getriebenes Festival. Kein kommerzielles Event. Keine Markeninszenierung. Ein Pilot gebaut von Menschen, denen Underground-Kultur wirklich am Herzen liegt: hochwertiger Sound, durchdachtes Programm, ein kuratiertes Publikum von 300–400 Gästen. Entstanden mit Beiträgen von SOUP.fm, QS1, Clubcommission, Daycare, Waking Life und Giegling, unterstützt von einem Team aus Freiwilligen zwischen Berlin und Lissabon.',
        stats: [
            { value: '21h', label: 'Festival' },
            { value: '8', label: 'DJs' },
            { value: '300–400', label: 'Gäste' },
            { value: 'LOUD', label: 'Soundsystem' },
        ],
        whyNow: {
            heading: 'Warum jetzt?',
            body: 'Das ist Jahr eins von etwas, das wir weiter aufbauen wollen. Der Pilot ist selbstfinanziert, um Konzept und Publikum zu beweisen. Nächstes Jahr gehen wir auf Fördersuche. Frühe Partner steigen zu besseren Konditionen ein, mit Priorität bei der Verlängerung. Eine Winteredition im Sonnenraum und ein Portugal-Termin Anfang 2027 sind bereits in Planung.',
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
