'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './partners.module.css';

const CONTENT = {
    en: {
        subtitle: 'August 22, 2026 · Outskirts of Berlin',
        tagline: 'Partner with sidequest',
        intro: 'sidequest is a fully self-funded, community-driven festival. Not a commercial event. Not a brand activation. A pilot built by people who care deeply about underground culture and want to do it properly: high-quality sound, intentional programming, a curated crowd of 300 to 400, and an experience that actually means something. Built with contributions from SOUP.fm, QS1, Clubcommission, Daycare, Waking Life, and Giegling, supported by a team of volunteers working between Berlin and Lisbon.',
        stats: [
            { value: '21h', label: 'Festival' },
            { value: '8', label: 'DJs' },
            { value: '300–400', label: 'Guests' },
            { value: 'LOUD', label: 'Soundsystem' },
        ],
        whyNow: {
            heading: 'Why partner now?',
            body: 'This is year one of something we intend to keep building. The pilot is fully self-funded to prove the concept, workload, sustainability, and the audience. Next year we go after proper funding (Initiative Musik, Musicboard Berlin, etc.) for more liquidity. We\'re already planning a winter edition and a date abroad in early 2027. If you get how culturally valuable this is, get on board and grow with us.',
        },
        crowd: {
            heading: 'The crowd',
            intro: 'Curated through invitation and word of mouth, not mass marketing.',
            items: [
                'Primarily Berlin-based, with guests from other major urban centres',
                'Ages 25 to 35, working professionals with disposable income',
                'An audience that actively invests in experiences, art, and culture',
                'Mixed, international, and genuinely curious',
            ],
        },
        whatYouGet: {
            heading: 'Benefits',
            items: [
                'Product visibility with real artists and DJs for 21h',
                'Exclusivity where relevant (e.g. drinks)',
                'The good feeling of actively supporting independent culture',
                'Priority presence at future editions as we grow',
            ],
        },
        asking: {
            heading: "What we're looking for",
            items: [
                { category: 'DJ gear', detail: 'Loan or demo units' },
                { category: 'Gadgets', detail: 'Health shots, supplements, anything fun and useful on site' },
                { category: 'Drinks', detail: 'Sale-or-return or exclusive partner. We\'re open to only selling your brand on site.' },
                { category: 'Infrastructure', detail: 'Fridges, toilets, fencing. Sponsored or reduced rate.' },
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
        intro: 'sidequest ist ein vollständig selbstfinanziertes, community-getriebenes Festival. Kein kommerzielles Event. Keine Markeninszenierung. Ein Pilot gebaut von Menschen, denen Underground-Kultur wirklich am Herzen liegt: hochwertiger Sound, durchdachtes Programm, ein kuratiertes Publikum von 300 bis 400 Gästen. Entstanden mit Beiträgen von SOUP.fm, QS1, Clubcommission, Daycare, Waking Life und Giegling, unterstützt von einem Team aus Freiwilligen zwischen Berlin und Lissabon.',
        stats: [
            { value: '21h', label: 'Festival' },
            { value: '8', label: 'DJs' },
            { value: '300–400', label: 'Gäste' },
            { value: 'LOUD', label: 'Soundsystem' },
        ],
        whyNow: {
            heading: 'Warum jetzt?',
            body: 'Das ist Jahr eins von etwas, das wir weiter aufbauen wollen. Der Pilot ist vollständig selbstfinanziert, um Konzept, Aufwand, Nachhaltigkeit und Publikum zu beweisen. Nächstes Jahr gehen wir auf Fördersuche (Initiative Musik, Musicboard Berlin etc.) für mehr Liquidität. Eine Winteredition und ein Auslandstermin Anfang 2027 sind bereits in Planung. Wer versteht, wie kulturell wertvoll das ist, macht mit und wächst mit uns.',
        },
        crowd: {
            heading: 'Das Publikum',
            intro: 'Kuratiert durch Einladung und Mundpropaganda, kein Massenmarketing.',
            items: [
                'Hauptsächlich Berlin, mit Gästen aus anderen Großstädten',
                '25 bis 35 Jahre, Berufstätige mit Kaufkraft',
                'Ein Publikum, das aktiv in Erlebnisse, Kunst und Kultur investiert',
                'Gemischt, international, neugierig',
            ],
        },
        whatYouGet: {
            heading: 'Benefits',
            items: [
                'Produktsichtbarkeit bei echten Künstlern und DJs für 21h',
                'Exklusivität wo relevant (z.B. Getränke)',
                'Das gute Gefühl, unabhängige Kulturprojekte aktiv zu unterstützen',
                'Priorität bei zukünftigen Editionen',
            ],
        },
        asking: {
            heading: 'Was wir suchen',
            items: [
                { category: 'DJ-Gear', detail: 'Leihgeräte oder Demo-Units' },
                { category: 'Gadgets', detail: 'Ingwer-Shots, Supplements, alles Sinnvolle und Nützliche vor Ort' },
                { category: 'Getränke', detail: 'Sale-or-return oder exklusiver Partner. Wir sind offen dafür, ausschließlich eure Marke vor Ort zu verkaufen.' },
                { category: 'Infrastruktur', detail: 'Kühlschränke, Toiletten, Absperrung. Gesponsert oder vergünstigt.' },
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

                <div className={styles.section}>
                    <h2 className={styles.h2}>{t.whyNow.heading}</h2>
                    <p className={styles.body}>{t.whyNow.body}</p>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.h2}>{t.crowd.heading}</h2>
                    <p className={styles.body} style={{ marginBottom: '12px', fontStyle: 'italic' }}>{t.crowd.intro}</p>
                    <ul className={styles.list}>
                        {t.crowd.items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
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
                    <a href="mailto:booking@kodama.life" className={styles.ctaBtn}>{t.cta.label}</a>
                </div>
            </div>
        </main>
    );
}
