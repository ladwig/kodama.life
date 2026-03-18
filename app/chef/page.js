'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ChefPage() {
    const [password, setPassword] = useState('');
    const [authorized, setAuthorized] = useState(false);
    
    // Tabs
    const [activeTab, setActiveTab] = useState('offline');
    const [guestlist, setGuestlist] = useState([]);
    const [loadingGuestlist, setLoadingGuestlist] = useState(false);

    // Scanner
    const [scannedTicket, setScannedTicket] = useState(null);
    const [scanError, setScanError] = useState('');
    const [scanning, setScanning] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [scanCooldown, setScanCooldown] = useState(false);
    const scannerInstRef = useRef(null);
    const isScanApiCallInProgress = useRef(false);
    const lastScannedCode = useRef('');

    // Initial check for session and cached guestlist
    useEffect(() => {
        const savedPw = sessionStorage.getItem('chef_pw');
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
    }, []);

    // Form data
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password.length > 0) {
            setAuthorized(true);
            sessionStorage.setItem('chef_pw', password);
        }
    };

    const fetchGuestlist = async (providedPw) => {
        setLoadingGuestlist(true);
        try {
            const res = await fetch('/api/chef/guestlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: providedPw || password || sessionStorage.getItem('chef_pw') })
            });
            const data = await res.json();
            if (res.ok) {
                setGuestlist(data.tickets);
                localStorage.setItem('kodama_guestlist', JSON.stringify(data.tickets));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingGuestlist(false);
        }
    };

    const toggleTab = (tab) => {
        setActiveTab(tab);
        if (tab === 'guestlist') {
            fetchGuestlist();
        }
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
        if (processing || scannedTicket || scanCooldown || isScanApiCallInProgress.current) return;
        
        // Code might be full URL or just the code
        let ticketCode = decodedText;
        if (decodedText.includes('ticket_code=')) {
            ticketCode = new URL(decodedText).searchParams.get('ticket_code');
        } else if (decodedText.startsWith('KOD-')) {
            ticketCode = decodedText;
        }

        // Additional synchronously-blocking check
        if (lastScannedCode.current === ticketCode) return;
        
        isScanApiCallInProgress.current = true;
        lastScannedCode.current = ticketCode;

        // 1. Local Validation (Faster)
        const localTicket = guestlist.find(t => t.ticket_code === ticketCode);
        if (localTicket) {
            setScannedTicket(localTicket);
            setScanError('');
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
                    password: password || sessionStorage.getItem('chef_pw'),
                    ticketCode,
                    action: 'verify'
                })
            });

            const data = await res.json();
            if (res.ok) {
                setScannedTicket(data.ticket);
                setScanError('');
                // We keep scanner running but it won't trigger because of scannedTicket condition
            } else {
                setScanError(data.error || 'Invalid ticket');
                setScannedTicket(null);
                // Allow re-scanning the same code if it failed
                lastScannedCode.current = '';
            }
        } catch (err) {
            setScanError('Connection error. Try again.');
            lastScannedCode.current = '';
        } finally {
            setProcessing(false);
            isScanApiCallInProgress.current = false;
        }
    }

    function onScanFailure(error) {
        // Standard scanner failures (like no QR in frame)
        // We don't want to show these to the user
    }

    const handleCheckIn = async () => {
        if (!scannedTicket || processing) return;
        
        setProcessing(true);
        try {
            const res = await fetch('/api/chef/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: password || sessionStorage.getItem('chef_pw'),
                    ticketCode: scannedTicket.ticket_code,
                    action: 'checkin'
                })
            });

            const data = await res.json();
            if (res.ok) {
                const updatedTicket = { ...scannedTicket, checked_in: true, checked_in_at: new Date().toISOString() };
                setScannedTicket(updatedTicket);
                
                // Update local guestlist state so they appear as "IN" there too
                setGuestlist(prev => prev.map(t => 
                    t.ticket_code === updatedTicket.ticket_code ? updatedTicket : t
                ));

                setStatus(`Successfully checked in ${scannedTicket.holder_name}!`);
                setTimeout(() => setStatus(''), 3000);
            } else {
                setScanError(data.error || 'Failed to check in');
            }
        } catch (err) {
            setScanError('Error communicating with server.');
        } finally {
            setProcessing(false);
        }
    };

    const resetScanner = () => {
        setScannedTicket(null);
        setScanError('');
        lastScannedCode.current = ''; // Allow scanning same or next code
        
        // Add cooldown to prevent immediate rescan if still looking at the same phone
        setScanCooldown(true);
        setTimeout(() => setScanCooldown(false), 1500); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('Creating...');
        
        try {
            const res = await fetch('/api/chef/ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password,
                    name,
                    email,
                    quantity: parseInt(quantity, 10),
                    price_per_ticket: Math.round(parseFloat(price) * 100)
                })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus(`Success! Created ${data.tickets.length} ticket(s) for ${name}.`);
                setName('');
                setEmail('');
                setQuantity(1);
            } else {
                setStatus(`Error: ${data.error}`);
                if (res.status === 401) setAuthorized(false);
            }
        } catch (err) {
            setStatus(`Error: ${err.message}`);
        }
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
                    />
                </form>
            </main>
        );
    }

    return (
        <main style={styles.main}>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
                
                .chef-container {
                    animation: fadeIn 0.4s ease-out;
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
            
            <div className="chef-container" style={styles.container}>
                <div style={styles.tabsCol}>
                    <div style={styles.tabNav}>
                        <button 
                            onClick={() => toggleTab('offline')} 
                            className={`tab-btn ${activeTab === 'offline' ? 'active' : ''}`}
                        >
                            Offline Ticket
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
                    </div>

                    <div style={styles.tabContent}>
                        {activeTab === 'offline' && (
                            <form onSubmit={handleSubmit} style={styles.form}>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Buyer Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        style={styles.input}
                                        placeholder="Full Name"
                                    />
                                </div>

                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>Buyer Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={styles.input}
                                        placeholder="hello@kodama.life"
                                    />
                                </div>

                                <div style={styles.row}>
                                    <div style={{ ...styles.fieldGroup, flex: 1 }}>
                                        <label style={styles.label}>Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={{ ...styles.fieldGroup, flex: 1 }}>
                                        <label style={styles.label}>Price (Euro)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            style={styles.input}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="submit-btn"
                                    style={styles.button}
                                >
                                    Issue Offline Tickets
                                </button>

                                {status && (
                                    <div style={{
                                        ...styles.status,
                                        backgroundColor: status.includes('Error') ? 'rgba(220, 38, 38, 0.1)' : 'rgba(74, 103, 65, 0.1)',
                                        color: status.includes('Error') ? '#dc2626' : 'var(--accent)',
                                        borderColor: status.includes('Error') ? 'rgba(220, 38, 38, 0.2)' : 'rgba(74, 103, 65, 0.2)'
                                    }}>
                                        {status}
                                    </div>
                                )}
                            </form>
                        )}

                        {activeTab === 'scanner' && (
                            <div style={styles.scannerWrapper}>
                                <div id="qr-reader" style={{
                                    ...styles.qrReader,
                                    display: (scannedTicket || scanError) ? 'none' : 'block'
                                }}></div>

                                {scanError && (
                                    <div style={styles.scanErrorBox}>
                                        <div style={styles.errorIcon}>⚠️</div>
                                        <div style={styles.errorText}>{scanError}</div>
                                        <button onClick={resetScanner} style={styles.scanAgainBtn}>Scan Again</button>
                                    </div>
                                )}

                                {scannedTicket && (
                                    <div style={styles.ticketResult}>
                                        <div style={styles.resultHeader}>
                                            <span style={styles.badge}>{scannedTicket.checked_in ? 'Checked In' : 'Valid Ticket'}</span>
                                            {scannedTicket.checked_in && (
                                                <div style={styles.checkedInTime}>
                                                    {new Date(scannedTicket.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div style={styles.ticketInfo}>
                                            <div style={styles.holderName}>{scannedTicket.holder_name}</div>
                                            <div style={styles.ticketCode}>{scannedTicket.ticket_code}</div>
                                        </div>

                                        {!scannedTicket.checked_in ? (
                                            <button 
                                                onClick={handleCheckIn} 
                                                disabled={processing}
                                                style={styles.checkInBtn}
                                            >
                                                {processing ? 'Processing...' : 'Check In Now'}
                                            </button>
                                        ) : (
                                            <button onClick={resetScanner} style={styles.scanNextBtn}>Next Scan</button>
                                        )}
                                        
                                        {!scannedTicket.checked_in && (
                                            <button onClick={resetScanner} style={styles.cancelBtn}>Cancel</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'guestlist' && (
                            <div style={styles.listContainer}>
                                <div style={styles.listHeader}>
                                    <span style={styles.countText}>{guestlist.length} Tickets total</span>
                                    <button 
                                        onClick={fetchGuestlist} 
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
                                        </div>
                                        {guestlist.length === 0 ? (
                                            <div style={styles.placeholderText}>No tickets sold yet.</div>
                                        ) : (
                                            guestlist.map((t) => (
                                                <div key={t.id} style={styles.tableRow}>
                                                    <span style={{ flex: 1.5, fontWeight: 500 }}>{t.holder_name}</span>
                                                    <span style={{ flex: 1 }}>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '10px',
                                                            backgroundColor: t.checked_in ? 'rgba(74, 103, 65, 0.1)' : 'rgba(0,0,0,0.05)',
                                                            color: t.checked_in ? 'var(--accent)' : 'var(--ink-muted)',
                                                            fontWeight: '600',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {t.checked_in ? 'IN' : 'WAIT'}
                                                        </span>
                                                    </span>
                                                    <span style={{ flex: 0.8, textAlign: 'right', fontFamily: 'monospace', opacity: 0.6 }}>{t.ticket_code}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

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
        fontFamily: "'Caveat', cursive",
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
    scannerPlaceholder: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        color: 'var(--ink-muted)',
        fontFamily: "'Caveat', cursive",
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
