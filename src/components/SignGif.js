import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import fallbackImage from '../assets/WarmHands_Traditional_Fallback.png';
import { getRendererStatus, playSigns, subscribeRendererStatus } from '../animation/signRenderer';
import { HandIcon } from './icons';
/** A looping, GIF-like MSL animation of the Warm Hands character. */
export default function SignGif({ signs, label, className = 'w-56 sm:w-64', at }) {
    const canvasRef = useRef(null);
    const playbackRef = useRef(null);
    const [clip, setClip] = useState(-1);
    const status = useSyncExternalStore(subscribeRendererStatus, getRendererStatus);
    const key = signs.join(',');
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !key)
            return;
        const playback = playSigns(canvas, key.split(','), setClip, at);
        playbackRef.current = playback;
        return () => {
            playback.dispose();
            playbackRef.current = null;
        };
    }, [key, at]);
    if (!signs.length) {
        return (_jsxs("div", { className: `flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-orange-50 p-4 text-center text-base text-gray-700 ${className}`, children: [_jsx(HandIcon, { className: "h-10 w-10 text-[#ff7a00]" }), "\u1024\u1005\u102C\u1021\u1010\u103D\u1000\u103A \u101C\u1000\u103A\u101F\u1014\u103A \u1019\u101B\u103E\u102D\u101E\u1031\u1038\u1015\u102B"] }));
    }
    return (_jsxs("button", { type: "button", onClick: () => playbackRef.current?.restart(), "aria-label": `${label} — ထပ်ကြည့်ရန် နှိပ်ပါ`, className: `group relative block aspect-square cursor-pointer overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_center,#fff3e3_0%,#ffe2c0_70%,#ffd3a3_100%)] ${className}`, children: [_jsx("canvas", { ref: canvasRef, className: "absolute inset-0 h-full w-full", "aria-hidden": "true" }), status === 'fallback' && _jsx("img", { src: fallbackImage, alt: "", className: "absolute inset-0 h-full w-full object-contain" }), (status === 'loading' || status === 'idle') && (_jsx("span", { className: "absolute inset-0 grid place-items-center text-base font-semibold text-[#9a4b00]", children: "\u101C\u1000\u103A\u101F\u1014\u103A \u1015\u103C\u1004\u103A\u1006\u1004\u103A\u1014\u1031\u101E\u100A\u103A\u2026" })), signs.length > 1 && status === 'ready' && (_jsx("span", { className: "absolute inset-x-0 bottom-2 flex justify-center gap-1.5", "aria-hidden": "true", children: signs.map((id, index) => (_jsx("span", { className: `h-2 rounded-full transition-all ${index === clip ? 'w-5 bg-[#ff7a00]' : 'w-2 bg-[#ff7a00]/35'}` }, `${id}-${index}`))) })), _jsx("span", { className: "absolute right-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-xs font-bold text-[#9a4b00] opacity-80 group-hover:opacity-100", children: "MSL \u21BB" })] }));
}
