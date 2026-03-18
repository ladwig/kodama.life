"use client";

import { useState } from "react";
import styles from "./SignupForm.module.css";

export default function SignupForm() {
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("idle"); // idle | loading | success | error

    function validateEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Bitte gib deine E-Mail-Adresse ein.");
            return;
        }
        if (!validateEmail(email)) {
            setError("Bitte gib eine gültige E-Mail-Adresse ein.");
            return;
        }

        setStatus("loading");

        try {
            const res = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Etwas ist schiefgelaufen.");
                setStatus("error");
                return;
            }

            setStatus("success");
        } catch {
            setError("Keine Verbindung. Bitte versuch es erneut.");
            setStatus("error");
        }
    }

    if (status === "success") {
        return (
            <div className={styles.success}>
                <span className={styles.successIcon}>✦</span>
                <p>Du bist dabei. Bis bald im Wald.</p>
            </div>
        );
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.fields}>
                <div className={styles.inputWrapper}>
                    <input
                        id="signup-email"
                        type="email"
                        className={styles.input}
                        placeholder="deine@email.de"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status === "loading"}
                        autoComplete="email"
                        aria-label="E-Mail-Adresse"
                    />
                </div>

                <div className={styles.inputWrapper}>
                    <input
                        id="signup-phone"
                        type="tel"
                        className={styles.input}
                        placeholder="+49 ... (optional)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={status === "loading"}
                        autoComplete="tel"
                        aria-label="Telefonnummer (optional)"
                    />
                </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
                id="signup-submit"
                type="submit"
                className={styles.button}
                disabled={status === "loading"}
            >
                {status === "loading" ? (
                    <span className={styles.spinner} />
                ) : (
                    "Anmelden"
                )}
            </button>
        </form>
    );
}
