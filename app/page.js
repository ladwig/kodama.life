import Link from 'next/link';

// ponytail: logo + ticket button is the whole page. The old illustrated
// landing page is in git history (`git show af64cd2:app/HomeClient.js`).
export default function Home() {
    return (
        <main
            style={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4rem',
                padding: '2rem',
            }}
        >
            {/* Shown at its own 150×150 — never scaled or stretched */}
            <img
                src="/coppi-logo.jpg"
                alt="coppi"
                width={150}
                height={150}
                style={{ width: 150, height: 'auto', maxWidth: '80vw' }}
            />
            <Link href="/tickets" className="btn-raw">TICKETS</Link>
        </main>
    );
}
