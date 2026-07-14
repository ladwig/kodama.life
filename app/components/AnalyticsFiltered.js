'use client';

import { Analytics } from '@vercel/analytics/next';

// Drop analytics events for the chef portal so internal visits aren't tracked.
export default function AnalyticsFiltered() {
    return (
        <Analytics
            beforeSend={(event) => {
                if (event.url.includes('/chef')) return null;
                return event;
            }}
        />
    );
}
