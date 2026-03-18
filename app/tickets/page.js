'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import Link from 'next/link';
import styles from './tickets.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const MIN_PRICE = 25;
const MAX_PRICE = 100;
const STEP = 5;
const MAX_QUANTITY = 10;

// ─── Payment Screen ───────────────────────────────────────────────────────
function PaymentScreen({ total, quantity, pricePerTicket, holderNames, onBack }) {
    const stripe = useStripe();
    const elements = useElements();
    const [ready, setReady] = useState(false);
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState('');

    async function handlePay(e) {
        e.preventDefault();
        if (!stripe || !elements || !ready) return;
        setPaying(true);
        setPayError('');

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/confirmation`,
            },
        });

        if (error) {
            setPayError(error.message || 'Zahlung fehlgeschlagen.');
            setPaying(false);
        }
    }

    return (
        <div className={styles.paymentScreen}>
            {/* Order summary */}
            <div className={styles.orderSummaryCard}>
                {holderNames.length > 0 && (
                    <div className={styles.holderList}>
                        {holderNames.map((name, i) => (
                            <span key={i} className={styles.holderChip}>🌿 {name || 'Ticket ' + (i + 1)}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Stripe Payment Element */}
            <form onSubmit={handlePay} className={styles.paymentForm}>
                {!ready && (
                    <div className={styles.stripeLoading}>
                        <div className={styles.spinner} />
                        <span>Zahlungsmethoden werden geladen…</span>
                    </div>
                )}

                <div style={{ display: ready ? 'block' : 'none' }}>
                    <PaymentElement
                        onReady={() => setReady(true)}
                        options={{
                            layout: 'tabs',
                            terms: {
                                card: 'never',
                                sepaDebit: 'never',
                                ideal: 'never',
                                sofort: 'never',
                                bancontact: 'never',
                                auBecsDebit: 'never',
                            },
                        }}
                    />
                </div>

                {payError && <p className={styles.errorText}>{payError}</p>}

                <button
                    type="submit"
                    id="pay-btn"
                    className={styles.btnPrimary}
                    disabled={!ready || paying}
                >
                    {paying ? 'Zahlung läuft…' : `Jetzt bezahlen · ${total} €`}
                </button>
            </form>

            <button type="button" className={styles.backBtn} onClick={onBack}>
                ← Angaben ändern
            </button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function TicketsPage() {
    const [buyerName, setBuyerName] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [pricePerTicket, setPricePerTicket] = useState(MIN_PRICE);
    const [holderNames, setHolderNames] = useState(['']);
    const [holder0Touched, setHolder0Touched] = useState(false);

    const [step, setStep] = useState('form'); // 'form' | 'payment'
    const [clientSecret, setClientSecret] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        setHolderNames((prev) => {
            const next = [...prev];
            while (next.length < quantity) next.push('');
            return next.slice(0, quantity);
        });
    }, [quantity]);

    useEffect(() => {
        if (!holder0Touched) {
            setHolderNames((prev) => {
                const next = [...prev];
                next[0] = buyerName;
                return next;
            });
        }
    }, [buyerName, holder0Touched]);

    const total = quantity * pricePerTicket;

    function updateHolder(idx, val) {
        if (idx === 0) setHolder0Touched(true);
        setHolderNames((prev) => {
            const next = [...prev];
            next[idx] = val;
            return next;
        });
    }

    async function handleOrder(e) {
        e.preventDefault();
        setFormError('');
        setLoading(true);

        try {
            const res = await fetch('/api/checkout/create-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyer_name: buyerName,
                    buyer_email: buyerEmail,
                    buyer_phone: buyerPhone,
                    quantity,
                    price_per_ticket: pricePerTicket * 100,
                    ticket_holders: holderNames,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Fehler');

            setClientSecret(data.client_secret);
            setStep('payment');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleBack() {
        setStep('form');
        setClientSecret('');
        setFormError('');
    }

    const stripeOptions = clientSecret
        ? {
            clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#4a6741',
                    colorBackground: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    borderRadius: '8px',
                    colorText: '#1a1a1a',
                    colorTextSecondary: '#7a7a6e',
                },
            },
        }
        : null;

    return (
        <main className={styles.container}>
            <Link href="/" className={styles.backLink}>← Zurück</Link>

            <div className={`${styles.card} ${step === 'payment' ? styles.cardPayment : ''}`}>

                {/* ── Step indicator ── */}
                <div className={styles.steps}>
                    <span className={`${styles.step} ${step === 'form' ? styles.stepActive : styles.stepDone}`}>
                        {step === 'payment' ? '✓' : '1'} Angaben
                    </span>
                    <span className={styles.stepLine} />
                    <span className={`${styles.step} ${step === 'payment' ? styles.stepActive : ''}`}>
                        2 Zahlung
                    </span>
                </div>

                {/* ── Header ── */}
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        {step === 'form' ? 'Ticket kaufen' : 'Zahlung'}
                    </h1>
                    <p className={styles.subtitle}>Kodama · 22. August 2026 · Kiekebusch See</p>
                </div>

                {/* ── Form ── */}
                {step === 'form' && (
                    <form onSubmit={handleOrder} className={styles.form}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Deine Daten</h2>
                            <div className={styles.fieldGroup}>
                                <div className={styles.field}>
                                    <label htmlFor="buyer-name" className={styles.label}>Name *</label>
                                    <input id="buyer-name" type="text" value={buyerName}
                                        onChange={(e) => setBuyerName(e.target.value)}
                                        className={styles.input} placeholder="Dein vollständiger Name" required />
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="buyer-email" className={styles.label}>E-Mail *</label>
                                    <input id="buyer-email" type="email" value={buyerEmail}
                                        onChange={(e) => setBuyerEmail(e.target.value)}
                                        className={styles.input} placeholder="deine@email.de" required />
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="buyer-phone" className={styles.label}>
                                        Telefon <span className={styles.optional}>(optional)</span>
                                    </label>
                                    <input id="buyer-phone" type="tel" value={buyerPhone}
                                        onChange={(e) => setBuyerPhone(e.target.value)}
                                        className={styles.input} placeholder="+49 ..." />
                                </div>
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Anzahl Tickets</h2>
                            <div className={styles.stepper}>
                                <button type="button" className={styles.stepperBtn}
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    disabled={quantity <= 1} aria-label="Weniger">−</button>
                                <span className={styles.stepperValue}>{quantity}</span>
                                <button type="button" className={styles.stepperBtn}
                                    onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                                    disabled={quantity >= MAX_QUANTITY} aria-label="Mehr">+</button>
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                Ticket-Inhaber{quantity > 1 ? ' (je Ticket)' : ''}
                            </h2>
                            <div className={styles.fieldGroup}>
                                {holderNames.map((name, idx) => (
                                    <div key={idx} className={styles.field}>
                                        <label htmlFor={`holder-${idx}`} className={styles.label}>
                                            Ticket {idx + 1}
                                        </label>
                                        <input id={`holder-${idx}`} type="text" value={name}
                                            onChange={(e) => updateHolder(idx, e.target.value)}
                                            className={styles.input} placeholder="Name des Inhabers" required />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                Preis pro Ticket
                                <span className={styles.priceDisplay}>{pricePerTicket} €</span>
                            </h2>
                            <p className={styles.priceNote}>
                                Kodama ist ein unkommerzielles Event. Wähle selbst, was es dir wert ist.
                                Mindestpreis: {MIN_PRICE} €.
                            </p>
                            <input id="price-slider" type="range" min={MIN_PRICE} max={MAX_PRICE}
                                step={STEP} value={pricePerTicket}
                                onChange={(e) => setPricePerTicket(Number(e.target.value))}
                                className={styles.slider} />
                            <div className={styles.sliderLabels}>
                                <span>{MIN_PRICE} €</span><span>{MAX_PRICE} €</span>
                            </div>
                            <div className={styles.priceSteps}>
                                {[25, 35, 50, 75, 100].map((p) => (
                                    <button key={p} type="button"
                                        className={`${styles.priceStep} ${pricePerTicket === p ? styles.priceStepActive : ''}`}
                                        onClick={() => setPricePerTicket(p)}>{p} €</button>
                                ))}
                            </div>
                        </section>



                        {formError && <p className={styles.errorText}>{formError}</p>}

                        <button type="submit" id="order-btn" className={styles.btnPrimary} disabled={loading}>
                            {loading ? 'Einen Moment…' : `Weiter zur Zahlung · ${total} €`}
                        </button>
                    </form>
                )}

                {/* ── Payment screen ── */}
                {step === 'payment' && clientSecret && stripeOptions && (
                    <Elements stripe={stripePromise} options={stripeOptions}>
                        <PaymentScreen
                            total={total}
                            quantity={quantity}
                            pricePerTicket={pricePerTicket}
                            holderNames={holderNames.filter(Boolean)}
                            onBack={handleBack}
                        />
                    </Elements>
                )}
            </div>
        </main>
    );
}
