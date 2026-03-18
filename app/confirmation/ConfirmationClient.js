'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './confirmation.module.css';

export default function ConfirmationClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [state, setState] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Stripe redirects here with ?payment_intent=...&payment_intent_client_secret=...&redirect_status=succeeded
        const status = searchParams.get('redirect_status');
        const paymentIntentId = searchParams.get('payment_intent');

        if (!status) {
            setState('error');
            setMessage('Kein Zahlungsstatus gefunden.');
            return;
        }

        if (status === 'succeeded') {
            // Poll until webhook has processed (up to ~10s)
            let attempts = 0;
            const maxAttempts = 10;
            const interval = setInterval(async () => {
                attempts++;
                try {
                    const res = await fetch(`/api/confirmation/status?payment_intent=${paymentIntentId}`);
                    const data = await res.json();
                    if (data.ready) {
                        clearInterval(interval);
                        setState('success');
                    }
                } catch {
                    // ignore
                }
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    // Show success anyway – webhook may still process in background
                    setState('success');
                }
            }, 1000);

            return () => clearInterval(interval);
        } else if (status === 'processing') {
            setState('success');
            setMessage('Deine Zahlung wird verarbeitet. Du erhältst eine Bestätigungs-E-Mail.');
        } else {
            setState('error');
            setMessage('Die Zahlung wurde nicht abgeschlossen. Bitte versuche es erneut.');
        }
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
                            Deine Tickets wurden erfolgreich gebucht.{' '}
                            {message || 'Wir haben dir eine Bestätigungs-E-Mail mit deinen Tickets und einem Link zu dieser Seite geschickt.'}
                        </p>
                        <p className={styles.hint}>
                            Über den Link in der E-Mail kannst du deine Tickets jederzeit,
                            auch auf anderen Geräten, aufrufen.
                        </p>
                        <div className={styles.actions}>
                            <Link href="/mein-ticket" className={styles.btnPrimary}>
                                Meine Tickets ansehen
                            </Link>
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
