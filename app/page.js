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
            {/* 900×561 transparent PNG — height auto keeps the ratio */}
            <img
                src="/logo.png"
                alt="coppi"
                width={900}
                height={561}
                style={{ width: 'min(320px, 70vw)', height: 'auto' }}
            />
            <Link href="/tickets" className="btn-raw">TICKETS</Link>
        </main>
    );
}
