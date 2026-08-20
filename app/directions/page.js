import DirectionsClient from './DirectionsClient';

export const metadata = {
    title: 'Directions — sidequest',
    robots: { index: false, follow: false },
};

export default function DirectionsPage() {
    return <DirectionsClient />;
}
