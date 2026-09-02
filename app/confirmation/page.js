import { Suspense } from 'react';
import ConfirmationClient from './ConfirmationClient';
import { EVENT } from '@/lib/event';

export const metadata = {
    title: EVENT.name,
};

export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: '1.5rem', color: '#3a3a3a' }}>Laden…</div>}>
            <ConfirmationClient />
        </Suspense>
    );
}
