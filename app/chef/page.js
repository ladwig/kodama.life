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
    try {
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

export default function ChefPage() {
    const [password, setPassword] = useState('');
    const [authorized, setAuthorized] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    
    // Tabs
    const [activeTab, setActiveTab] = useState('magic');
    const [guestlist, setGuestlist] = useState([]);
    const [loadingGuestlist, setLoadingGuestlist] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Offline Sync Config
    const [isOnline, setIsOnline] = useState(true);
    const [syncQueue, setSyncQueue] = useState([]);

    const updateGuestlist = (newList) => {
        setGuestlist(newList);
        guestlistRef.current = newList;
        localStorage.setItem('kodama_guestlist', JSON.stringify(newList));
    };

    // Scanner
    const [scannedTicket, setScannedTicket] = useState(null);
    const [scanError, setScanError] = useState('');
    const [scanning, setScanning] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scanCooldown, setScanCooldown] = useState(false);
    const scannerInstRef = useRef(null);
    const isScanApiCallInProgress = useRef(false);
    const lastScannedCode = useRef('');
    // Refs mirror state so the long-lived scanner callback reads live values
    const guestlistRef = useRef([]);
    const scannedRef = useRef(false);
    const cooldownRef = useRef(false);
    useEffect(() => { guestlistRef.current = guestlist; }, [guestlist]);

    // Initial check for session and cached guestlist
    useEffect(() => {
        const savedPw = localStorage.getItem('chef_pw');
        const cachedGuestlist = localStorage.getItem('kodama_guestlist');
        
        if (savedPw) {
            setPassword(savedPw);
            setAuthorized(true);
            // Fetch latest guestlist in background for scanner
            setTimeout(() => fetchGuestlist(savedPw), 500);
        }
        
        if (cachedGuestlist) {
            try {
                setGuestlist(JSON.parse(cachedGuestlist));
            } catch (e) {
                console.error('Failed to parse cached guestlist', e);
            }
        }

        // Offline Sync Init
        setIsOnline(navigator.onLine);
        const cachedQueue = localStorage.getItem('kodama_sync_queue');
        if (cachedQueue) {
            try { setSyncQueue(JSON.parse(cachedQueue)); } catch(e) {}
        }

        const handleOnline = () => {
            setIsOnline(true);
            setTimeout(() => { attemptSync(); fetchGuestlist(); }, 1000);
        }
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // While signed in and online, keep the roster fresh and flush the queue (every 60s).
    useEffect(() => {
        if (!authorized) return;
        const id = setInterval(() => {
            if (!navigator.onLine) return;
            fetchGuestlist();
            attemptSync();
        }, 60000);
        return () => clearInterval(id);
    }, [authorized]);

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

    const attemptSync = async () => {
        if (!navigator.onLine) return;
        
        const cached = localStorage.getItem('kodama_sync_queue');
        if (!cached) return;
        
        let currentQueue = [];
        try { currentQueue = JSON.parse(cached); } catch(e) { return; }
        if (currentQueue.length === 0) return;

        const actualPw = localStorage.getItem('chef_pw');
        if (!actualPw) return;

        const remainingQueue = [];
        for (const item of currentQueue) {
            try {
                const res = await fetch('/api/chef/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        password: actualPw,
                        ticketCode: item.ticketCode,
                        action: 'checkin',
                        checkedIn: item.checkedIn
                    })
                });
                
                if (!res.ok) {
                    if (res.status >= 500) {
                        remainingQueue.push(item);
                    } else if (res.status === 401) {
                        return; // Stop on auth error
                    }
                }
            } catch (err) {
                remainingQueue.push(item);
            }
        }

        setSyncQueue(remainingQueue);
        localStorage.setItem('kodama_sync_queue', JSON.stringify(remainingQueue));
    };

    const queueSyncAction = (ticketCode, checkedIn) => {
        setSyncQueue(prev => {
            const cleanQueue = prev.filter(i => i.ticketCode !== ticketCode);
            const newQueue = [...cleanQueue, { ticketCode, checkedIn, timestamp: Date.now() }];
            localStorage.setItem('kodama_sync_queue', JSON.stringify(newQueue));
            return newQueue;
        });
        
        if (navigator.onLine) {
            setTimeout(attemptSync, 1000);
        }
    };

    // Offline ticket form
    const [price, setPrice] = useState(30);
    const [status, setStatus] = useState('');

    // Magic links form
    const [magicPrice, setMagicPrice] = useState('30');
    const [magicCount, setMagicCount] = useState('1');
    const [magicUses, setMagicUses] = useState('1');
    const [magicEmail, setMagicEmail] = useState('');
    const [magicSendEmail, setMagicSendEmail] = useState(false);
    const [magicLoading, setMagicLoading] = useState(false);
    const [magicLinks, setMagicLinks] = useState([]);
    const [magicStatus, setMagicStatus] = useState('');
    const [magicCopiedIdx, setMagicCopiedIdx] = useState(null);
    const [magicAllCopied, setMagicAllCopied] = useState(false);
    const [magicLabel, setMagicLabel] = useState('');
    const [magicLinksList, setMagicLinksList] = useState([]);
    const [magicListCopiedJti, setMagicListCopiedJti] = useState(null);

    const fetchMagicLinksList = async (providedPw) => {
        const pw = (typeof providedPw === 'string') ? providedPw : (password || localStorage.getItem('chef_pw'));
        try {
            const res = await fetch('/api/chef/magic-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw }),
            });
            const data = await res.json();
            if (res.ok) setMagicLinksList(data.links || []);
        } catch {}
    };

    const copyMagicListLink = async (url, jti) => {
        try {
            await navigator.clipboard.writeText(url);
            setMagicListCopiedJti(jti);
            setTimeout(() => setMagicListCopiedJti(null), 1500);
        } catch {}
    };

    const removeMagicLink = async (jti, label) => {
        if (!confirm(`Really delete "${label || 'this link'}"? It will stop working immediately and can't be undone.`)) return;
        try {
            const res = await fetch('/api/chef/magic-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, action: 'remove', jti }),
            });
            const data = await res.json();
            if (res.ok) fetchMagicLinksList();
            else alert(data.error || 'Failed to remove.');
        } catch (err) {
            alert(err.message);
        }
    };

    // Guestlist links (free-ticket links, listed under the magic links form)
    const [glLabel, setGlLabel] = useState('');
    const [glCount, setGlCount] = useState('5');
    const [glLoading, setGlLoading] = useState(false);
    const [glStatus, setGlStatus] = useState('');
    const [glList, setGlList] = useState([]);
    const [glCopiedJti, setGlCopiedJti] = useState(null);

    const fetchGuestlistLinks = async (providedPw) => {
        const pw = (typeof providedPw === 'string') ? providedPw : (password || localStorage.getItem('chef_pw'));
        try {
            const res = await fetch('/api/chef/guestlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw }),
            });
            const data = await res.json();
            if (res.ok) setGlList(data.guestlists || []);
        } catch {}
    };

    const handleCreateGuestlist = async (e) => {
        e.preventDefault();
        setGlStatus('');
        setGlLoading(true);
        try {
            const res = await fetch('/api/chef/guestlist-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, label: glLabel, count: parseInt(glCount, 10) }),
            });
            const data = await res.json();
            if (res.ok) {
                setGlStatus(`Created guestlist for ${data.label}`);
                setGlLabel('');
                fetchGuestlistLinks();
            } else {
                setGlStatus(`Error: ${data.error}`);
                if (res.status === 401) setAuthorized(false);
            }
        } catch (err) {
            setGlStatus(`Error: ${err.message}`);
        } finally {
            setGlLoading(false);
        }
    };

    const copyGuestlistLink = async (url, jti) => {
        try {
            await navigator.clipboard.writeText(url);
            setGlCopiedJti(jti);
            setTimeout(() => setGlCopiedJti(null), 1500);
        } catch {}
    };

    const changeGuestlistMax = async (jti, currentMax) => {
        const input = prompt('New total number of tickets for this guestlist:', String(currentMax));
        if (input === null) return;
        const newMax = parseInt(input, 10);
        if (!newMax || newMax < 1) return;
        try {
            const res = await fetch('/api/chef/guestlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, action: 'setMax', jti, max: newMax }),
            });
            const data = await res.json();
            if (res.ok) fetchGuestlistLinks();
            else alert(data.error || 'Failed to update.');
        } catch (err) {
            alert(err.message);
        }
    };

    const removeGuestlistLink = async (jti, label) => {
        if (!confirm(`Deactivate the guestlist "${label || 'this link'}"? It will stop working immediately and can't be undone.`)) return;
        try {
            const res = await fetch('/api/chef/guestlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, action: 'remove', jti }),
            });
            const data = await res.json();
            if (res.ok) fetchGuestlistLinks();
            else alert(data.error || 'Failed to deactivate.');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleGenerateLinks = async (e) => {
        e.preventDefault();
        setMagicStatus('');
        setMagicLinks([]);
        setMagicLoading(true);
        try {
            const res = await fetch('/api/chef/magic-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    price: magicPrice,
                    count: parseInt(magicCount, 10),
                    uses: parseInt(magicUses, 10),
                    label: magicLabel || undefined,
                    email: magicEmail || undefined,
                    send_email: magicSendEmail && !!magicEmail,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMagicLinks(data.links);
                setMagicLabel('');
                fetchMagicLinksList();
                const sent = magicSendEmail && magicEmail;
                setMagicStatus(sent ? `Links created and emailed to ${magicEmail}` : 'Links created');
                if (data.links.length > 0) {
                    try {
                        sessionStorage.setItem('magic_links_last', JSON.stringify(data.links));
                    } catch {}
                }
            } else {
                setMagicStatus(`Error: ${data.error}`);
                if (res.status === 401) setAuthorized(false);
            }
        } catch (err) {
            setMagicStatus(`Error: ${err.message}`);
        } finally {
            setMagicLoading(false);
        }
    };

    const copyMagicLink = async (url, idx) => {
        try {
            await navigator.clipboard.writeText(url);
            setMagicCopiedIdx(idx);
            setTimeout(() => setMagicCopiedIdx(null), 1500);
        } catch {}
    };

    const copyAllLinks = async () => {
        try {
            const text = magicLinks.map(l => l.url).join('\n');
            await navigator.clipboard.writeText(text);
            setMagicAllCopied(true);
            setTimeout(() => setMagicAllCopied(false), 1500);
        } catch {}
    };

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
                updateGuestlist(data.tickets);
            } else {
                setLoginError('Wrong password');
            }
        } catch {
            setLoginError('Connection error');
        } finally {
            setLoginLoading(false);
        }
    };

    const fetchGuestlist = async (providedPw) => {
        // Ensure providedPw is a string and not a React event object
        const actualPw = (typeof providedPw === 'string') ? providedPw : (password || localStorage.getItem('chef_pw'));
        
        setLoadingGuestlist(true);
        try {
            const res = await fetch('/api/chef/guestlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: actualPw })
            });
            const data = await res.json();
            if (res.ok) {
                updateGuestlist(data.tickets);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingGuestlist(false);
        }
    };

    // Add names straight to the guestlist — no link needed
    const [addNames, setAddNames] = useState('');
    const [addEmail, setAddEmail] = useState('');
    const [addStatus, setAddStatus] = useState('');
    const [adding, setAdding] = useState(false);
    const handleAddGuests = async (e) => {
        e.preventDefault();
        setAdding(true);
        setAddStatus('');
        try {
            const res = await fetch('/api/chef/guestlist-add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: password || localStorage.getItem('chef_pw'),
                    names: addNames,
                    email: addEmail,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setAddStatus(data.error || 'Failed.');
            } else {
                const codes = data.added.map((a) => `${a.name} · ${a.code}`).join(' | ');
                setAddStatus(
                    `${data.added.length} added${data.emailed ? ' + emailed' : ''}${data.failed.length ? `, ${data.failed.length} failed` : ''}${codes ? ` — ${codes}` : ''}`
                );
                setAddNames('');
                setAddEmail('');
                fetchGuestlist();
            }
        } catch (err) {
            setAddStatus('Network error.');
        } finally {
            setAdding(false);
        }
    };

    // Resend the ticket email for a guestlist row (sends the whole order's mail again)
    const [resendingCode, setResendingCode] = useState(null);
    const handleResendTicket = async (t) => {
        if (!confirm(`Resend the ticket email for ${t.holder_name} (${t.ticket_code})?`)) return;
        setResendingCode(t.ticket_code);
        try {
            const res = await fetch('/api/chef/resend-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password || localStorage.getItem('chef_pw'), ticket_code: t.ticket_code })
            });
            const data = await res.json();
            alert(res.ok ? `Sent to ${data.email} (${data.count} ticket${data.count === 1 ? '' : 's'})` : `Failed: ${data.error}`);
        } catch (err) {
            alert('Failed: network error');
        } finally {
            setResendingCode(null);
        }
    };

    // Stats
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState('');

    const fetchStats = async (providedPw) => {
        const actualPw = (typeof providedPw === 'string') ? providedPw : (password || localStorage.getItem('chef_pw'));
        setStatsLoading(true);
        setStatsError('');
        try {
            const res = await fetch('/api/chef/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: actualPw }),
            });
            const data = await res.json();
            if (res.ok) setStats(data);
            else setStatsError(data.error || 'Failed to load stats');
        } catch {
            setStatsError('Connection error');
        } finally {
            setStatsLoading(false);
        }
    };

    const toggleTab = (tab) => {
        setActiveTab(tab);
        if (tab === 'guestlist') fetchGuestlist();
        if (tab === 'magic') { fetchGuestlistLinks(); fetchMagicLinksList(); }
        if (tab === 'stats') fetchStats();
    };

    const startScanner = () => {
        if (!document.getElementById('qr-reader')) return;
        if (scannerInstRef.current) return;
        
        try {
            const scanner = new Html5QrcodeScanner(
                "qr-reader",
                {
                   fps: 10,
                   qrbox: { width: 250, height: 250 },
                   aspectRatio: 1.0,
                   rememberLastUsedCamera: true,
                   // Default to the rear/main camera (best for scanning QR codes)
                   videoConstraints: { facingMode: { ideal: 'environment' } },
                   supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], // no "scan image file" option
                },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
            scannerInstRef.current = scanner;
            setScanning(true);
        } catch (e) {
            console.error('Failed to start scanner', e);
            setScanError('Could not access camera. Please check permissions.');
        }
    };

    const stopScanner = () => {
        if (scannerInstRef.current) {
            scannerInstRef.current.clear().catch(e => console.warn('Failed to clear scanner', e));
            scannerInstRef.current = null;
        }
        setScanning(false);
    };

    // Cleanup and tab-scanning sync
    useEffect(() => {
        if (activeTab === 'scanner') {
            const timer = setTimeout(startScanner, 200);
            return () => {
                clearTimeout(timer);
                stopScanner();
            };
        } else {
            stopScanner();
            setScannedTicket(null);
            setScanError('');
        }
    }, [activeTab]);

    // Initial cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerInstRef.current) {
                scannerInstRef.current.clear().catch(e => console.warn('Failed to clear scanner on unmount', e));
            }
        };
    }, []);

    async function onScanSuccess(decodedText) {
        // Guards use refs — this callback is captured once by the scanner and would
        // otherwise read stale state.
        if (scannedRef.current || cooldownRef.current || isScanApiCallInProgress.current) return;

        // Code might be full URL or just the code
        let ticketCode = decodedText;
        if (decodedText.includes('ticket_code=')) {
            ticketCode = new URL(decodedText).searchParams.get('ticket_code');
        } else if (decodedText.startsWith('SQ-') || decodedText.startsWith('KOD-')) {
            ticketCode = decodedText;
        }

        // Additional synchronously-blocking check
        if (lastScannedCode.current === ticketCode) return;

        isScanApiCallInProgress.current = true;
        lastScannedCode.current = ticketCode;

        // 1. Local Validation (Faster) — read the live ref, not a stale closure
        const localTicket = guestlistRef.current.find(t => t.ticket_code === ticketCode);
        if (localTicket) {
            scannedRef.current = true;
            setScannedTicket(localTicket);
            setScanError('');
            scanBeep(localTicket.checked_in ? 'error' : 'success');
            isScanApiCallInProgress.current = false;
            return;
        }

        // 2. Online Validation (Fallback/Secondary)
        setProcessing(true);
        try {
            const res = await fetch('/api/chef/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: password || localStorage.getItem('chef_pw'),
                    ticketCode,
                    action: 'verify'
                })
            });

            const data = await res.json();
            if (res.ok) {
                scannedRef.current = true;
                setScannedTicket(data.ticket);
                setScanError('');
                scanBeep(data.ticket.checked_in ? 'error' : 'success');
                // We keep scanner running but it won't trigger because of scannedRef
            } else {
                scannedRef.current = true;
                setScanError(data.error || 'Invalid ticket');
                setScannedTicket(null);
                // Allow re-scanning the same code if it failed
                lastScannedCode.current = '';
                scanBeep('error');
            }
        } catch (err) {
            scannedRef.current = true;
            setScanError('Connection error. Try again.');
            lastScannedCode.current = '';
            scanBeep('error');
        } finally {
            setProcessing(false);
            isScanApiCallInProgress.current = false;
        }
    }

    function onScanFailure(error) {
        // Standard scanner failures (like no QR in frame)
        // We don't want to show these to the user
    }

    const handleCheckInAndNext = async () => {
        if (!scannedTicket) return;
        
        const ticketToFinalize = scannedTicket;
        const checkedInAt = new Date().toISOString();
        
        // 1. OPTIMISTIC UPDATE: Update local state immediately
        const updatedList = guestlist.map(t => 
            t.ticket_code === ticketToFinalize.ticket_code 
                ? { ...t, checked_in: true, checked_in_at: checkedInAt } 
                : t
        );
        updateGuestlist(updatedList);
        
        // 2. IMMEDIATE RESET: Clear scanner for next person
        resetScanner();
        setStatus(`Checked in ${ticketToFinalize.holder_name}`);
        setTimeout(() => setStatus(''), 2000);

        // 3. BACKGROUND SYNC
        queueSyncAction(ticketToFinalize.ticket_code, true);
    };

    const handleManualCheckIn = async (ticket) => {
        if (processing) return;
        
        const newStatus = !ticket.checked_in;
        const confirmMsg = newStatus 
            ? `Check in ${ticket.holder_name}?` 
            : `Uncheck ${ticket.holder_name}? (Set back to OPEN)`;

        if (!window.confirm(confirmMsg)) return;

        const checkedInAt = newStatus ? new Date().toISOString() : null;
        
        // 1. OPTIMISTIC UPDATE
        const updatedList = guestlist.map(t => 
            t.id === ticket.id 
                ? { ...t, checked_in: newStatus, checked_in_at: checkedInAt } 
                : t
        );
        updateGuestlist(updatedList);
        
        setStatus(newStatus ? `Checked in ${ticket.holder_name}` : `Unchecked ${ticket.holder_name}`);
        setTimeout(() => setStatus(''), 2000);

        // 2. BACKGROUND SYNC
        queueSyncAction(ticket.ticket_code, newStatus);
    };

    const resetScanner = () => {
        setScannedTicket(null);
        setScanError('');
        scannedRef.current = false;
        lastScannedCode.current = ''; // Allow scanning same or next code

        // Brief cooldown so the same phone still in frame doesn't instantly re-pop.
        // Different codes scan straight through; a re-scan of a checked-in ticket just
        // shows "already checked in" (no double count).
        cooldownRef.current = true;
        setScanCooldown(true);
        setTimeout(() => { cooldownRef.current = false; setScanCooldown(false); }, 700);
    };

    if (!authorized) {
        return (
            <main style={styles.main}>
                <form onSubmit={handleLogin} style={styles.loginForm}>
                    <input
                        type="password"
                        required
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.minimalInput}
                        placeholder="••••••••"
                        disabled={loginLoading}
                    />
                    {loginError && <p style={{ color: 'red', margin: '8px 0 0', fontSize: '14px' }}>{loginError}</p>}
                </form>
            </main>
        );
    }

    return (
        <main className="chef-main" style={styles.main}>
            <style dangerouslySetInnerHTML={{ __html: `
                .chef-container {
                    animation: fadeIn 0.4s ease-out;
                }

                @media (max-width: 640px) {
                    .chef-main {
                        padding: 0.75rem !important;
                    }
                    .chef-container {
                        padding: 1.25rem !important;
                        border-radius: 16px !important;
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                input::placeholder {
                    color: rgba(26, 26, 26, 0.3);
                }

                input:focus {
                    outline: none;
                    border-color: var(--accent) !important;
                    box-shadow: 0 0 0 2px rgba(74, 103, 65, 0.1);
                }

                .submit-btn:hover {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                }

                .submit-btn:active {
                    transform: translateY(0);
                }

                .tab-btn {
                    padding: 12px 0;
                    flex: 1;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--ink-muted);
                    background: none;
                    border: none;
                    border-bottom: 2px solid transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tab-btn.active {
                    color: var(--accent);
                    border-color: var(--accent);
                }

                #qr-reader {
                    border: none !important;
                }
                #qr-reader__dashboard {
                    padding: 20px !important;
                }
                #qr-reader__status_span {
                    display: none !important;
                }
                #qr-reader img {
                    display: none;
                }
                #qr-reader button {
                    background-color: var(--ink) !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    cursor: pointer !important;
                    font-weight: 600 !important;
                    margin: 5px !important;
                }
                #qr-reader__camera_selection {
                    padding: 8px !important;
                    border-radius: 8px !important;
                    border: 1px solid var(--border) !important;
                    margin-bottom: 10px !important;
                }
            `}} />
            
            {(() => {
                const quiet = isOnline && syncQueue.length === 0;
                return (
                    <div style={{
                        position: 'fixed', top: '10px', right: '10px', zIndex: 1000,
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: quiet ? '5px' : '5px 10px',
                        borderRadius: '999px',
                        backgroundColor: quiet ? 'transparent' : 'rgba(255,255,255,0.92)',
                        boxShadow: quiet ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
                        fontSize: '0.72rem', fontWeight: 600,
                    }}>
                        <div style={{
                            width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
                            backgroundColor: isOnline ? '#10b981' : '#ef4444',
                            boxShadow: isOnline ? '0 0 6px rgba(16,185,129,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
                        }} />
                        {!isOnline && <span style={{ color: '#ef4444' }}>Offline</span>}
                        {syncQueue.length > 0 && <span style={{ color: '#f59e0b' }}>{syncQueue.length} pending</span>}
                    </div>
                );
            })()}

            <div className="chef-container" style={styles.container}>
                <div style={styles.tabsCol}>
                    <div style={styles.tabNav}>
                        <button
                            onClick={() => toggleTab('magic')}
                            className={`tab-btn ${activeTab === 'magic' ? 'active' : ''}`}
                        >
                            Guestlist Setup
                        </button>
                        <button
                            onClick={() => toggleTab('scanner')}
                            className={`tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
                        >
                            Scanner
                        </button>
                        <button
                            onClick={() => toggleTab('guestlist')}
                            className={`tab-btn ${activeTab === 'guestlist' ? 'active' : ''}`}
                        >
                            Guestlist
                        </button>
                        <button
                            onClick={() => toggleTab('stats')}
                            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                        >
                            Stats
                        </button>
                    </div>

                    <div style={styles.tabContent}>
                        {activeTab === 'magic' && (
                            <div style={styles.form}>
                                {/* ── Add names straight to the guestlist ── */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                                    <label style={styles.label}>Add to guestlist</label>
                                <form onSubmit={handleAddGuests} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Add names — comma separated"
                                        value={addNames}
                                        onChange={(e) => setAddNames(e.target.value)}
                                        style={{ ...styles.searchBar, width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="email"
                                            placeholder="Email (one name only, optional)"
                                            value={addEmail}
                                            onChange={(e) => setAddEmail(e.target.value)}
                                            disabled={addNames.includes(',')}
                                            style={{ ...styles.searchBar, flex: 1, width: 'auto', opacity: addNames.includes(',') ? 0.4 : 1 }}
                                        />
                                        <button type="submit" disabled={adding || !addNames.trim()} style={styles.refreshBtn}>
                                            {adding ? '...' : 'Add to guestlist'}
                                        </button>
                                    </div>
                                    {addStatus && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', paddingLeft: '4px' }}>{addStatus}</span>
                                    )}
                                </form>
                                </div>

                                <form onSubmit={handleGenerateLinks} style={styles.form}>
                                    <div style={styles.row}>
                                        <div style={{ ...styles.fieldGroup, flex: 1 }}>
                                            <label style={styles.label}>Min. Price (€)</label>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                required
                                                value={magicPrice}
                                                onChange={(e) => setMagicPrice(e.target.value)}
                                                style={styles.input}
                                                placeholder="30 or 22,5"
                                            />
                                        </div>
                                        <div style={{ ...styles.fieldGroup, flex: 1 }}>
                                            <label style={styles.label}>Number of Links</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                required
                                                value={magicCount}
                                                onChange={(e) => setMagicCount(e.target.value)}
                                                style={styles.input}
                                                placeholder="1"
                                            />
                                        </div>
                                        <div style={{ ...styles.fieldGroup, flex: 1 }}>
                                            <label style={styles.label}>Tickets per Link</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="1000"
                                                required
                                                value={magicUses}
                                                onChange={(e) => setMagicUses(e.target.value)}
                                                style={styles.input}
                                                placeholder="1"
                                            />
                                        </div>
                                    </div>

                                    <div style={styles.fieldGroup}>
                                        <label style={styles.label}>For / label (optional)</label>
                                        <input
                                            type="text"
                                            value={magicLabel}
                                            onChange={(e) => setMagicLabel(e.target.value)}
                                            style={styles.input}
                                            placeholder="e.g. Partner XY"
                                        />
                                    </div>

                                    <div style={styles.fieldGroup}>
                                        <label style={styles.label}>Send to Email (optional)</label>
                                        <input
                                            type="email"
                                            value={magicEmail}
                                            onChange={(e) => setMagicEmail(e.target.value)}
                                            style={styles.input}
                                            placeholder="guest@example.com"
                                        />
                                    </div>

                                    {magicEmail && (
                                        <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={magicSendEmail}
                                                onChange={(e) => setMagicSendEmail(e.target.checked)}
                                                style={{ width: '14px', height: '14px' }}
                                            />
                                            Send email with all links
                                        </label>
                                    )}

                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        style={styles.button}
                                        disabled={magicLoading}
                                    >
                                        {magicLoading ? 'Generating…' : 'Generate Links'}
                                    </button>
                                </form>

                                {magicStatus && (
                                    <div style={{
                                        ...styles.status,
                                        backgroundColor: magicStatus.startsWith('Error') ? 'rgba(220, 38, 38, 0.1)' : 'rgba(74, 103, 65, 0.1)',
                                        color: magicStatus.startsWith('Error') ? '#dc2626' : 'var(--accent)',
                                        borderColor: magicStatus.startsWith('Error') ? 'rgba(220, 38, 38, 0.2)' : 'rgba(74, 103, 65, 0.2)',
                                    }}>
                                        {magicStatus}
                                    </div>
                                )}

                                {magicLinks.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', fontWeight: '600' }}>
                                            Expires: {new Date(magicLinks[0].expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            {magicLinks[0].uses > 1 && ` · ${magicLinks[0].uses} tickets per link`}
                                        </div>

                                        {magicLinks.map((link, idx) => (
                                            <div key={link.jti} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={link.url}
                                                    style={{ ...styles.input, flex: 1, fontSize: '0.75rem', opacity: 0.7, cursor: 'default' }}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => copyMagicLink(link.url, idx)}
                                                    style={{ ...styles.button, marginTop: 0, padding: '0 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                >
                                                    {magicCopiedIdx === idx ? '✓ Copied' : 'Copy'}
                                                </button>
                                            </div>
                                        ))}

                                        {magicLinks.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={copyAllLinks}
                                                style={{ ...styles.button, marginTop: '0.25rem', fontSize: '0.85rem' }}
                                            >
                                                {magicAllCopied ? '✓ All Copied' : `Copy All ${magicLinks.length} Links`}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* ── Created magic links (label + claimed count) ── */}
                                {magicLinksList.length > 0 && (
                                    <div style={{ borderTop: '2px solid var(--ink, #000)', marginTop: '1.5rem', paddingTop: '1.25rem' }}>
                                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>Created links</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {magicLinksList.map((l) => (
                                                <div key={l.jti} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{l.label || 'Unlabeled'}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>
                                                            {l.claimed} of {l.uses} claimed · min €{l.price}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyMagicListLink(l.url, l.jti)}
                                                        style={{ ...styles.button, marginTop: 0, padding: '0 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                    >
                                                        {magicListCopiedJti === l.jti ? '✓ Copied' : 'Copy link'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMagicLink(l.jti, l.label)}
                                                        title="Remove / invalidate"
                                                        style={{ ...styles.button, marginTop: 0, padding: '0 10px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Guestlist links (free tickets, no checkout) ── */}
                                <div style={{ borderTop: '2px solid var(--ink, #000)', marginTop: '1.5rem', paddingTop: '1.25rem' }}>
                                    <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>Guestlist links</h3>
                                    <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                                        Free tickets. Share the link; the recipient enters names up to the limit — no payment.
                                    </p>
                                    <form onSubmit={handleCreateGuestlist} style={styles.form}>
                                        <div style={styles.row}>
                                            <div style={{ ...styles.fieldGroup, flex: 2 }}>
                                                <label style={styles.label}>For (label)</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={glLabel}
                                                    onChange={(e) => setGlLabel(e.target.value)}
                                                    style={styles.input}
                                                    placeholder="e.g. Artist A"
                                                />
                                            </div>
                                            <div style={{ ...styles.fieldGroup, flex: 1 }}>
                                                <label style={styles.label}>Free tickets</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="1000"
                                                    required
                                                    value={glCount}
                                                    onChange={(e) => setGlCount(e.target.value)}
                                                    style={styles.input}
                                                    placeholder="5"
                                                />
                                            </div>
                                        </div>
                                        <button type="submit" className="submit-btn" style={styles.button} disabled={glLoading}>
                                            {glLoading ? 'Creating…' : 'Create Guestlist Link'}
                                        </button>
                                    </form>

                                    {glStatus && (
                                        <div style={{
                                            ...styles.status,
                                            backgroundColor: glStatus.startsWith('Error') ? 'rgba(220, 38, 38, 0.1)' : 'rgba(74, 103, 65, 0.1)',
                                            color: glStatus.startsWith('Error') ? '#dc2626' : 'var(--accent)',
                                            borderColor: glStatus.startsWith('Error') ? 'rgba(220, 38, 38, 0.2)' : 'rgba(74, 103, 65, 0.2)',
                                        }}>
                                            {glStatus}
                                        </div>
                                    )}

                                    {glList.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
                                            {glList.map((gl) => (
                                                <div key={gl.jti} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{gl.label || 'Unnamed'}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{gl.used} of {gl.max} used</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => changeGuestlistMax(gl.jti, gl.max)}
                                                        style={{ ...styles.button, marginTop: 0, padding: '0 10px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyGuestlistLink(gl.url, gl.jti)}
                                                        style={{ ...styles.button, marginTop: 0, padding: '0 12px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                    >
                                                        {glCopiedJti === gl.jti ? '✓ Copied' : 'Copy link'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeGuestlistLink(gl.jti, gl.label)}
                                                        title="Deactivate"
                                                        style={{ ...styles.button, marginTop: 0, padding: '0 10px', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'scanner' && (
                            <div style={styles.scannerWrapper}>
                                <div id="qr-reader" style={{
                                    ...styles.qrReader,
                                    display: (scannedTicket || scanError) ? 'none' : 'block'
                                }}></div>

                                {scanError && (
                                    <div style={{ ...styles.scanErrorBox, backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' }}>
                                        <div style={styles.errorIcon}>⚠️</div>
                                        <div style={{ ...styles.errorText, color: '#fff', fontWeight: 700 }}>{scanError}</div>
                                        <button onClick={resetScanner} style={styles.scanAgainBtn}>Scan Again</button>
                                    </div>
                                )}

                                {scannedTicket && (
                                    <div style={{ ...styles.ticketResult, backgroundColor: scannedTicket.checked_in ? '#dc2626' : '#16a34a', color: '#fff', border: 'none' }}>
                                        <div style={styles.resultHeader}>
                                            <span style={{ ...styles.badge, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                                                {scannedTicket.checked_in ? '⛔ Already checked in' : '✓ Valid ticket'}
                                            </span>
                                            {scannedTicket.checked_in && scannedTicket.checked_in_at && (
                                                <div style={{ ...styles.checkedInTime, color: '#fff', opacity: 0.85 }}>
                                                    at {new Date(scannedTicket.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>

                                        <div style={styles.ticketInfo}>
                                            <div style={{ ...styles.holderName, color: '#fff', fontSize: 'clamp(2rem, 8vw, 3rem)', lineHeight: 1.05 }}>{scannedTicket.holder_name}</div>
                                            <div style={{ ...styles.ticketCode, color: 'rgba(255,255,255,0.8)' }}>{scannedTicket.ticket_code}</div>
                                        </div>

                                        {!scannedTicket.checked_in ? (
                                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                                <button
                                                    onClick={handleCheckInAndNext}
                                                    disabled={processing}
                                                    style={{ ...styles.checkInBtn, backgroundColor: '#fff', color: '#16a34a' }}
                                                >
                                                    {processing ? 'Processing...' : '✅ Check In & Next'}
                                                </button>
                                                <button onClick={resetScanner} style={{ ...styles.cancelBtn, color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}>
                                                    Back without Check In
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                                <button onClick={resetScanner} style={{ ...styles.scanNextBtn, backgroundColor: '#fff', color: '#dc2626' }}>Next Scan</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'guestlist' && (
                            <div style={styles.listContainer}>
                                <div style={styles.listHeader}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={styles.countText}>{guestlist.length} Tickets total</span>
                                        <input 
                                            type="text" 
                                            placeholder="Search name..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={styles.searchBar}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => fetchGuestlist()} 
                                        disabled={loadingGuestlist}
                                        style={styles.refreshBtn}
                                    >
                                        {loadingGuestlist ? '...' : 'Refresh'}
                                    </button>
                                </div>
                                {loadingGuestlist && guestlist.length === 0 ? (
                                    <div style={styles.placeholderText}>Loading...</div>
                                ) : (
                                    <div style={styles.table}>
                                        <div style={styles.tableHeader}>
                                            <span style={{ flex: 1.5 }}>Name</span>
                                            <span style={{ flex: 1 }}>Status</span>
                                            <span style={{ flex: 0.8, textAlign: 'right' }}>Code</span>
                                            <span style={{ flex: 0.4, textAlign: 'right' }}>Mail</span>
                                        </div>
                                        {guestlist.filter(t => (t.holder_name.toLowerCase().includes(searchTerm.toLowerCase()) || t.ticket_code?.toLowerCase().includes(searchTerm.toLowerCase()))).length === 0 ? (
                                            <div style={styles.placeholderText}>No matches found.</div>
                                        ) : (
                                            guestlist
                                                .filter(t => (t.holder_name.toLowerCase().includes(searchTerm.toLowerCase()) || t.ticket_code?.toLowerCase().includes(searchTerm.toLowerCase())))
                                                .map((t) => (
                                                    <div key={t.id} style={styles.tableRow}>
                                                        <span style={{ flex: 1.5, fontWeight: 500 }}>{t.holder_name}</span>
                                                        <span style={{ flex: 1 }}>
                                                            <span 
                                                                onClick={() => handleManualCheckIn(t)}
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '10px',
                                                                    backgroundColor: t.checked_in ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                                                    color: t.checked_in ? '#16a34a' : 'rgba(0, 0, 0, 0.4)',
                                                                    fontWeight: '700',
                                                                    textTransform: 'uppercase',
                                                                    cursor: 'pointer',
                                                                    border: t.checked_in ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {t.checked_in ? 'IN' : 'OPEN'}
                                                            </span>
                                                        </span>
                                                        <span style={{ flex: 0.8, textAlign: 'right', fontFamily: 'monospace', opacity: 0.6 }}>{t.ticket_code}</span>
                                                        <span style={{ flex: 0.4, textAlign: 'right' }}>
                                                            <button
                                                                onClick={() => handleResendTicket(t)}
                                                                disabled={resendingCode === t.ticket_code}
                                                                title="Resend ticket email"
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.9rem',
                                                                    opacity: resendingCode === t.ticket_code ? 0.3 : 0.6,
                                                                    padding: '2px 4px',
                                                                }}
                                                            >
                                                                {resendingCode === t.ticket_code ? '…' : '✉'}
                                                            </button>
                                                        </span>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'stats' && (
                            <div style={styles.listContainer}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <span style={styles.countText}>Sales Overview</span>
                                    <button onClick={() => fetchStats()} disabled={statsLoading} style={styles.refreshBtn}>
                                        {statsLoading ? '...' : 'Refresh'}
                                    </button>
                                </div>

                                {statsError && <div style={{ color: '#dc2626', fontSize: '0.9rem', padding: '1rem 0' }}>{statsError}</div>}

                                {statsLoading && !stats && <div style={styles.placeholderText}>Loading…</div>}

                                {stats && (() => {
                                    const fmt = (cents) => `€${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                    const srcLabel = { online: 'Online', offline: 'Offline', magic_link: 'Magic Link' };
                                    const methodLabel = (m) => m.replace('stripe_', '').replace('_', ' ');
                                    const sortedPrices = Object.entries(stats.priceDist).sort(([a], [b]) => Number(a) - Number(b));
                                    const sortedDates = Object.entries(stats.salesByDate).sort(([a], [b]) => a.localeCompare(b));

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                                            {/* Summary */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                {[
                                                    ['Tickets Sold', stats.summary.totalTickets],
                                                    ['Orders', stats.summary.totalOrders],
                                                    ['Net (after fees)', fmt(stats.summary.netRevenue)],
                                                    ['Avg per Ticket', fmt(stats.summary.avgPricePerTicket)],
                                                    ['Guestlist Tickets', stats.summary.guestlistTickets ?? 0],
                                                ].map(([label, value]) => (
                                                    <div key={label} style={statCard}>
                                                        <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--ink)' }}>{value}</div>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Potential guests — unclaimed link capacity */}
                                            {stats.potential && stats.potential.total > 0 && (
                                                <div>
                                                    <div style={sectionHead}>Potential Guests</div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        <div style={{ ...statPill, color: 'var(--ink)' }}>
                                                            <strong>{stats.potential.total}</strong> open total
                                                        </div>
                                                        <div style={{ ...statPill, color: 'var(--ink-muted)' }}>
                                                            <strong>{stats.potential.magic}</strong> magic links
                                                        </div>
                                                        <div style={{ ...statPill, color: 'var(--ink-muted)' }}>
                                                            <strong>{stats.potential.guestlist}</strong> guestlist
                                                        </div>
                                                        {/* Ceiling: everyone holding a ticket + every open seat on active links */}
                                                        <div style={{ ...statPill, color: 'var(--ink)' }}>
                                                            <strong>{stats.summary.totalTickets + (stats.summary.guestlistTickets ?? 0) + stats.potential.total}</strong> max total
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ticket Mix (ratios) */}
                                            {stats.mix && (() => {
                                                const CATS = [
                                                    { key: 'normal', label: 'Normal', color: 'var(--accent)' },
                                                    { key: 'group', label: 'Group (4-for-3)', color: '#8CB2AB' },
                                                    { key: 'magic', label: 'Magic link', color: '#c98a3a' },
                                                    { key: 'offline', label: 'Offline', color: 'var(--ink-muted)' },
                                                ];
                                                const total = CATS.reduce((s, c) => s + (stats.mix[c.key] || 0), 0);
                                                if (!total) return null;
                                                const cats = CATS.filter((c) => (stats.mix[c.key] || 0) > 0);
                                                return (
                                                    <div>
                                                        <div style={sectionHead}>Ticket Mix</div>
                                                        <div style={{ display: 'flex', width: '100%', height: '22px', borderRadius: '4px', overflow: 'hidden' }}>
                                                            {cats.map((c) => (
                                                                <div key={c.key} title={c.label} style={{ width: `${(stats.mix[c.key] / total) * 100}%`, background: c.color }} />
                                                            ))}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.75rem' }}>
                                                            {cats.map((c) => {
                                                                const v = stats.mix[c.key];
                                                                const pct = Math.round((v / total) * 100);
                                                                return (
                                                                    <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                                                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: c.color, flexShrink: 0 }} />
                                                                        <span style={{ flex: 1 }}>{c.label}</span>
                                                                        <span style={{ fontWeight: 700 }}>{v}</span>
                                                                        <span style={{ width: '44px', textAlign: 'right', color: 'var(--ink-muted)' }}>{pct}%</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Check-ins */}
                                            <div>
                                                <div style={sectionHead}>Check-ins</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {[
                                                        ['Checked in', stats.checkins.checkedIn, '#16a34a'],
                                                        ['Remaining', stats.checkins.remaining, 'var(--ink-muted)'],
                                                        ['Total', stats.checkins.total, 'var(--ink)'],
                                                    ].map(([label, value, color]) => (
                                                        <div key={label} style={{ ...statPill, color }}>
                                                            <strong>{value}</strong> {label}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* By Source */}
                                            <div>
                                                <div style={sectionHead}>By Source</div>
                                                <div style={styles.table}>
                                                    <div style={styles.tableHeader}>
                                                        <span style={{ flex: 1.5 }}>Source</span>
                                                        <span style={{ flex: 1, textAlign: 'right' }}>Tickets</span>
                                                        <span style={{ flex: 1.2, textAlign: 'right' }}>Revenue</span>
                                                    </div>
                                                    {Object.entries(stats.bySource).map(([src, d]) => (
                                                        <div key={src} style={styles.tableRow}>
                                                            <span style={{ flex: 1.5, fontWeight: 500 }}>{srcLabel[src] || src}</span>
                                                            <span style={{ flex: 1, textAlign: 'right' }}>{d.tickets}</span>
                                                            <span style={{ flex: 1.2, textAlign: 'right' }}>{fmt(d.revenue)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* By Payment Method */}
                                            <div>
                                                <div style={sectionHead}>By Payment Method</div>
                                                <div style={styles.table}>
                                                    <div style={styles.tableHeader}>
                                                        <span style={{ flex: 2 }}>Method</span>
                                                        <span style={{ flex: 1, textAlign: 'right' }}>Orders</span>
                                                        <span style={{ flex: 1, textAlign: 'right' }}>Tickets</span>
                                                    </div>
                                                    {Object.entries(stats.byMethod).map(([m, d]) => (
                                                        <div key={m} style={styles.tableRow}>
                                                            <span style={{ flex: 2, fontWeight: 500, textTransform: 'capitalize' }}>{methodLabel(m)}</span>
                                                            <span style={{ flex: 1, textAlign: 'right' }}>{d.orders}</span>
                                                            <span style={{ flex: 1, textAlign: 'right' }}>{d.tickets}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Price Distribution */}
                                            <div>
                                                <div style={sectionHead}>Price Distribution</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    {sortedPrices.map(([price, count]) => {
                                                        const max = Math.max(...sortedPrices.map(([,c]) => c));
                                                        const pct = Math.round((count / max) * 100);
                                                        return (
                                                            <div key={price} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <span style={{ width: '36px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--ink)', textAlign: 'right', flexShrink: 0 }}>€{price}</span>
                                                                <div style={{ flex: 1, height: '18px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: '4px', transition: 'width 0.4s' }} />
                                                                </div>
                                                                <span style={{ width: '28px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--ink-muted)', flexShrink: 0 }}>{count}×</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Sales by Date */}
                                            {sortedDates.length > 1 && (
                                                <div>
                                                    <div style={sectionHead}>Sales by Date</div>
                                                    <div style={styles.table}>
                                                        <div style={styles.tableHeader}>
                                                            <span style={{ flex: 1.5 }}>Date</span>
                                                            <span style={{ flex: 1, textAlign: 'right' }}>Tickets</span>
                                                            <span style={{ flex: 1.2, textAlign: 'right' }}>Revenue</span>
                                                        </div>
                                                        {sortedDates.map(([date, d]) => (
                                                            <div key={date} style={styles.tableRow}>
                                                                <span style={{ flex: 1.5, fontWeight: 500 }}>{new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                                                <span style={{ flex: 1, textAlign: 'right' }}>{d.tickets}</span>
                                                                <span style={{ flex: 1.2, textAlign: 'right' }}>{fmt(d.revenue)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

const statCard = {
    backgroundColor: 'rgba(0,0,0,0.03)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '1rem',
};

const statPill = {
    fontSize: '0.85rem',
    fontWeight: '500',
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: 'rgba(0,0,0,0.04)',
    border: '1px solid var(--border)',
};

const sectionHead = {
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--ink-muted)',
    marginBottom: '0.75rem',
};

const styles = {
    main: {
        minHeight: '100vh',
        backgroundColor: 'var(--bg, #f0eee6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        color: 'var(--ink, #1a1a1a)',
    },
    loginForm: {
        width: '100%',
        maxWidth: '200px',
    },
    minimalInput: {
        width: '100%',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border, rgba(26, 26, 26, 0.1))',
        padding: '12px 4px',
        fontSize: '1.2rem',
        textAlign: 'center',
        color: 'var(--ink)',
        transition: 'all 0.3s ease',
        outline: 'none',
    },
    container: {
        width: '100%',
        maxWidth: '600px',
        backgroundColor: '#fff',
        padding: '3rem',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg, 0 8px 40px rgba(0,0,0,0.08))',
        border: '1px solid var(--border, rgba(26, 26, 26, 0.08))',
    },
    tabsCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
    },
    tabNav: {
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        gap: '2rem',
    },
    tabContent: {
        minHeight: '300px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    label: {
        fontSize: '0.85rem',
        fontWeight: '600',
        color: 'var(--ink-light, #3a3a3a)',
        paddingLeft: '4px',
    },
    input: {
        backgroundColor: 'rgba(26, 26, 26, 0.03)',
        border: '1px solid var(--border, rgba(26, 26, 26, 0.1))',
        borderRadius: '12px',
        padding: '14px 16px',
        fontSize: '1rem',
        color: 'var(--ink)',
        transition: 'all 0.2s ease',
    },
    row: {
        display: 'flex',
        gap: '1rem',
    },
    button: {
        backgroundColor: 'var(--ink, #1a1a1a)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '1rem',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    status: {
        marginTop: '1.5rem',
        padding: '1rem',
        borderRadius: '12px',
        fontSize: '0.9rem',
        textAlign: 'center',
        border: '1px solid transparent',
    },
    scannerWrapper: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        animation: 'fadeIn 0.3s ease-out',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
    },
    qrReader: {
        width: '100%',
        border: 'none !important',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        backgroundColor: '#000',
    },
    scanErrorBox: {
        backgroundColor: 'rgba(220, 38, 38, 0.05)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        borderRadius: '20px',
        padding: '2.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
    },
    errorIcon: {
        fontSize: '2.5rem',
        marginBottom: '0.5rem',
    },
    errorText: {
        color: '#dc2626',
        fontWeight: '600',
        fontSize: '1.1rem',
    },
    scanAgainBtn: {
        backgroundColor: '#dc2626',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '0.5rem',
    },
    ticketResult: {
        backgroundColor: 'rgba(74, 103, 65, 0.05)',
        border: '2px solid var(--accent)',
        borderRadius: '20px',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        alignItems: 'center',
    },
    resultHeader: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
    },
    badge: {
        backgroundColor: 'var(--accent)',
        color: '#fff',
        padding: '6px 16px',
        borderRadius: '50px',
        fontSize: '0.8rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    checkedInTime: {
        fontSize: '0.85rem',
        color: 'var(--ink-muted)',
        fontWeight: '500',
    },
    ticketInfo: {
        textAlign: 'center',
    },
    holderName: {
        fontSize: '1.8rem',
        fontWeight: '700',
        color: 'var(--ink)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    ticketCode: {
        fontSize: '1rem',
        fontFamily: 'monospace',
        color: 'var(--ink-muted)',
        letterSpacing: '0.1em',
        marginTop: '0.25rem',
    },
    checkInBtn: {
        width: '100%',
        backgroundColor: 'var(--accent)',
        color: '#fff',
        border: 'none',
        borderRadius: '15px',
        padding: '18px',
        fontSize: '1.1rem',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(74, 103, 65, 0.3)',
        transition: 'all 0.2s',
    },
    scanNextBtn: {
        width: '100%',
        backgroundColor: 'var(--ink)',
        color: '#fff',
        border: 'none',
        borderRadius: '15px',
        padding: '18px',
        fontSize: '1.1rem',
        fontWeight: '700',
        cursor: 'pointer',
    },
    cancelBtn: {
        backgroundColor: 'transparent',
        border: 'none',
        color: 'var(--ink-muted)',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        textDecoration: 'underline',
    },
    searchBar: {
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        fontSize: '0.85rem',
        width: '180px',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    scannerPlaceholder: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        color: 'var(--ink-muted)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '1.5rem',
    },
    listContainer: {
        animation: 'fadeIn 0.4s ease-out',
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        padding: '0 8px',
    },
    countText: {
        fontSize: '0.8rem',
        color: 'var(--ink-muted)',
        fontWeight: '500',
    },
    refreshBtn: {
        backgroundColor: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '6px 14px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'var(--ink-light)',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    table: {
        display: 'flex',
        flexDirection: 'column',
    },
    tableHeader: {
        display: 'flex',
        padding: '0 8px 12px 8px',
        fontSize: '0.75rem',
        fontWeight: '700',
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid var(--border)',
    },
    tableRow: {
        display: 'flex',
        padding: '16px 8px',
        borderBottom: '1px solid var(--border-light, rgba(26, 26, 26, 0.04))',
        fontSize: '0.95rem',
    },
    placeholderText: {
        padding: '40px',
        textAlign: 'center',
        color: 'var(--ink-muted)',
        fontSize: '0.9rem',
    }
};
