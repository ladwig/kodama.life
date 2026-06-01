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
import { playKeyboard, preloadSounds } from '@/lib/sounds';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const MIN_PRICE = 30;
const MAX_QUANTITY = 10;

// ─── Payment Screen ───────────────────────────────────────────────────────
function PaymentScreen({ total, totalWithFee, quantity, pricePerTicket, holderNames, onBack }) {
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
            setPayError(error.message || 'Payment failed.');
            setPaying(false);
        }
    }

    return (
        <div className={styles.paymentScreen}>
            {/* Stripe Payment Element */}
            <form onSubmit={handlePay} className={styles.paymentForm}>
                {!ready && (
                    <div className={styles.stripeLoading}>
                        <div className={styles.spinner} />
                        <span>Loading payment methods…</span>
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
                    className="btn-raw btn-raw-full"
                    disabled={!ready || paying}
                    onClick={playKeyboard}
                >
                    {paying ? 'One moment…' : `Pay · €${totalWithFee.toFixed(2)}`}
                </button>
                <p className={styles.feeNote}>* 1,5 % + 0,25 € Transaktionsgebühren anfallen</p>
            </form>

        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function TicketsPage() {
    const [buyerName, setBuyerName] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [donation, setDonation] = useState(0);
    const pricePerTicket = MIN_PRICE + donation;
    const [holderNames, setHolderNames] = useState(['']);
    const [holder0Touched, setHolder0Touched] = useState(false);

    const [groupDeal, setGroupDeal] = useState(false);
    const [step, setStep] = useState('form'); // 'form' | 'payment'
    const [clientSecret, setClientSecret] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => { preloadSounds(); }, []);

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

    const billedQuantity = groupDeal ? quantity - 1 : quantity;
    const total = billedQuantity * pricePerTicket;
    // Fee-inclusive amount charged to Stripe: covers 1.5% + €0.25 per transaction
    const totalWithFee = Math.ceil((total * 100 + 25) / 0.985) / 100;

    function handleGroupDeal(checked) {
        setGroupDeal(checked);
        if (checked) setQuantity(4);
        else setQuantity(1);
    }

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
                    group_deal: groupDeal,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error');

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
                    colorPrimary: '#000000',
                    colorBackground: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    borderRadius: '2px',
                    colorText: '#000000',
                    colorTextSecondary: 'rgba(0,0,0,0.5)',
                    colorDanger: '#c0392b',
                    spacingUnit: '4px',
                },
                rules: {
                    '.Input': {
                        border: '3px solid #000',
                        boxShadow: 'none',
                        fontWeight: '700',
                        fontSize: '16px', /* 16px prevents iOS zoom */
                        backgroundColor: 'transparent',
                    },
                    '.Input:focus': {
                        border: '3px solid #000',
                        boxShadow: 'none',
                        outline: 'none',
                    },
                    '.Label': {
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        fontSize: '0.65rem',
                        letterSpacing: '0.06em',
                        color: 'rgba(0,0,0,0.5)',
                    },
                    '.Tab': {
                        border: '3px solid #000',
                        boxShadow: 'none',
                        backgroundColor: 'transparent',
                        borderRadius: '0',
                    },
                    '.Tab:hover': {
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                    },
                    '.Tab--selected': {
                        border: '3px solid #000',
                        boxShadow: 'none',
                        backgroundColor: '#000',
                        color: '#fff',
                    },
                    '.Tab--selected:hover': {
                        backgroundColor: '#000',
                        boxShadow: 'none',
                    },
                    '.TabIcon--selected': {
                        fill: '#fff',
                    },
                    '.TabLabel--selected': {
                        color: '#fff',
                    },
                    '.Block': {
                        border: '3px solid #000',
                        boxShadow: 'none',
                        borderRadius: '0',
                        backgroundColor: 'transparent',
                    },
                },
            },
        }
        : null;

    return (
        <main className={styles.container}>
            <div className={styles.content}>

                {/* ── Header ── */}
                <div className={styles.header}>
                    {step === 'form'
                        ? <Link href="/" className={styles.backIcon} aria-label="Back" onClick={playKeyboard}><img src="/arrow.svg" alt="←" width={16} height={15} style={{ transform: 'rotate(180deg)' }} /></Link>
                        : <button type="button" className={styles.backIcon} onClick={() => { playKeyboard(); handleBack(); }} aria-label="Back"><img src="/arrow.svg" alt="←" width={16} height={15} style={{ transform: 'rotate(180deg)' }} /></button>
                    }
                    <h1 className={styles.title}>
                        {step === 'form' ? 'Join the Sidequest' : 'Payment'}
                    </h1>
                </div>

                {/* ── Form ── */}
                {step === 'form' && (
                    <form onSubmit={handleOrder} className={styles.form}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>You</h2>
                            <div className={styles.fieldGroup}>
                                <input type="text" value={buyerName}
                                    onChange={(e) => setBuyerName(e.target.value)}
                                    className={styles.input} placeholder="Full name" required />
                                <input type="email" value={buyerEmail}
                                    onChange={(e) => setBuyerEmail(e.target.value)}
                                    className={styles.input} placeholder="Email" required />
                                <input type="tel" value={buyerPhone}
                                    onChange={(e) => setBuyerPhone(e.target.value)}
                                    className={styles.input} placeholder="Phone (optional)" />
                            </div>
                        </section>

                        <section className={styles.section}>
                            <div className={styles.stepper}>
                                <span className={styles.sectionTitle}>How many</span>
                                <button type="button" className={styles.stepperBtn}
                                    onClick={() => { playKeyboard(); setQuantity((q) => Math.max(1, q - 1)); }}
                                    disabled={quantity <= 1 || groupDeal} aria-label="Less">−</button>
                                <span className={styles.stepperValue}>{quantity}</span>
                                <button type="button" className={styles.stepperBtn}
                                    onClick={() => { playKeyboard(); setQuantity((q) => Math.min(MAX_QUANTITY, q + 1)); }}
                                    disabled={quantity >= MAX_QUANTITY || groupDeal} aria-label="More">+</button>
                            </div>
                            <label className={styles.groupDealRow}>
                                <input
                                    type="checkbox"
                                    checked={groupDeal}
                                    onChange={(e) => { playKeyboard(); handleGroupDeal(e.target.checked); }}
                                    className={styles.groupDealCheck}
                                />
                                <span>Group · 4 for the price of 3</span>
                            </label>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Who's coming</h2>
                            <div className={styles.fieldGroup}>
                                {holderNames.map((name, idx) => (
                                    <input key={idx} type="text" value={name}
                                        onChange={(e) => updateHolder(idx, e.target.value)}
                                        className={styles.input} placeholder={`Ticket ${idx + 1}`} required />
                                ))}
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                Ticket Price
                                <span className={styles.priceDisplay}>€{pricePerTicket}</span>
                            </h2>
                            <p className={styles.selfFundedNote}>
                                sidequest is a self-funded, community-driven project. It only happens through donations and volunteering.
                            </p>
                            <div className={styles.priceSteps}>
                                {[0, 5, 10, 15, 20, 25, 30].map((d) => (
                                    <button key={d} type="button"
                                        className={`${styles.priceStep} ${donation === d ? styles.priceStepActive : ''}`}
                                        onClick={() => { playKeyboard(); setDonation(d); }}>
                                        {d === 0 ? '€30' : `€${MIN_PRICE + d}`}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {formError && <p className={styles.errorText}>{formError}</p>}

                        <button type="submit" id="order-btn" className="btn-raw btn-raw-full" disabled={loading} onClick={playKeyboard}>
                            {loading ? 'One moment…' : (
                                groupDeal
                                    ? <>Join · <s>€{quantity * pricePerTicket}</s>{' '}€{total}</>
                                    : `Join · €${total}`
                            )}
                        </button>
                    </form>
                )}

                {/* ── Payment screen ── */}
                {step === 'payment' && clientSecret && stripeOptions && (
                    <Elements stripe={stripePromise} options={stripeOptions}>
                        <PaymentScreen
                            total={total}
                            totalWithFee={totalWithFee}
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
