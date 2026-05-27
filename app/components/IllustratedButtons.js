'use client';

import { useState } from 'react';
import Link from 'next/link';
import FireImg from './FireImg';
import { playKeyboard } from '@/lib/sounds';
import styles from './IllustratedButtons.module.css';

export default function IllustratedButtons({ ticketHref = '/tickets' }) {
    const [btnHovered, setBtnHovered] = useState(false);

    return (
        <div className={styles.illustratedBtns}>
            <Link
                href={ticketHref}
                className={styles.illustratedBtn}
                onClick={playKeyboard}
                onMouseEnter={() => setBtnHovered(true)}
                onMouseLeave={() => setBtnHovered(false)}
            >
                <FireImg className={styles.illustratedBtnImgLeft} hovered={btnHovered} />
                <span className={styles.illustratedBtnLabel}>JOIN THE QUEST</span>
                <FireImg className={styles.illustratedBtnImgRight} hovered={btnHovered} />
            </Link>
            <a
                href="https://t.me/+RjM5ar5Y-Y81MGFi"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.illustratedBtn}
                onClick={playKeyboard}
            >
                <img src="/cerchio3.png" alt="" className={styles.illustratedBtnCircle} />
                <span className={styles.illustratedBtnLabel}>ENTER TELEGRAM GROUP</span>
            </a>
        </div>
    );
}
