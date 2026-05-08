'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './login.module.css';

const ASCII_LOGO = `
                                   ██                                         ███
                             █████████                                     ███████             █████       ██
                         ████████████      ██████                       █████████████           ███████    ███
                      ██████     ███    ██████                        █████       ████              ██████  ██  ██
                     █████      ██      ██  ██        ████████       ███    ████   ██                       ██████████
                    █████████████                   ████  ████      ███   ███████  ██  ██  ████              ██   █████
                     ███████   ██████    ██   ████  █████         ████   ██   ██  ██  ██   ████       █████  ███     ████
                                ██████   ██   █████  ████  ██    ████   █    ██  ███ ███  ██          █████   ██     ███
                      ████████  ██████   ██  ██████    ██████    ███  ███   ██  ██  ███████   █████  ██        ███
                   ██████████   █████    ██  ██ ████   █████    ██   █████ ██  ██  ███████  ███  ██   ██████    ██
                  █████   ██    ████  ███    █    ███         ███  ██████ █   ███   ██    ████████       ████   ████
                ██████       ██████  ████  █████████        █████  ███   ██   █████       ██       ████   ███   ██████
              ██████       ████████   █    ████████        ██████      ███      ████     ████████████████████    ██████
             ██████      ████████        ██████            ████████ ██████        █████    ██████    ██████        ████
             █████████████████         █████                  ██████████            ██                ████        ████
                ████████████                                   ████
`;

function LoginForm() {
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [logoShaking, setLogoShaking] = useState(false);
    const [arrowWiggling, setArrowWiggling] = useState(false);

    const tokenError = searchParams.get('error');
    const idleTimer = useRef(null);
    const wiggling = useRef(false);

    useEffect(() => {
        console.log('%c' + ASCII_LOGO, 'color: #8CB2AB; line-height: 1;');
        console.log('%c those who knock on the same door\n seven times\n will find it was never locked.', 'color: #8CB2AB; font-style: italic;');

        idleTimer.current = setTimeout(() => {
            if (!wiggling.current) {
                wiggling.current = true;
                setArrowWiggling(true);
            }
        }, 30000);

        return () => clearTimeout(idleTimer.current);
    }, []);

    function handleInputChange(e) {
        setPassword(e.target.value);
        // stop wiggling once they start typing
        if (arrowWiggling) {
            setArrowWiggling(false);
            wiggling.current = false;
        }
    }

    const logoClickCount = useRef(0);
    const logoClickTimer = useRef(null);

    function handleLogoClick() {
        logoClickCount.current += 1;
        clearTimeout(logoClickTimer.current);
        if (logoClickCount.current >= 7) {
            logoClickCount.current = 0;
            window.location.href = '/api/auth/magic';
            return;
        }
        logoClickTimer.current = setTimeout(() => {
            logoClickCount.current = 0;
        }, 10000);
    }

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
                window.location.href = '/';
            } else {
                const data = await res.json();
                setError(data.error || 'Incorrect password.');
                setLoading(false);
                setLogoShaking(true);
                setTimeout(() => setLogoShaking(false), 500);
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
                    <Image
                        src="/sidequest-logo.svg"
                        alt="Sidequest"
                        width={340}
                        height={102}
                        priority
                        onClick={handleLogoClick}
                        style={{ cursor: 'pointer' }}
                        className={logoShaking ? styles.logoShake : ''}
                    />
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
                            onChange={handleInputChange}
                            className={styles.input}
                            required
                        />
                        <button
                            type="submit"
                            id="login-submit"
                            className={`${styles.arrowBtn} ${password.length > 0 ? styles.visible : ''} ${arrowWiggling && password.length > 0 ? styles.wiggle : ''}`}
                            disabled={loading}
                            aria-label="Submit"
                        >
                            <img src="/arrow.svg" alt="" width={16} height={15} />
                        </button>
                    </div>
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
