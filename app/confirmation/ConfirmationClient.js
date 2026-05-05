'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './confirmation.module.css';

export default function ConfirmationClient() {
    const searchParams = useSearchParams();
    const [state, setState] = useState('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const status = searchParams.get('redirect_status');
        const paymentIntentId = searchParams.get('payment_intent');

        if (!status) {
            setState('error');
            setMessage('No payment status found.');
            return;
        }

        if (status === 'processing') {
            setState('success');
            setMessage('Your payment is being processed. You will receive a confirmation email.');
            return;
        }

        if (status !== 'succeeded') {
            setState('error');
            setMessage('The payment was not completed. Please try again.');
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

                if (data.db_error) {
                    clearInterval(interval);
                    setState('db_error');
                    return;
                }

                if (data.ready) {
                    clearInterval(interval);

                    if (data.token) {
                        await fetch('/api/auth/set-cookie', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: data.token }),
                        });
                        window.location.href = '/';
                        return;
                    }

                    setState('success');
                    return;
                }
            } catch {
                // ignore, keep polling
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                setState('timeout');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [searchParams]);

    return (
        <main className={styles.container}>
            <div className={styles.content}>
                {state === 'loading' && (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <p>Processing your order…</p>
                    </div>
                )}

                {state === 'success' && (
                    <>
                        <h1 className={styles.title}>Thank you!</h1>
                        <p className={styles.body}>
                            {message || "Your tickets have been successfully booked. We've sent you a confirmation email. You can access your tickets at any time, on any device, via the link in the email."}
                        </p>
                        <div className={styles.actions}>
                            <Link href="/" className="btn-raw btn-raw-full">
                                Back to Home
                            </Link>
                        </div>
                    </>
                )}

                {state === 'timeout' && (
                    <>
                        <h1 className={styles.title}>Payment received</h1>
                        <p className={styles.body}>
                            Your payment went through but we're still processing your order. You'll receive a confirmation email with your tickets shortly.
                        </p>
                        <div className={styles.actions}>
                            <Link href="/" className="btn-raw btn-raw-full">
                                Back to Home
                            </Link>
                        </div>
                    </>
                )}

                {state === 'db_error' && (
                    <>
                        <h1 className={styles.title}>Payment received</h1>
                        <p className={styles.body}>
                            Your payment went through but we're having trouble confirming your order right now. You'll receive a confirmation email with your tickets shortly. If you have any issues, please reach out.
                        </p>
                        <div className={styles.actions}>
                            <Link href="/" className="btn-raw btn-raw-full">
                                Back to Home
                            </Link>
                        </div>
                    </>
                )}

                {state === 'error' && (
                    <>
                        <div className={styles.errorIcon}>⚠️</div>
                        <h1 className={styles.title}>Something went wrong</h1>
                        <p className={styles.body}>{message}</p>
                        <div className={styles.actions}>
                            <Link href="/tickets" className="btn-raw btn-raw-full">
                                Try Again
                            </Link>
                            <Link href="/" className="btn-raw btn-raw-full">
                                Home
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
