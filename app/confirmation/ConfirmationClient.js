'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './confirmation.module.css';

export default function ConfirmationClient() {
    const searchParams = useSearchParams();
    const [state, setState] = useState('loading');
    const [message, setMessage] = useState('');
    const [hasToken, setHasToken] = useState(false);

    useEffect(() => {
        const status = searchParams.get('redirect_status');
        const paymentIntentId = searchParams.get('payment_intent');

        if (!status) {
            setState('error');
            setMessage('Kein Zahlungsstatus gefunden.');
            return;
        }

        if (status === 'processing') {
            setState('success');
            setMessage('Deine Zahlung wird verarbeitet. Du erhältst eine Bestätigungs-E-Mail.');
            return;
        }

        if (status !== 'succeeded') {
            setState('error');
            setMessage('Die Zahlung wurde nicht abgeschlossen. Bitte versuche es erneut.');
            return;
        }

        // Poll until webhook has processed the order (up to ~15s)
        let attempts = 0;
        const maxAttempts = 15;

        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch(`/api/confirmation/status?payment_intent=${paymentIntentId}`);
                const data = await res.json();

                if (data.ready) {
                    clearInterval(interval);

                    if (data.token) {
                        setHasToken(data.token);
                    }

                    setState('success');
                    return;
                }
            } catch {
                // ignore, keep polling
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                // Show success anyway
                setState('success');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [searchParams]);

    return (
        <main className={styles.container}>
            <div className={styles.card}>
                {state === 'loading' && (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <p>Bestellung wird verarbeitet…</p>
                    </div>
                )}

                {state === 'success' && (
                    <>
                        <div className={styles.successIcon}>🌿</div>
                        <h1 className={styles.title}>Vielen Dank!</h1>
                        <p className={styles.body}>
                            {message || 'Deine Tickets wurden erfolgreich gebucht. Wir haben dir eine Bestätigungs-E-Mail geschickt.'}
                        </p>
                        {!message && (
                            <p className={styles.hint}>
                                Über den Link in der E-Mail kannst du deine Tickets jederzeit,
                                auch auf anderen Geräten, aufrufen.
                            </p>
                        )}
                        <div className={styles.actions}>
                            {hasToken ? (
                                <button
                                    onClick={() => window.location.href = `/api/auth/verify?token=${hasToken}`}
                                    className={styles.btnPrimary}
                                >
                                    Meine Tickets ansehen
                                </button>
                            ) : (
                                <Link href="/" className={styles.btnPrimary}>
                                    Zur Startseite
                                </Link>
                            )}
                            <Link href="/" className={styles.btnSecondary}>
                                Zurück zur Startseite
                            </Link>
                        </div>
                    </>
                )}

                {state === 'error' && (
                    <>
                        <div className={styles.errorIcon}>⚠️</div>
                        <h1 className={styles.title}>Etwas ist schiefgelaufen</h1>
                        <p className={styles.body}>{message}</p>
                        <div className={styles.actions}>
                            <Link href="/tickets" className={styles.btnPrimary}>
                                Erneut versuchen
                            </Link>
                            <Link href="/" className={styles.btnSecondary}>
                                Startseite
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
