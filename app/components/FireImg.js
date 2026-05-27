'use client';

import { useState, useEffect, useRef } from 'react';

export default function FireImg({ className, hovered }) {
    const canvasRef = useRef(null);
    const [imgKey, setImgKey] = useState(0);

    useEffect(() => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
        };
        img.src = '/fire1.png';
    }, []);

    useEffect(() => {
        if (hovered) setImgKey(k => k + 1);
    }, [hovered]);

    return (
        <>
            <canvas ref={canvasRef} className={className} style={{ display: hovered ? 'none' : 'block' }} />
            <img key={imgKey} src="/fire1.png" alt="" className={className} style={{ display: hovered ? 'block' : 'none' }} />
        </>
    );
}
