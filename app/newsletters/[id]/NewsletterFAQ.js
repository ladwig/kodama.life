'use client';

import { useState } from 'react';
import { FAQ_ITEMS } from '@/lib/faq';
import styles from './newsletter.module.css';

export default function NewsletterFAQ() {
    const [open, setOpen] = useState(null);
    return (
        <div className={styles.faq}>
            <p className={styles.faqLabel}>FAQ</p>
            {FAQ_ITEMS.map((item, i) => (
                <div key={i} className={styles.faqItem}>
                    <hr className={styles.faqDivider} />
                    <button
                        className={styles.faqQuestion}
                        onClick={() => setOpen(open === i ? null : i)}
                        aria-expanded={open === i}
                    >
                        {item.q}
                        <span className={styles.faqToggle} aria-hidden="true">{open === i ? '−' : '+'}</span>
                    </button>
                    {open === i && (
                        <p className={styles.faqAnswer}>{item.a}</p>
                    )}
                </div>
            ))}
            <hr className={styles.faqDivider} />
        </div>
    );
}
