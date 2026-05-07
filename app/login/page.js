'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './login.module.css';

function LoginForm() {
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const tokenError = searchParams.get('error');

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                // Full hard-navigation so the fresh cookie is sent with the next request
                window.location.href = '/';
            } else {
                const data = await res.json();
                setError(data.error || 'Incorrect password.');
                setLoading(false);
            }
        } catch {
            setError('Connection error. Please try again.');
            setLoading(false);
        }
    }

    return (
        <main className={styles.container}>
            <div className={styles.content}>
                <div className={styles.logoArea}>
                    <Image src="/sidequest-logo.svg" alt="Sidequest" width={340} height={102} priority />
                </div>

                {tokenError === 'invalid_token' && (
                    <div className={styles.errorBox}>
                        Your link has expired or is invalid. Please sign in again.
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
                    <div className={styles.inputWrapper}>
                        <input
                            id="password-input"
                            type="text"
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            data-form-type="other"
                            placeholder="Super secret code..?"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.input}
                            required
                        />
                        <button
                            type="submit"
                            id="login-submit"
                            className={`${styles.arrowBtn} ${password.length > 0 ? styles.visible : ''}`}
                            disabled={loading}
                            aria-label="Submit"
                        >
                            <img src="/arrow.svg" alt="" width={16} height={15} />
                        </button>
                    </div>
                    {error && <p className={styles.errorText}>something&apos;s wrong.</p>}
                </form>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
