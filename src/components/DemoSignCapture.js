import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { translateTextToSigns } from '../api/translation';
import { WORD_SECONDS } from '../demo/script';
import SignGif from './SignGif';
import { CloseIcon, SendIcon } from './icons';
/**
 * DEMO: full-screen camera where the patient signs the scripted line one
 * word per round. Each round reveals the next scripted word; the result is
 * always the scripted sentence.
 */
export default function DemoSignCapture({ line, onSend, onClose }) {
    const words = line.words ?? [];
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [camera, setCamera] = useState('starting');
    const [found, setFound] = useState(0);
    const [remaining, setRemaining] = useState(WORD_SECONDS);
    const [run, setRun] = useState(0);
    const [signs, setSigns] = useState([]);
    const done = found >= words.length;
    useEffect(() => { void translateTextToSigns(line.text).then((t) => setSigns(t.signs)); }, [line.text]);
    // Camera (preview only).
    useEffect(() => {
        let live = true;
        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                if (!live) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current)
                    videoRef.current.srcObject = stream;
                setCamera('on');
            }
            catch {
                if (live)
                    setCamera('none');
            }
        };
        void start();
        return () => {
            live = false;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, []);
    // One countdown round per word.
    useEffect(() => {
        if (camera === 'starting' || done)
            return;
        const began = performance.now();
        const timer = window.setInterval(() => {
            const left = WORD_SECONDS - (performance.now() - began) / 1000;
            if (left <= 0) {
                window.clearInterval(timer);
                setRemaining(WORD_SECONDS);
                setFound((value) => value + 1);
            }
            else
                setRemaining(Math.ceil(left));
        }, 100);
        return () => window.clearInterval(timer);
    }, [camera, done, found, run]);
    const restart = () => {
        setFound(0);
        setRemaining(WORD_SECONDS);
        setRun((value) => value + 1);
    };
    const sentence = done ? line.text : words.slice(0, found).map((word) => word.label).join(' ');
    return (_jsxs("div", { className: "fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/85 p-3 backdrop-blur-md sm:p-6", role: "dialog", "aria-modal": "true", "aria-label": "\u101C\u1000\u103A\u101F\u1014\u103A\u1016\u103C\u1004\u1037\u103A \u1005\u102C\u1015\u102D\u102F\u1037\u101B\u1014\u103A", children: [_jsxs("div", { className: "relative aspect-[3/4] max-h-[72dvh] w-full max-w-3xl overflow-hidden rounded-3xl border-4 border-[#ff7a00] bg-black shadow-[0_0_40px_rgba(255,122,0,0.3)] sm:aspect-video", children: [_jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, muted: true, className: `h-full w-full scale-x-[-1] object-cover ${done ? 'opacity-30' : ''}` }), camera === 'starting' && (_jsx("p", { className: "absolute inset-0 grid place-items-center text-2xl font-bold text-white", role: "status", children: "\u1000\u1004\u103A\u1019\u101B\u102C\u1016\u103D\u1004\u1037\u103A\u1014\u1031\u101E\u100A\u103A\u2026" })), !done && camera !== 'starting' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "absolute left-3 top-3 flex flex-col gap-2", children: [_jsxs("span", { className: "flex w-fit items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold tracking-wider text-white shadow-lg", children: [_jsx("span", { className: "h-2.5 w-2.5 animate-pulse rounded-full bg-white", "aria-hidden": "true" }), " \u1000\u1004\u103A\u1019\u101B\u102C \u1016\u103D\u1004\u1037\u103A\u1011\u102C\u1038"] }), _jsx("span", { className: "flex w-fit items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg", role: "status", children: "\u270B \u101C\u1000\u103A\u101F\u1014\u103A \u1016\u1010\u103A\u1014\u1031\u101E\u100A\u103A" })] }), _jsxs("div", { className: "absolute right-3 top-3 rounded-2xl bg-black/70 px-5 py-3 text-center text-white", role: "timer", "aria-label": "\u101A\u1001\u102F\u101C\u1000\u103A\u101F\u1014\u103A\u1021\u1010\u103D\u1000\u103A \u1000\u103B\u1014\u103A\u1001\u103B\u102D\u1014\u103A", children: [_jsxs("div", { className: "text-sm", children: ["\u101C\u1000\u103A\u101F\u1014\u103A ", found + 1, " / ", words.length] }), _jsx("div", { className: "text-5xl font-bold tabular-nums", children: remaining })] })] })), _jsxs("div", { className: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-5 pt-12 text-center", children: [!done && found > 0 && (_jsx("div", { className: "mb-2 flex flex-wrap justify-center gap-2", children: words.slice(0, found).map((word, index) => (_jsx("span", { className: "rounded-full bg-[#ff7a00] px-4 py-1 text-xl font-bold text-white shadow", children: word.label }, `${word.id}-${index}`))) })), done ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-lg font-semibold text-orange-200", children: "\u1024\u1005\u102C\u1000\u102D\u102F \u1006\u101B\u102C\u101D\u1014\u103A\u1011\u1036 \u1015\u102D\u102F\u1037\u1019\u101C\u102C\u1038\u104B" }), _jsxs("div", { className: "mt-3 flex items-center justify-center gap-4", children: [_jsx(SignGif, { signs: signs, label: "\u101E\u1004\u103A\u104F \u101C\u1000\u103A\u101F\u1014\u103A", className: "w-32 shrink-0 sm:w-40" }), _jsx("p", { className: "text-left text-3xl font-bold leading-snug text-white", "aria-live": "polite", children: sentence })] })] })) : (_jsx("p", { className: "text-3xl font-bold leading-snug text-white drop-shadow", "aria-live": "polite", children: found ? '' : 'လက်ဟန်ပြပါ' }))] })] }), _jsxs("div", { className: "flex w-full max-w-3xl flex-wrap justify-center gap-3", children: [done ? (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", onClick: () => onSend(line.text), className: "flex min-h-16 flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#ff7a00] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98]", children: [_jsx(SendIcon, {}), " \u1015\u102D\u102F\u1037\u101B\u1014\u103A"] }), _jsx("button", { type: "button", onClick: restart, className: "min-h-16 flex-1 cursor-pointer rounded-2xl border-2 border-white/60 bg-white/10 px-6 text-xl font-bold text-white hover:bg-white/20", children: "\u1015\u103C\u1014\u103A\u1015\u103C\u101B\u1014\u103A" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => setFound(words.length), disabled: camera === 'starting', className: "min-h-16 flex-[2] cursor-pointer rounded-2xl bg-[#ff7a00] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98] disabled:opacity-50", children: "\u1015\u103C\u102E\u1038\u1015\u102B\u1015\u103C\u102E" }), _jsx("button", { type: "button", onClick: restart, disabled: camera === 'starting', className: "min-h-16 flex-1 cursor-pointer rounded-2xl border-2 border-white/60 bg-white/10 px-6 text-xl font-bold text-white hover:bg-white/20 disabled:opacity-50", children: "\u1015\u103C\u1014\u103A\u1005\u101B\u1014\u103A" })] })), _jsxs("button", { type: "button", onClick: onClose, "aria-label": "\u1015\u102D\u1010\u103A\u101B\u1014\u103A", className: "flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-white/60 bg-white/10 px-5 text-xl font-bold text-white hover:bg-white/20", children: [_jsx(CloseIcon, {}), " \u1015\u102D\u1010\u103A\u101B\u1014\u103A"] })] }), !done && (_jsxs("p", { className: "max-w-3xl rounded-xl bg-black/40 px-5 py-2 text-center text-lg text-white", children: [WORD_SECONDS, " \u1005\u1000\u1039\u1000\u1014\u1037\u103A\u1021\u1010\u103D\u1004\u103A\u1038 \u1005\u1000\u102C\u1038\u101C\u102F\u1036\u1038\u1010\u1005\u103A\u101C\u102F\u1036\u1038\u1001\u103B\u1004\u103A\u1038 \u101C\u1000\u103A\u101F\u1014\u103A\u1015\u103C\u1015\u102B\u104B"] }))] }));
}
