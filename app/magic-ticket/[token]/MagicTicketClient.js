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
import styles from '../../tickets/tickets.module.css';
import { playKeyboard, preloadSounds } from '@/lib/sounds';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function PaymentScreen({ totalWithFee, onBack }) {
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
                            wallets: { link: 'never' },
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
                <p className={styles.feeNote}>* includes 1.5% + €0.25 processing fee</p>
            </form>
        </div>
    );
}

export default function MagicTicketClient({ minPrice, token, remaining = 1 }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [amount, setAmount] = useState(String(minPrice));
    const [quantity, setQuantity] = useState(1);
    const [step, setStep] = useState('form');
    const [clientSecret, setClientSecret] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => { preloadSounds(); }, []);

    const amountNum = parseInt(amount, 10) || 0;
    const totalWithFee = Math.ceil((amountNum * quantity * 100 + 25) / 0.985) / 100;

    async function handleOrder(e) {
        e.preventDefault();
        setFormError('');

        if (!name.trim()) { setFormError('Please enter your name.'); return; }
        if (!email.includes('@')) { setFormError('Please enter a valid email.'); return; }
        if (amountNum < minPrice) { setFormError(`Minimum price is €${minPrice}.`); return; }

        setLoading(true);
        try {
            const res = await fetch('/api/checkout/create-magic-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, buyer_name: name, buyer_email: email, amount: amountNum, quantity }),
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
                    '.Input': { border: '3px solid #000', boxShadow: 'none', fontWeight: '700', fontSize: '16px', backgroundColor: 'transparent' },
                    '.Input:focus': { border: '3px solid #000', boxShadow: 'none', outline: 'none' },
                    '.Label': { fontWeight: '700', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.06em', color: 'rgba(0,0,0,0.5)' },
                    '.Tab': { border: '3px solid #000', boxShadow: 'none', backgroundColor: 'transparent', borderRadius: '0' },
                    '.Tab:hover': { backgroundColor: 'transparent', boxShadow: 'none' },
                    '.Tab--selected': { border: '3px solid #000', boxShadow: 'none', backgroundColor: '#000', color: '#fff' },
                    '.Tab--selected:hover': { backgroundColor: '#000', boxShadow: 'none' },
                    '.TabIcon--selected': { fill: '#fff' },
                    '.TabLabel--selected': { color: '#fff' },
                    '.Block': { border: '3px solid #000', boxShadow: 'none', borderRadius: '0', backgroundColor: 'transparent' },
                },
            },
        }
        : null;

    return (
        <main className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    {step === 'form'
                        ? <Link href="/" className={styles.backIcon} aria-label="Back" onClick={playKeyboard}><img src="/arrow.svg" alt="←" width={16} height={15} style={{ transform: 'rotate(180deg)' }} /></Link>
                        : <button type="button" className={styles.backIcon} onClick={() => { playKeyboard(); handleBack(); }} aria-label="Back"><img src="/arrow.svg" alt="←" width={16} height={15} style={{ transform: 'rotate(180deg)' }} /></button>
                    }
                    <h1 className={styles.title}>
                        {step === 'form' ? 'Claim your ticket' : 'Payment'}
                    </h1>
                </div>

                {step === 'form' && (
                    <form onSubmit={handleOrder} className={styles.form}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>You</h2>
                            <div className={styles.fieldGroup}>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={styles.input}
                                    placeholder="Full name"
                                    required
                                />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.input}
                                    placeholder="Email"
                                    required
                                />
                            </div>
                        </section>

                        {remaining > 1 && (
                            <section className={styles.section}>
                                <div className={styles.stepper}>
                                    <span className={styles.sectionTitle}>How many</span>
                                    <button type="button" className={styles.stepperBtn}
                                        onClick={() => { playKeyboard(); setQuantity((q) => Math.max(1, q - 1)); }}
                                        disabled={quantity <= 1} aria-label="Less">−</button>
                                    <span className={styles.stepperValue}>{quantity}</span>
                                    <button type="button" className={styles.stepperBtn}
                                        onClick={() => { playKeyboard(); setQuantity((q) => Math.min(remaining, q + 1)); }}
                                        disabled={quantity >= remaining} aria-label="More">+</button>
                                </div>
                            </section>
                        )}

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                Price {quantity > 1 && <span style={{ opacity: 0.5, fontWeight: 400 }}>per ticket</span>}
                                <span className={styles.priceDisplay}>€{amountNum || minPrice}</span>
                            </h2>
                            <p className={styles.selfFundedNote}>
                                Minimum price is €{minPrice}. Pay more if you'd like to support the project.
                            </p>
                            <input
                                type="number"
                                min={minPrice}
                                step="1"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={styles.input}
                                placeholder={`€${minPrice}`}
                            />
                        </section>

                        {formError && <p className={styles.errorText}>{formError}</p>}

                        <button
                            type="submit"
                            id="order-btn"
                            className="btn-raw btn-raw-full"
                            disabled={loading}
                            onClick={playKeyboard}
                        >
                            {loading ? 'One moment…' : `Continue · €${(amountNum || minPrice) * quantity}`}
                        </button>
                    </form>
                )}

                {step === 'payment' && clientSecret && stripeOptions && (
                    <Elements stripe={stripePromise} options={stripeOptions}>
                        <PaymentScreen
                            totalWithFee={totalWithFee}
                            onBack={handleBack}
                        />
                    </Elements>
                )}
            </div>
        </main>
    );
}
