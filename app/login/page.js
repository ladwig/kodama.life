'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './login.module.css';
import { preloadSounds } from '@/lib/sounds';

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
    const [particles, setParticles] = useState([]);
    const particleIdRef = useRef(0);
    const [logoGifs, setLogoGifs] = useState([]);
    const logoGifIdRef = useRef(0);

    const tokenError = searchParams.get('error');
    const idleTimer = useRef(null);
    const wiggling = useRef(false);

    useEffect(() => {
        preloadSounds();
        console.log('%c' + ASCII_LOGO, 'color: #E7E2DF; line-height: 1;');
        console.log('%c those who knock on the same door\n seven times\n will find it was never locked.', 'color: #E7E2DF; font-style: italic;');

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
    const lastGifsRef = useRef([]);

    function handleLogoClick(e) {
        logoClickCount.current += 1;
        clearTimeout(logoClickTimer.current);

        // spawn falling dust particles from logo
        const logoRect = e.currentTarget.getBoundingClientRect();
        const count = 22;
        const newParticles = Array.from({ length: count }, () => {
            const spreadX = (Math.random() - 0.5) * logoRect.width * 0.9;
            const startX = logoRect.left + logoRect.width / 2 + spreadX;
            const startY = logoRect.top + logoRect.height * (0.6 + Math.random() * 0.45);
            return {
                id: ++particleIdRef.current,
                x: startX,
                y: startY,
                dx: (Math.random() - 0.5) * 20,
                dy: 120 + Math.random() * 160, // fall down further
                size: 0.8 + Math.random() * 1.4,
                duration: 1800 + Math.random() * 1200,
                delay: Math.random() * 150,
            };
        });
        setParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
        }, 3200);

        const GIFS = ['/star1.gif', '/star2.gif', '/spiral.gif'];
        const last = lastGifsRef.current;
        const available = last.length >= 2 && last[last.length - 1] === last[last.length - 2]
            ? GIFS.filter(g => g !== last[last.length - 1])
            : GIFS;
        const gifSrc = available[Math.floor(Math.random() * available.length)];
        lastGifsRef.current = [...last.slice(-1), gifSrc];
        const GIF_SIZE = 38;
        const IGNORE = new Set(['html', 'body', 'main', 'div', 'section']);
        let gifX, gifY, placed = false;
        for (let attempt = 0; attempt < 40; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const extra = Math.random() * 60;
            const cx = logoRect.left + logoRect.width / 2 + Math.cos(angle) * (logoRect.width / 2 + 50 + extra);
            const cy = logoRect.top + logoRect.height / 2 + Math.sin(angle) * (logoRect.height / 2 + 50 + extra);
            if (cx < GIF_SIZE || cx > window.innerWidth - GIF_SIZE || cy < GIF_SIZE || cy > window.innerHeight - GIF_SIZE) continue;
            const el = document.elementFromPoint(cx, cy);
            if (el && IGNORE.has(el.tagName.toLowerCase())) {
                gifX = cx; gifY = cy; placed = true; break;
            }
        }
        if (!placed) return;
        const gifId = ++logoGifIdRef.current;
        setLogoGifs(prev => [...prev, { id: gifId, x: gifX, y: gifY, src: gifSrc }]);

        if (logoClickCount.current >= 7) {
            logoClickCount.current = 0;
            sessionStorage.setItem('playSuccess', '1');
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
                sessionStorage.setItem('playSuccess', '1');
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
            {logoGifs.map(g => (
                <img
                    key={g.id}
                    src={g.src}
                    alt=""
                    style={{
                        position: 'fixed',
                        left: g.x,
                        top: g.y,
                        width: 38,
                        height: 38,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 100,
                    }}
                />
            ))}
            {particles.map(p => (
                <div
                    key={p.id}
                    className={styles.dustParticle}
                    style={{
                        left: p.x,
                        top: p.y,
                        width: p.size,
                        height: p.size,
                        '--dx': `${p.dx}px`,
                        '--dy': `${p.dy}px`,
                        animationDuration: `${p.duration}ms`,
                        animationDelay: `${p.delay}ms`,
                    }}
                />
            ))}
            <div className={styles.content}>
                <div className={styles.logoArea}>
                    <Image
                        src="/coppi-logo.jpg"
                        alt="coppi"
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
                            enterKeyHint="go"
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
