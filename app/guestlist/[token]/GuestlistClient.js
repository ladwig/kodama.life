'use client';

import { useState } from 'react';
import styles from '../../tickets/tickets.module.css';

async function call(token, body) {
    const res = await fetch(`/api/guestlist/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
}

export default function GuestlistClient({ token, label, max, initialGuests }) {
    const [guests, setGuests] = useState(initialGuests);
    const used = guests.length;

    // One row per slot: issued guests first, then empty slots up to the cap.
    const rows = [];
    for (let i = 0; i < max; i++) rows.push(guests[i] || null);

    return (
        <main className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Guestlist{label ? ` · ${label}` : ''}</h1>
                </div>

                <p className={styles.selfFundedNote} style={{ marginBottom: '1.5rem' }}>
                    {used} of {max} issued. Enter a name and save to issue a free ticket. Add an email to send it too.
                </p>

                {rows.map((guest, i) => (
                    <GuestRow
                        key={guest ? guest.orderId : `empty-${i}`}
                        guest={guest}
                        index={i}
                        token={token}
                        onIssued={(g) => setGuests((prev) => [...prev, g])}
                        onUpdate={(g) => setGuests((prev) => prev.map((x) => x.orderId === guest.orderId ? g : x))}
                    />
                ))}
            </div>
        </main>
    );
}

function GuestRow({ guest, index, token, onIssued, onUpdate }) {
    const [name, setName] = useState(guest?.name || '');
    const [email, setEmail] = useState(guest?.email || '');
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const issued = !!guest;
    const dirty = issued
        ? (name.trim() !== guest.name || email.trim() !== guest.email)
        : name.trim().length > 0;

    async function save() {
        setError('');
        if (!name.trim()) { setError('Enter a name.'); return; }
        setBusy(true);
        try {
            if (!issued) {
                // Empty slot → issue a new ticket
                const { guest: g } = await call(token, { action: 'issue', name: name.trim(), email: email.trim() });
                onIssued(g);
                setName('');
                setEmail('');
            } else {
                // Rename first (keeps code), then email change (revokes + reissues)
                if (name.trim() !== guest.name) {
                    await call(token, { action: 'rename', orderId: guest.orderId, name: name.trim() });
                }
                if (email.trim() !== guest.email) {
                    const { guest: g } = await call(token, { action: 'changeEmail', orderId: guest.orderId, email: email.trim() });
                    onUpdate(g);
                } else {
                    onUpdate({ ...guest, name: name.trim() });
                }
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.6rem 0', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ width: '1.4rem', flexShrink: 0, fontSize: '0.8rem', opacity: 0.5, fontWeight: 700 }}>{index + 1}</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className={styles.input} placeholder="Name" style={{ flex: 2, minWidth: 0 }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={styles.input} placeholder="Email (optional)" style={{ flex: 2, minWidth: 0 }} />
                <button type="button" onClick={save} disabled={busy || (!dirty)} className="btn-raw"
                    style={{ flexShrink: 0, padding: '0 0.7rem', opacity: (busy || !dirty) ? 0.4 : 1 }}>
                    {busy ? '…' : (saved ? '✓' : 'Save')}
                </button>
                {issued && guest.downloadToken && (
                    <a href={`/api/tickets/download?token=${guest.downloadToken}`} className="btn-raw"
                        title="Download ticket" style={{ flexShrink: 0, padding: '0 0.6rem', textDecoration: 'none' }}>
                        ↓
                    </a>
                )}
            </div>
            {issued && <div style={{ paddingLeft: '1.8rem', fontSize: '0.72rem', opacity: 0.6, fontFamily: "'Funnel Display', sans-serif", letterSpacing: '0.04em' }}>{guest.code}</div>}
            {error && <p className={styles.errorText} style={{ paddingLeft: '1.8rem', margin: 0 }}>{error}</p>}
        </div>
    );
}
