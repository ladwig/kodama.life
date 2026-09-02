import Link from 'next/link';

// ponytail: logo + ticket button is the whole page. The old landing
// page still lives in HomeClient.js, it is just not rendered any more.
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
            <img
                src="/coppi-logo.jpg"
                alt="coppi"
                width={150}
                height={150}
                style={{ width: 'min(220px, 55vw)', height: 'auto' }}
            />
            <Link href="/tickets" className="btn-raw">TICKETS</Link>
        </main>
    );
}
