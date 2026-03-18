export const metadata = {
    title: 'Abgemeldet – Kodama',
};

export default function UnsubscribedPage() {
    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}
        >
            <div
                style={{
                    background: 'rgba(255,255,255,0.65)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '3rem 2.5rem',
                    maxWidth: '400px',
                    width: '100%',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: 'var(--shadow-lg)',
                }}
            >
                <div style={{ fontSize: '3rem' }}>🍃</div>
                <h1
                    style={{
                        fontFamily: 'Caveat, cursive',
                        fontSize: '2.2rem',
                        fontWeight: 700,
                        color: 'var(--ink)',
                    }}
                >
                    Abgemeldet
                </h1>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                    Du wurdest erfolgreich vom Newsletter abgemeldet.
                    Du erhältst keine weiteren E-Mails von uns.
                </p>
                <a
                    href="/"
                    style={{
                        display: 'block',
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: 'var(--ink)',
                        color: 'var(--bg)',
                        borderRadius: 'var(--radius)',
                        textDecoration: 'none',
                        fontFamily: 'Caveat, cursive',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        transition: 'background 0.2s',
                    }}
                >
                    Zur Startseite
                </a>
            </div>
        </main>
    );
}
