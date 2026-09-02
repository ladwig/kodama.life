import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import styles from './gallery.module.css';
import { EVENT } from '@/lib/event';

export const metadata = { title: `What we built — ${EVENT.name}` };

// ponytail: no list to maintain — drop files into public/gallery/ and they show up
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

function photos() {
    try {
        return fs.readdirSync(path.join(process.cwd(), 'public', 'gallery'))
            .filter((f) => EXT.test(f))
            .sort();
    } catch {
        return [];
    }
}

export default function GalleryPage() {
    const files = photos();

    return (
        <main className={styles.container}>
            <Link href="/" className={styles.backLink}>←</Link>

            <div className={styles.inner}>
                <p className={styles.subtitle}>
                    Months of hauling, hammering and hoping, in the woods that almost was.
                </p>

                {files.length === 0 ? (
                    <p className={styles.empty}>Photos landing here soon.</p>
                ) : (
                    <div className={styles.grid}>
                        {files.map((f) => (
                            <img key={f} src={`/gallery/${f}`} alt="" className={styles.photo} loading="lazy" />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
