'use client';

import { useState } from 'react';

export default function ChefPage() {
    const [password, setPassword] = useState('');
    const [authorized, setAuthorized] = useState(false);
    
    // Form data
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [status, setStatus] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // We will verify the password on the actual API call, 
        // but for UX we just enter the "form mode" here.
        if (password.length > 0) {
            setAuthorized(true);
        }
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
                if (res.status === 401) setAuthorized(false); // Kick back to login if wrong
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
            `}} />
            
            <div className="chef-container" style={styles.container}>
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
        maxWidth: '440px',
        backgroundColor: '#fff',
        padding: '3rem',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg, 0 8px 40px rgba(0,0,0,0.08))',
        border: '1px solid var(--border, rgba(26, 26, 26, 0.08))',
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
    }
};
