'use client';

import { useState } from 'react';
import styles from './NewsletterSignup.module.css';

export default function NewsletterSignup() {
    const [email, setEmail] = useState('');
    const [state, setState] = useState('idle');
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setState('loading');
        setError('');
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error');
            setState('success');
        } catch (err) {
            setError(err.message);
            setState('error');
        }
    }

    if (state === 'success') {
        return (
            <div className={styles.success}>
                Signed up. You&apos;ll hear from us when there&apos;s something to say.
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.box}>
                    <div className={styles.boxInner}>
                        <input
                            type="email"
                            placeholder="Enter email address for updates"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>
                    <button
                        type="submit"
                        className={`${styles.arrow} ${email.length > 0 ? styles.arrowVisible : ''}`}
                        disabled={state === 'loading'}
                    >
                        {state === 'loading' ? '…' : <img src="/arrow.svg" alt="→" width={16} height={15} />}
                    </button>
                </div>
                {state === 'error' && <p className={styles.error}>{error}</p>}
            </form>
        </div>
    );
}
