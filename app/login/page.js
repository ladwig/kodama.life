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
                setError(data.error || 'Falsches Passwort.');
                setLoading(false);
            }
        } catch {
            setError('Verbindungsfehler. Bitte erneut versuchen.');
            setLoading(false);
        }
    }

    return (
        <main className={styles.container}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />

            <div className={styles.card}>
                <div className={styles.logoArea}>
                    <Image src="/kodama.png" alt="Kodama" width={70} height={84} />
                    <h1 className={styles.title}>Kodama</h1>
                    <p className={styles.subtitle}>22. August 2026 · Kiekebusch See</p>
                </div>

                <p className={styles.hint}>Bitte gib das Event-Passwort ein.</p>

                {tokenError === 'invalid_token' && (
                    <div className={styles.errorBox}>
                        Dein Link ist abgelaufen oder ungültig. Bitte melde dich erneut an.
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <input
                        id="password-input"
                        type="password"
                        placeholder="Passwort"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={styles.input}
                        autoFocus
                        required
                    />
                    {error && <p className={styles.errorText}>{error}</p>}
                    <button
                        type="submit"
                        id="login-submit"
                        className={styles.btn}
                        disabled={loading}
                    >
                        {loading ? 'Einen Moment…' : 'Weiter →'}
                    </button>
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
