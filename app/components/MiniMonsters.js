'use client';

import { useState, useEffect, useRef } from 'react';

const COLLISION_IGNORE = new Set(['html', 'body', 'main', 'div', 'section', 'header', 'footer', 'nav']);

function MiniMonster({ startX, startY, direction, mobile, onDone, src: monsterSrc }) {
    const wrapRef = useRef(null);
    const imgRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const src = new window.Image();
        src.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = src.naturalWidth;
            canvas.height = src.naturalHeight;
            canvas.getContext('2d').drawImage(src, 0, 0);
        };
        src.src = monsterSrc;
    }, []);

    useEffect(() => {
        let alive = true;
        let raf;
        let hoverPaused = false;
        let x = startX;
        let y = startY;
        const angleDeg = mobile ? 0 : (25 + Math.random() * 30) * (Math.PI / 180);
        const speed = 0.38;
        const vx = direction * speed * Math.cos(angleDeg);
        const vy = mobile ? 0 : (Math.random() < 0.5 ? 1 : -1) * speed * Math.sin(angleDeg);

        const wrap = wrapRef.current;
        const img = imgRef.current;
        const canvas = canvasRef.current;

        function setRestMode(on) {
            if (img) img.style.display = on ? 'none' : 'block';
            if (canvas) canvas.style.display = on ? 'block' : 'none';
        }

        function die() {
            if (!alive) return;
            alive = false;
            cancelAnimationFrame(raf);
            if (wrap) { wrap.style.transition = 'opacity 1s ease'; wrap.style.opacity = '0'; }
            setTimeout(onDone, 1000);
        }

        function onMouseEnter() {
            hoverPaused = true;
            cancelAnimationFrame(raf);
            setRestMode(true);
        }

        function onMouseLeave() {
            hoverPaused = false;
            if (!alive) return;
            setRestMode(false);
            raf = requestAnimationFrame(tick);
        }

        function hitTest(px, py) {
            img.style.visibility = 'hidden';
            if (canvas) canvas.style.visibility = 'hidden';
            const el = document.elementFromPoint(px, py);
            img.style.visibility = '';
            if (canvas) canvas.style.visibility = '';
            return el && !COLLISION_IGNORE.has(el.tagName.toLowerCase()) && el.dataset?.monster !== 'true';
        }

        function tick() {
            if (!alive) return;

            x += vx;
            y += vy;
            if (wrap) { wrap.style.left = x + 'px'; wrap.style.top = y + 'px'; }

            const rect = wrap?.getBoundingClientRect();
            if (!rect || rect.width === 0) { raf = requestAnimationFrame(tick); return; }

            if (vx > 0 && rect.right >= window.innerWidth) { die(); return; }
            if (vx < 0 && rect.left <= 0) { die(); return; }
            if (vy < 0 && rect.top <= 0) { die(); return; }
            if (vy > 0 && rect.bottom >= window.innerHeight) { die(); return; }
            const frontX = vx > 0 ? rect.right + 1 : rect.left - 1;

            if (mobile) { raf = requestAnimationFrame(tick); return; }
            const points = [
                [frontX, rect.top + rect.height * 0.25],
                [frontX, rect.top + rect.height * 0.55],
                [frontX, rect.top + rect.height * 0.85],
                [rect.left + rect.width * 0.5, vy > 0 ? rect.bottom + 1 : rect.top - 1],
            ];
            for (const [px, py] of points) {
                if (px < 0 || px > window.innerWidth || py < 0 || py > window.innerHeight) continue;
                if (hitTest(px, py)) { die(); return; }
            }

            raf = requestAnimationFrame(tick);
        }

        wrap?.addEventListener('mouseenter', onMouseEnter);
        wrap?.addEventListener('mouseleave', onMouseLeave);

        if (mobile) setRestMode(true);
        setTimeout(() => { if (alive && wrap) { wrap.style.transition = 'opacity 1.5s ease'; wrap.style.opacity = '1'; } }, 50);
        const walkTimer = setTimeout(() => {
            if (!alive) return;
            if (mobile) setRestMode(false);
            raf = requestAnimationFrame(tick);
        }, mobile ? 5000 : 0);

        return () => {
            alive = false;
            clearTimeout(walkTimer);
            cancelAnimationFrame(raf);
            wrap?.removeEventListener('mouseenter', onMouseEnter);
            wrap?.removeEventListener('mouseleave', onMouseLeave);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            ref={wrapRef}
            style={{
                position: mobile ? 'absolute' : 'fixed',
                left: startX,
                top: startY,
                width: 34,
                opacity: 0,
                pointerEvents: 'auto',
                zIndex: 10,
                transform: direction < 0 ? 'scaleX(-1)' : 'none',
            }}
        >
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'none' }} />
            <img ref={imgRef} src={monsterSrc} data-monster="true" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
    );
}

