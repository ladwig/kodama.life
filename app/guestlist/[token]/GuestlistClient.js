'use client';

import { useState } from 'react';
import styles from '../../tickets/tickets.module.css';

const BASE = ''; // same-origin

export default function GuestlistClient({ token, label, max, initialGuests }) {
    const [guests, setGuests] = useState(initialGuests);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const remaining = max - guests.length;

    async function call(body) {
        const res = await fetch(`${BASE}/api/guestlist/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong.');
        return data;
    }

    async function addGuest(e) {
        e.preventDefault();
        setError('');
        if (!newName.trim()) { setError('Enter a name.'); return; }
        setBusy(true);
        try {
            const { guest } = await call({ action: 'issue', name: newName.trim(), email: newEmail.trim() });
            setGuests((g) => [...g, guest]);
            setNewName('');
            setNewEmail('');
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Guestlist{label ? ` · ${label}` : ''}</h1>
                </div>

                <p className={styles.selfFundedNote} style={{ marginBottom: '1.5rem' }}>
                    {remaining > 0
                        ? `${guests.length} of ${max} issued · ${remaining} left. Add a name to issue a free ticket.`
                        : `Full — all ${max} tickets issued.`}
                </p>

                {guests.map((guest) => (
                    <GuestRow key={guest.orderId} guest={guest} token={token}
                        onUpdate={(updated) => setGuests((g) => g.map((x) => x.orderId === guest.orderId ? updated : x))}
                        onRemove={() => setGuests((g) => g.filter((x) => x.orderId !== guest.orderId))}
                    />
                ))}

                {remaining > 0 && (
                    <form onSubmit={addGuest} className={styles.section} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.15)', paddingTop: '1rem', marginTop: '1rem' }}>
                        <h2 className={styles.sectionTitle}>Add guest</h2>
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                            className={styles.input} placeholder="Guest name" />
                        <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                            className={styles.input} placeholder="Email (optional — sends the ticket)" />
                        {error && <p className={styles.errorText}>{error}</p>}
                        <button type="submit" className="btn-raw btn-raw-full" disabled={busy}>
                            {busy ? 'One moment…' : 'Issue ticket'}
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}

function GuestRow({ guest, token, onUpdate, onRemove }) {
    const [name, setName] = useState(guest.name);
    const [email, setEmail] = useState(guest.email);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const dirtyName = name.trim() !== guest.name;
    const dirtyEmail = email.trim() !== guest.email;

    async function call(body) {
        const res = await fetch(`/api/guestlist/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong.');
        return data;
    }

    async function save() {
        setError('');
        setBusy(true);
        try {
            // Rename first (keeps code), then email change (recreates with new code)
            if (dirtyName && name.trim()) {
                await call({ action: 'rename', orderId: guest.orderId, name: name.trim() });
            }
            if (dirtyEmail) {
                const { guest: fresh } = await call({ action: 'changeEmail', orderId: guest.orderId, email: email.trim() });
                onUpdate({ ...fresh, downloadToken: fresh.downloadToken });
            } else if (dirtyName) {
                onUpdate({ ...guest, name: name.trim() });
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (!confirm(`Remove ${guest.name}? This frees the slot and invalidates their ticket.`)) return;
        setBusy(true);
        try {
            await call({ action: 'remove', orderId: guest.orderId });
            onRemove();
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    const dirty = dirtyName || dirtyEmail;

    return (
        <div className={styles.section} style={{ borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${guest.code}`}
                    alt={guest.code} width={64} height={64} style={{ flexShrink: 0 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    <div style={{ fontFamily: "'Funnel Display', sans-serif", fontWeight: 700, letterSpacing: '0.04em' }}>{guest.code}</div>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                        className={styles.input} placeholder="Name" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className={styles.input} placeholder="Email (optional)" />
                </div>
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {dirty && (
                    <button type="button" className="btn-raw" onClick={save} disabled={busy} style={{ flex: 1 }}>
                        {busy ? '…' : (saved ? '✓ Saved' : 'Save')}
                    </button>
                )}
                {guest.downloadToken && (
                    <a href={`/api/tickets/download?token=${guest.downloadToken}`} className="btn-raw" style={{ flex: 1, textAlign: 'center' }}>
                        Download
                    </a>
                )}
                <button type="button" className="btn-raw" onClick={remove} disabled={busy} style={{ flex: 1 }}>
                    Remove
                </button>
            </div>
        </div>
    );
}
