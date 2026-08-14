'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

// One shared AudioContext, resumed on a user gesture (required on iOS).
let _audioCtx = null;
function getAudioCtx() {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!_audioCtx) { try { _audioCtx = new AC(); } catch { return null; } }
    return _audioCtx;
}
function unlockAudio() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    try { // silent blip fully unlocks iOS
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.02);
    } catch {}
}
function playTone(freq, duration = 0.14, type = 'sine') {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch {}
}
function scanBeep(kind) {
    if (kind === 'success') { playTone(880, 0.11); setTimeout(() => playTone(1320, 0.12), 85); }
    else { playTone(200, 0.35, 'square'); }
}

// Fullscreen on-site door tool: scanner + guestlist (manual check-in).
// Reuses the same chef password, APIs, and localStorage cache/queue as /chef.
export default function ScannerPage() {
    const [password, setPassword] = useState('');
    const [authorized, setAuthorized] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [tab, setTab] = useState('scanner'); // 'scanner' | 'guestlist'
    const [guestlist, setGuestlist] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingGuestlist, setLoadingGuestlist] = useState(false);

    const [isOnline, setIsOnline] = useState(true);
    const [syncQueue, setSyncQueue] = useState([]);

    const [scannedTicket, setScannedTicket] = useState(null);
    const [scanError, setScanError] = useState('');
    const [processing, setProcessing] = useState(false);
    const [scanCooldown, setScanCooldown] = useState(false);
    const [status, setStatus] = useState('');

    const scannerInstRef = useRef(null);
    const lastScannedCode = useRef('');
    const isScanApiCallInProgress = useRef(false);

    const pw = () => password || (typeof window !== 'undefined' ? localStorage.getItem('chef_pw') : '') || '';

    const updateGuestlist = (list) => {
        setGuestlist(list);
        try { localStorage.setItem('kodama_guestlist', JSON.stringify(list)); } catch {}
    };

    const fetchGuestlist = async (providedPw) => {
        const p = (typeof providedPw === 'string') ? providedPw : pw();
        if (!p) return;
        setLoadingGuestlist(true);
        try {
            const res = await fetch('/api/chef/guestlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: p }),
            });
            const data = await res.json();
            if (res.ok) updateGuestlist(data.tickets || []);
        } catch {} finally {
            setLoadingGuestlist(false);
        }
    };

    // ── Offline sync queue ──
    const attemptSync = async () => {
        if (!navigator.onLine) return;
        const cached = localStorage.getItem('kodama_sync_queue');
        if (!cached) return;
        let queue = [];
        try { queue = JSON.parse(cached); } catch { return; }
        if (queue.length === 0) return;
        const p = pw();
        if (!p) return;

        const remaining = [];
        for (const item of queue) {
            try {
                const res = await fetch('/api/chef/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: p, ticketCode: item.ticketCode, action: 'checkin', checkedIn: item.checkedIn }),
                });
                if (!res.ok) {
                    if (res.status >= 500) remaining.push(item);
                    else if (res.status === 401) return;
                }
            } catch {
                remaining.push(item);
            }
        }
        setSyncQueue(remaining);
        localStorage.setItem('kodama_sync_queue', JSON.stringify(remaining));
    };

    const queueSyncAction = (ticketCode, checkedIn) => {
        setSyncQueue((prev) => {
            const clean = prev.filter((i) => i.ticketCode !== ticketCode);
            const next = [...clean, { ticketCode, checkedIn, timestamp: Date.now() }];
            localStorage.setItem('kodama_sync_queue', JSON.stringify(next));
            return next;
        });
        if (navigator.onLine) setTimeout(attemptSync, 800);
    };

    // ── Init: restore session, queue, online listeners ──
    useEffect(() => {
        const savedPw = localStorage.getItem('chef_pw');
        if (savedPw) {
            setPassword(savedPw);
            setAuthorized(true);
            setTimeout(() => fetchGuestlist(savedPw), 300);
        }
        try {
            const cachedList = localStorage.getItem('kodama_guestlist');
            if (cachedList) setGuestlist(JSON.parse(cachedList));
            const cachedQueue = localStorage.getItem('kodama_sync_queue');
            if (cachedQueue) setSyncQueue(JSON.parse(cachedQueue));
        } catch {}

        setIsOnline(navigator.onLine);
        const onOnline = () => { setIsOnline(true); setTimeout(() => { attemptSync(); fetchGuestlist(); }, 800); };
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    // Unlock audio on any tap/click (iOS needs a gesture to enable sound)
    useEffect(() => {
        const unlock = () => unlockAudio();
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('touchend', unlock);
        return () => {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('touchend', unlock);
        };
    }, []);

    // Poll roster + flush queue every 60s while online
    useEffect(() => {
        if (!authorized) return;
        const id = setInterval(() => {
            if (!navigator.onLine) return;
            fetchGuestlist();
            attemptSync();
        }, 60000);
        return () => clearInterval(id);
    }, [authorized]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        try {
            const res = await fetch('/api/chef/guestlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('chef_pw', password);
                setAuthorized(true);
                updateGuestlist(data.tickets || []);
            } else {
                setLoginError('Wrong password');
            }
        } catch {
            setLoginError('Connection error');
        } finally {
            setLoginLoading(false);
        }
    };

    // ── Scanner ──
    const startScanner = () => {
        if (!document.getElementById('qr-reader') || scannerInstRef.current) return;
        try {
            const scanner = new Html5QrcodeScanner('qr-reader', {
                fps: 10,
                qrbox: { width: 260, height: 260 },
                aspectRatio: 1.0,
                rememberLastUsedCamera: true,
                videoConstraints: { facingMode: { ideal: 'environment' } },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], // no "scan image file" option
            }, false);
            scanner.render(onScanSuccess, () => {});
            scannerInstRef.current = scanner;
        } catch (e) {
            setScanError('Could not access camera. Check permissions.');
        }
    };

    const stopScanner = () => {
        if (scannerInstRef.current) {
            scannerInstRef.current.clear().catch(() => {});
            scannerInstRef.current = null;
        }
    };

    useEffect(() => {
        if (!authorized) return;
        if (tab === 'scanner') {
            const t = setTimeout(startScanner, 200);
            return () => { clearTimeout(t); stopScanner(); };
        }
        stopScanner();
        setScannedTicket(null);
        setScanError('');
    }, [tab, authorized]);

    useEffect(() => () => stopScanner(), []);

    async function onScanSuccess(decodedText) {
        if (processing || scannedTicket || scanCooldown || isScanApiCallInProgress.current) return;

        let ticketCode = decodedText;
        if (decodedText.includes('ticket_code=')) {
            try { ticketCode = new URL(decodedText).searchParams.get('ticket_code'); } catch {}
        }
        if (!ticketCode) return;
        if (lastScannedCode.current === ticketCode) return;

        isScanApiCallInProgress.current = true;
        lastScannedCode.current = ticketCode;

        // Local-first (roster cache already excludes non-paid)
        const local = guestlist.find((t) => t.ticket_code === ticketCode);
        if (local) {
            setScannedTicket(local);
            setScanError('');
            scanBeep(local.checked_in ? 'error' : 'success');
            isScanApiCallInProgress.current = false;
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch('/api/chef/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw(), ticketCode, action: 'verify' }),
            });
            const data = await res.json();
            if (res.ok) {
                setScannedTicket(data.ticket);
                setScanError('');
                scanBeep(data.ticket.checked_in ? 'error' : 'success');
            } else {
                setScanError(data.error || 'Invalid ticket');
                setScannedTicket(null);
                lastScannedCode.current = '';
                scanBeep('error');
            }
        } catch {
            setScanError('Connection error. Try again.');
            lastScannedCode.current = '';
            scanBeep('error');
        } finally {
            setProcessing(false);
            isScanApiCallInProgress.current = false;
        }
    }

    const resetScanner = () => {
        setScannedTicket(null);
        setScanError('');
        lastScannedCode.current = '';
        setScanCooldown(true);
        setTimeout(() => setScanCooldown(false), 700);
    };

    const handleCheckInAndNext = () => {
        if (!scannedTicket) return;
        const t = scannedTicket;
        const at = new Date().toISOString();
        updateGuestlist(guestlist.map((x) => x.ticket_code === t.ticket_code ? { ...x, checked_in: true, checked_in_at: at } : x));
        resetScanner();
        setStatus(`Checked in ${t.holder_name}`);
        setTimeout(() => setStatus(''), 2000);
        queueSyncAction(t.ticket_code, true);
    };

    const handleManualCheckIn = (ticket) => {
        const next = !ticket.checked_in;
        if (!window.confirm(next ? `Check in ${ticket.holder_name}?` : `Uncheck ${ticket.holder_name}?`)) return;
        const at = next ? new Date().toISOString() : null;
        updateGuestlist(guestlist.map((x) => x.id === ticket.id ? { ...x, checked_in: next, checked_in_at: at } : x));
        setStatus(next ? `Checked in ${ticket.holder_name}` : `Unchecked ${ticket.holder_name}`);
        setTimeout(() => setStatus(''), 2000);
        queueSyncAction(ticket.ticket_code, next);
    };

    // ── Render ──
    if (!authorized) {
        return (
            <main style={S.loginMain}>
                <form onSubmit={handleLogin} style={S.loginForm}>
                    <h1 style={S.loginTitle}>Door Scanner</h1>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Chef password" style={S.loginInput} autoFocus />
                    {loginError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{loginError}</div>}
                    <button type="submit" disabled={loginLoading} style={S.loginBtn}>
                        {loginLoading ? '…' : 'Enter'}
                    </button>
                </form>
            </main>
        );
    }

    const checkedInCount = guestlist.filter((t) => t.checked_in).length;
    const q = searchTerm.toLowerCase();
    const filtered = guestlist.filter((t) =>
        t.holder_name?.toLowerCase().includes(q) || t.ticket_code?.toLowerCase().includes(q)
    );

    return (
        <main style={S.main}>
            {/* Network dot */}
            <div style={S.netDot(isOnline, syncQueue.length)}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: isOnline ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                {!isOnline && <span style={{ color: '#ef4444' }}>Offline</span>}
                {syncQueue.length > 0 && <span style={{ color: '#f59e0b' }}>{syncQueue.length} pending</span>}
            </div>

            <div style={S.body}>
                {tab === 'scanner' && (
                    <div style={S.scannerWrap}>
                        <div id="qr-reader" style={{ width: '100%', display: (scannedTicket || scanError) ? 'none' : 'block' }} />

                        {scanError && (
                            <div style={S.flash('#dc2626')}>
                                <div style={{ fontSize: '3rem' }}>⚠️</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}>{scanError}</div>
                                <button onClick={resetScanner} style={S.flashBtn('#dc2626')}>Scan Again</button>
                            </div>
                        )}

                        {scannedTicket && (
                            <div style={S.flash(scannedTicket.checked_in ? '#dc2626' : '#16a34a')}>
                                <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    {scannedTicket.checked_in ? '⛔ ALREADY CHECKED IN' : '✓ VALID TICKET'}
                                </div>
                                <div style={{ fontSize: 'clamp(2.4rem, 10vw, 4rem)', fontWeight: 800, textAlign: 'center', lineHeight: 1.05 }}>{scannedTicket.holder_name}</div>
                                <div style={{ opacity: 0.8, fontFamily: 'monospace' }}>{scannedTicket.ticket_code}</div>
                                {scannedTicket.checked_in && scannedTicket.checked_in_at && (
                                    <div style={{ opacity: 0.85 }}>at {new Date(scannedTicket.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                )}
                                {!scannedTicket.checked_in ? (
                                    <>
                                        <button onClick={handleCheckInAndNext} disabled={processing} style={S.flashBtn('#16a34a')}>
                                            {processing ? '…' : '✅ Check In & Next'}
                                        </button>
                                        <button onClick={resetScanner} style={S.flashGhost}>Back</button>
                                    </>
                                ) : (
                                    <button onClick={resetScanner} style={S.flashBtn('#dc2626')}>Next Scan</button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'guestlist' && (
                    <div style={S.listWrap}>
                        <div style={S.listTop}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{checkedInCount}/{guestlist.length} checked in</div>
                            <button onClick={() => fetchGuestlist()} disabled={loadingGuestlist} style={S.refreshBtn}>
                                {loadingGuestlist ? '…' : '↻ Refresh'}
                            </button>
                        </div>
                        <input type="text" placeholder="Search name or code…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={S.search} />
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {filtered.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No tickets</div>
                            ) : filtered.map((t) => (
                                <button key={t.id} onClick={() => handleManualCheckIn(t)} style={S.listRow(t.checked_in)}>
                                    <span style={{ fontWeight: 600 }}>{t.holder_name}</span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', opacity: 0.6, flex: 1, textAlign: 'right', marginRight: '0.5rem' }}>{t.ticket_code}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: t.checked_in ? '#16a34a' : '#999' }}>
                                        {t.checked_in ? '✓ IN' : 'OPEN'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {status && <div style={S.toast}>{status}</div>}

            {/* Bottom tabs */}
            <div style={S.tabBar}>
                <button onClick={() => setTab('scanner')} style={S.tabBtn(tab === 'scanner')}>Scanner</button>
                <button onClick={() => setTab('guestlist')} style={S.tabBtn(tab === 'guestlist')}>Guestlist</button>
            </div>
        </main>
    );
}

const S = {
    loginMain: { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0eee6', padding: '1.5rem' },
    loginForm: { display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 300 },
    loginTitle: { fontFamily: "'Funnel Display', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', margin: 0 },
    loginInput: { padding: '0.9rem', border: '2px solid #000', fontSize: '1rem', background: 'transparent' },
    loginBtn: { padding: '0.9rem', background: '#000', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' },

    main: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#000', color: '#fff' },
    netDot: (online, pending) => ({ position: 'absolute', top: 8, right: 10, zIndex: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, padding: (online && !pending) ? 4 : '4px 8px', borderRadius: 999, background: (online && !pending) ? 'transparent' : 'rgba(255,255,255,0.12)' }),
    body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },

    scannerWrap: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem', background: '#fff', color: '#000' },
    flash: (bg) => ({ position: 'absolute', inset: 0, marginBottom: 64, background: bg, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '1.5rem', zIndex: 10 }),
    flashBtn: (bg) => ({ background: '#fff', color: bg, border: 'none', padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 800, borderRadius: 8, cursor: 'pointer', marginTop: '0.5rem' }),
    flashGhost: { background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.6)', padding: '0.7rem 1.5rem', fontWeight: 600, borderRadius: 8, cursor: 'pointer' },

    listWrap: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff', color: '#000', padding: '0.75rem' },
    listTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
    refreshBtn: { background: '#000', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' },
    search: { padding: '0.7rem', border: '2px solid #000', fontSize: '1rem', marginBottom: '0.5rem', width: '100%', boxSizing: 'border-box' },
    listRow: (inChecked) => ({ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.85rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', background: inChecked ? 'rgba(22,163,74,0.08)' : 'transparent', border: 'none', borderLeft: inChecked ? '3px solid #16a34a' : '3px solid transparent', textAlign: 'left', cursor: 'pointer', fontSize: '0.95rem' }),

    toast: { position: 'absolute', bottom: 76, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: 999, fontSize: '0.85rem', fontWeight: 600, zIndex: 30 },

    tabBar: { display: 'flex', borderTop: '1px solid rgba(255,255,255,0.15)', background: '#000' },
    tabBtn: (active) => ({ flex: 1, padding: '1rem', background: active ? '#fff' : 'transparent', color: active ? '#000' : '#fff', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }),
};