const MONSTER_SRCS = ['/mini-monster1.png', '/mini-monster2.gif'];
const lastMonsterSrcs = [];

function pickMonsterSrc() {
    const available = lastMonsterSrcs.length >= 2 && lastMonsterSrcs[lastMonsterSrcs.length - 1] === lastMonsterSrcs[lastMonsterSrcs.length - 2]
        ? MONSTER_SRCS.filter(s => s !== lastMonsterSrcs[lastMonsterSrcs.length - 1])
        : MONSTER_SRCS;
    const src = available[Math.floor(Math.random() * available.length)];
    lastMonsterSrcs.push(src);
    if (lastMonsterSrcs.length > 2) lastMonsterSrcs.shift();
    return src;
}

function spawnData(existing = []) {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        const descEl = document.querySelector('[data-description]');
        const mainEl = descEl?.closest('main');
        const descRect = descEl?.getBoundingClientRect();
        const mainRect = mainEl?.getBoundingClientRect();
        const startX = descRect && mainRect ? descRect.left - mainRect.left : 0;
        const startY = descRect && mainRect ? descRect.top - mainRect.top - 22 : window.innerHeight * 0.35;
        return { id: Math.random(), startX, startY: startY + existing.length * 10, direction: 1, mobile: true, src: pickMonsterSrc() };
    }

    const direction = Math.random() < 0.5 ? 1 : -1;
    const monsterSrc = pickMonsterSrc();
    const W = window.innerWidth;
    const H = window.innerHeight;
    const MIN_DIST = 150;

    for (let i = 0; i < 30; i++) {
        const x = Math.random() * (W - 60) + 10;
        const y = Math.random() * (H - 60) + 10;
        const tooClose = existing.some(m => Math.hypot(m.startX - x, m.startY - y) < MIN_DIST);
        if (tooClose) continue;
        const hit = document.elementFromPoint(x + 17, y + 17);
        if (!hit || COLLISION_IGNORE.has(hit.tagName.toLowerCase())) {
            return { id: Math.random(), startX: x, startY: y, direction, mobile: false, src: monsterSrc };
        }
    }
    return { id: Math.random(), startX: Math.random() * (W - 60) + 10, startY: Math.random() * (H - 60) + 10, direction, mobile: false, src: monsterSrc };
}

export default function MiniMonsters() {
    const [monsters, setMonsters] = useState([]);

    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        const timers = isMobile
            ? [setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 600)]
            : [
                setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 600),
                setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 2200),
                setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 4000),
                setTimeout(() => setMonsters(p => [...p, spawnData(p)]), 5800),
            ];
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <>
            {monsters.map(m => (
                <MiniMonster
                    key={m.id}
                    startX={m.startX}
                    startY={m.startY}
                    direction={m.direction}
                    mobile={m.mobile}
                    src={m.src}
                    onDone={() => {
                        setMonsters(prev => prev.filter(x => x.id !== m.id));
                        const delay = m.mobile ? 800 : 1500 + Math.random() * 2000;
                        setTimeout(() => setMonsters(prev => [...prev, spawnData(prev)]), delay);
                    }}
                />
            ))}
        </>
    );
}
