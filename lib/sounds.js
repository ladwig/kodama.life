let kb1 = null;
let kb2 = null;
let sfxSuccess = null;

function load(src) {
    if (typeof window === 'undefined') return null;
    const a = new Audio(src);
    a.preload = 'auto';
    a.load();
    return a;
}

// Preload eagerly — call this on mount, runs in background without blocking
export function preloadSounds() {
    if (typeof window === 'undefined') return;
    if (!kb1) kb1 = load('/sounds/keyboard1.wav');
    if (!kb2) kb2 = load('/sounds/keyboard2.wav');
    if (!sfxSuccess) sfxSuccess = load('/sounds/success.wav');
}

// Reuse the same Audio element (reset currentTime) so iOS gesture trust is preserved.
// cloneNode() breaks the gesture chain on iOS — the clone is never considered gesture-unlocked.
export function playKeyboard() {
    if (typeof window === 'undefined') return;
    if (!kb1) kb1 = load('/sounds/keyboard1.wav');
    if (!kb2) kb2 = load('/sounds/keyboard2.wav');
    const src = Math.random() < 0.5 ? kb1 : kb2;
    src.currentTime = 0;
    src.play().catch(() => {});
}

export function playSuccess() {
    if (typeof window === 'undefined') return;
    if (!sfxSuccess) sfxSuccess = load('/sounds/success.wav');
    sfxSuccess.currentTime = 0;
    sfxSuccess.play().catch(() => {});
}
