import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import MessageBubble, { Avatar } from './MessageBubble';
import Notification from './Notification';
import DemoSignCapture from './DemoSignCapture';
import { DOCTOR_LINES, patientLine } from '../demo/script';
import StatusPill, {} from './StatusPill';
import { CameraIcon, HandIcon, MicIcon, SendIcon } from './icons';
import { getJoinAddresses, joinRoom, SENDER, newMessageId, } from '../api/conversation';
import { translateTextToSigns } from '../api/translation';
import { useSpeechInput } from '../hooks/useSpeechInput';
const LINK = {
    online: ['ချိတ်ဆက်ပြီး', 'ok'],
    connecting: ['ချိတ်ဆက်နေသည်…', 'busy'],
    local: ['ဤစက်တွင်သာ', 'busy'],
    offline: ['ချိတ်ဆက်မှု ပြတ်နေ', 'warn'],
};
const MIC = {
    ready: ['မိုက် အဆင်သင့်', 'off'],
    listening: ['မိုက် နားထောင်နေ', 'busy'],
    blocked: ['မိုက် ခွင့်မပြု', 'warn'],
    unsupported: ['မိုက် မရနိုင်', 'warn'],
};
const CAMERA = {
    off: ['ကင်မရာ ပိတ်ထား', 'off'],
    starting: ['ကင်မရာ ဖွင့်နေ…', 'busy'],
    on: ['ကင်မရာ ဖွင့်ထား', 'ok'],
    blocked: ['ကင်မရာ ခွင့်မပြု', 'warn'],
};
const RECOGNIZER = {
    unknown: ['လက်ဟန် AI စစ်နေ…', 'off'],
    ready: ['လက်ဟန် AI အဆင်သင့်', 'ok'],
    offline: ['လက်ဟန် AI မရှိ', 'warn'],
};
// DEMO: the doctor's quick replies are the scripted lines, in order.
const DOCTOR_PHRASES = DOCTOR_LINES.map((line) => line.text);
export default function ConversationScreen({ role, code, onLeave }) {
    const peer = role === 'doctor' ? 'patient' : 'doctor';
    const [messages, setMessages] = useState([]);
    const [delivered, setDelivered] = useState(() => new Set());
    const [link, setLink] = useState('connecting');
    const [presence, setPresence] = useState({ doctor: role === 'doctor', patient: role === 'patient' });
    const [notice, setNotice] = useState('');
    const [addresses, setAddresses] = useState([]);
    const linkRef = useRef(null);
    const listRef = useRef(null);
    useEffect(() => {
        const room = joinRoom(code, role, {
            onStatus: setLink,
            onPresence: setPresence,
            onHistory: (history) => {
                setMessages((current) => {
                    const known = new Set(history.map((message) => message.id));
                    return [...history, ...current.filter((message) => !known.has(message.id))];
                });
                setDelivered((current) => new Set([...current, ...history.map((message) => message.id)]));
            },
            onMessage: (message) => {
                setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
            },
            onAck: (id) => setDelivered((current) => new Set(current).add(id)),
        });
        linkRef.current = room;
        return () => {
            room.close();
            linkRef.current = null;
        };
    }, [code, role]);
    useEffect(() => {
        if (role === 'doctor')
            void getJoinAddresses().then(setAddresses);
    }, [role]);
    // Keep the newest message in view, like a messenger.
    useEffect(() => {
        const list = listRef.current;
        if (list)
            list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }, [messages.length]);
    const send = useCallback(async (text, source) => {
        const clean = text.trim();
        if (!clean)
            return;
        const translation = await translateTextToSigns(clean);
        const message = {
            id: newMessageId(),
            from: role,
            text: clean,
            source,
            signs: translation.signs,
            note: translation.note,
            sentAt: Date.now(),
        };
        setMessages((current) => [...current, message]);
        linkRef.current?.send(message);
    }, [role]);
    const dismiss = useCallback(() => setNotice(''), []);
    const [linkLabel, linkTone] = LINK[link];
    const peerHere = presence[peer];
    const subtitle = link === 'offline'
        ? 'ချိတ်ဆက်မှု ပြတ်နေသည်'
        : peerHere ? 'အွန်လိုင်း' : `ဝင်ရောက်ရန် စောင့်နေသည် · အခန်း ${code}`;
    return (_jsxs("div", { className: "relative z-10 mx-auto flex h-dvh w-full max-w-4xl flex-col bg-white/30 shadow-2xl backdrop-blur-[2px]", children: [_jsx(Notification, { message: notice, onDismiss: dismiss }), _jsxs("header", { className: "flex items-center gap-3 bg-[#ff7a00] px-3 py-2.5 text-white shadow-md sm:px-5", children: [_jsx("button", { type: "button", onClick: onLeave, "aria-label": "\u1005\u1000\u102C\u1038\u1015\u103C\u1031\u102C\u1001\u1014\u103A\u1038\u1019\u103E \u1011\u103D\u1000\u103A\u101B\u1014\u103A", className: "grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-2xl font-bold hover:bg-white/15", children: "\u2190" }), _jsxs("span", { className: "relative", children: [_jsx(Avatar, { role: peer, className: "h-12 w-12 !bg-white !text-[#c25e00]" }), _jsx("span", { className: `absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#ff7a00] ${peerHere ? 'bg-emerald-400' : 'bg-gray-300'}`, "aria-hidden": "true" })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h1", { className: "truncate text-xl font-bold", children: SENDER[peer] }), _jsx("p", { className: "truncate text-sm text-orange-50", children: subtitle })] }), _jsxs("span", { className: "shrink-0 rounded-full bg-white/20 px-3 py-1 text-sm font-bold", children: ["\u101E\u1004\u103A \u00B7 ", SENDER[role]] }), _jsxs("span", { className: "shrink-0 rounded-full bg-white px-3 py-1 text-base font-bold text-[#c25e00]", children: [_jsx("span", { className: "sr-only", children: "\u1021\u1001\u1014\u103A\u1038 " }), _jsx("span", { className: "tabular-nums tracking-widest", children: code })] })] }), _jsxs("div", { className: "flex items-center gap-2 overflow-x-auto border-b border-orange-100 bg-white/90 px-3 py-2 sm:px-5", "aria-label": "\u1021\u1001\u103C\u1031\u1021\u1014\u1031", children: [_jsx(StatusPill, { label: "\u1001\u103B\u102D\u1010\u103A\u1006\u1000\u103A\u1019\u103E\u102F", value: linkLabel, tone: linkTone }), role === 'doctor' ? _jsx(DoctorMicPill, {}) : _jsx(PatientPills, {})] }), _jsxs("div", { ref: listRef, className: "min-h-0 flex-1 overflow-y-auto bg-[#fff7ee]/80 px-2 py-4 sm:px-6", children: [_jsx("p", { className: "mx-auto mb-4 w-fit rounded-full bg-black/20 px-3 py-1 text-sm font-semibold text-white", children: "\u101A\u1014\u1031\u1037" }), role === 'doctor' && !peerHere && _jsx(JoinCard, { code: code, addresses: addresses, compact: messages.length > 0 }), !messages.length && (role === 'patient' || peerHere) && (_jsxs("div", { className: "mx-auto mt-10 max-w-sm rounded-3xl bg-white/90 p-6 text-center text-lg text-gray-800 shadow", children: [_jsx(HandIcon, { className: "mx-auto mb-3 h-12 w-12 text-[#ff7a00]" }), role === 'patient'
                                ? 'ဆရာဝန်၏ စကားကို လက်ဟန်ဖြင့် ပြပေးပါမည်။ သင်ပြောလိုလျှင် အောက်ရှိ ခလုတ်ကို နှိပ်ပါ။'
                                : 'လူနာ ဝင်ရောက်ပြီးပါပြီ။ စာရိုက်ပါ သို့မဟုတ် မိုက်ကိုနှိပ်ပြီး ပြောပါ။'] })), _jsx("ol", { "aria-live": "polite", "aria-relevant": "additions", "aria-label": "\u1019\u1000\u103A\u1006\u1031\u1037\u1001\u103B\u103A\u1019\u103B\u102C\u1038", children: messages.map((message, index) => (_jsx(MessageBubble, { message: message, viewer: role, delivered: delivered.has(message.id), groupStart: messages[index - 1]?.from !== message.from, groupEnd: messages[index + 1]?.from !== message.from }, message.id))) })] }), role === 'doctor'
                ? _jsx(DoctorComposer, { onSend: send, onNotice: setNotice, next: messages.filter((m) => m.from === 'doctor').length })
                : _jsx(PatientComposer, { onSend: (text) => void send(text, 'sign'), sent: messages.filter((m) => m.from === 'patient').length })] }));
}
let deviceStatus = { mic: 'ready', camera: 'off', recognizer: 'unknown' };
const listeners = new Set();
function publishDeviceStatus(next) {
    deviceStatus = { ...deviceStatus, ...next };
    listeners.forEach((listener) => listener());
}
function useDeviceStatus() {
    const [, force] = useState(0);
    useEffect(() => {
        const listener = () => force((value) => value + 1);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }, []);
    return deviceStatus;
}
function DoctorMicPill() {
    const [label, tone] = MIC[useDeviceStatus().mic];
    return _jsx(StatusPill, { label: "\u1019\u102D\u102F\u1000\u103A", value: label, tone: tone });
}
function PatientPills() {
    const status = useDeviceStatus();
    const [cameraLabel, cameraTone] = CAMERA[status.camera];
    const [aiLabel, aiTone] = RECOGNIZER[status.recognizer];
    return (_jsxs(_Fragment, { children: [_jsx(StatusPill, { label: "\u1000\u1004\u103A\u1019\u101B\u102C", value: cameraLabel, tone: cameraTone }), _jsx(StatusPill, { label: "\u101C\u1000\u103A\u101F\u1014\u103A AI", value: aiLabel, tone: aiTone })] }));
}
// ---- Doctor: type or speak ----------------------------------------------------------
function DoctorComposer({ onSend, onNotice, next }) {
    const [text, setText] = useState('');
    const [source, setSource] = useState('typed');
    const speech = useSpeechInput((heard) => {
        setText((current) => (current ? `${current} ${heard}` : heard));
        setSource('voice');
    }, onNotice);
    useEffect(() => { publishDeviceStatus({ mic: speech.status }); }, [speech.status]);
    const submit = () => {
        if (!text.trim())
            return;
        void onSend(text, source);
        setText('');
        setSource('typed');
    };
    const listening = speech.status === 'listening';
    return (_jsxs("div", { className: "border-t border-orange-100 bg-white px-2 pb-3 pt-2 sm:px-4", children: [_jsx("div", { className: "mb-2 flex gap-2 overflow-x-auto pb-1", "aria-label": "\u1021\u1019\u103C\u1014\u103A\u1005\u1000\u102C\u1038\u1005\u102F", children: DOCTOR_PHRASES.map((phrase, index) => (_jsx("button", { type: "button", onClick: () => void onSend(phrase, 'typed'), className: `shrink-0 cursor-pointer rounded-full border-2 px-4 py-1.5 text-base font-semibold hover:border-[#ff7a00] ${index === next ? 'border-[#ff7a00] bg-[#ff7a00] text-white' : 'border-orange-200 bg-orange-50 text-gray-900'}`, children: phrase }, phrase))) }), listening && (_jsxs("p", { className: "mb-2 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-lg font-semibold text-red-800", role: "status", children: [_jsx("span", { className: "h-3 w-3 animate-pulse rounded-full bg-red-500", "aria-hidden": "true" }), "\u1014\u102C\u1038\u1011\u1031\u102C\u1004\u103A\u1014\u1031\u101E\u100A\u103A\u2026 ", speech.interim] })), _jsxs("form", { className: "flex items-end gap-2", onSubmit: (event) => { event.preventDefault(); submit(); }, children: [_jsxs("div", { className: "flex min-w-0 flex-1 items-end rounded-[28px] border-2 border-orange-200 bg-orange-50/60 focus-within:border-[#ff7a00] focus-within:bg-white", children: [_jsx("label", { htmlFor: "doctor-message", className: "sr-only", children: "\u101C\u1030\u1014\u102C\u1011\u1036 \u1015\u102D\u102F\u1037\u1019\u100A\u1037\u103A\u1005\u102C" }), _jsx("textarea", { id: "doctor-message", rows: 1, value: text, onChange: (event) => { setText(event.target.value); if (!event.target.value)
                                    setSource('typed'); }, onKeyDown: (event) => {
                                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                        event.preventDefault();
                                        submit();
                                    }
                                }, placeholder: "\u1019\u1000\u103A\u1006\u1031\u1037\u1001\u103B\u103A \u101B\u102D\u102F\u1000\u103A\u1015\u102B\u2026", className: "max-h-36 min-h-14 min-w-0 flex-1 resize-none bg-transparent px-5 py-3.5 text-xl text-gray-900 outline-none placeholder:text-gray-500" }), _jsx("button", { type: "button", onClick: () => {
                                    if (listening) {
                                        speech.stop();
                                    }
                                    else {
                                        speech.start();
                                    }
                                }, "aria-pressed": listening, "aria-label": listening
                                    ? 'အသံဖမ်းခြင်း ရပ်ရန်'
                                    : 'အသံဖြင့် ပြောရန်', className: `m-1 grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full active:scale-95 ${listening
                                    ? 'bg-red-500 text-white'
                                    : 'text-[#c25e00] hover:bg-orange-100'}`, children: listening ? (_jsx("span", { className: "h-4 w-4 rounded-sm bg-white", "aria-hidden": "true" })) : (_jsx(MicIcon, { className: "h-7 w-7" })) })] }), _jsx("button", { type: "submit", disabled: !text.trim(), "aria-label": "\u1015\u102D\u102F\u1037\u101B\u1014\u103A", className: "grid h-14 w-14 shrink-0 cursor-pointer place-items-center rounded-full bg-[#ff7a00] text-white shadow-md hover:bg-[#e66f00] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50", children: _jsx(SendIcon, { className: "h-6 w-6 -translate-x-px translate-y-px" }) })] })] }));
}
// ---- Patient: sign to the camera (DEMO: scripted, word by word) ------------------------
function PatientComposer({ onSend, sent }) {
    const [open, setOpen] = useState(false);
    useEffect(() => { publishDeviceStatus({ camera: open ? 'on' : 'off', recognizer: 'ready' }); }, [open]);
    return (_jsxs("div", { className: "border-t border-orange-100 bg-white px-3 pb-3 pt-3 sm:px-4", children: [_jsxs("button", { type: "button", onClick: () => setOpen(true), disabled: open, className: "flex min-h-16 w-full cursor-pointer items-center justify-center gap-4 rounded-full bg-[#ff7a00] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98] disabled:opacity-60", children: [_jsx("span", { className: "grid h-11 w-11 place-items-center rounded-full bg-white/20", children: _jsx(CameraIcon, { className: "h-7 w-7" }) }), "\u101C\u1000\u103A\u101F\u1014\u103A\u1016\u103C\u1004\u1037\u103A \u1015\u103C\u1031\u102C\u101B\u1014\u103A"] }), open && (_jsx(DemoSignCapture, { line: patientLine(sent), onSend: (text) => { onSend(text); setOpen(false); }, onClose: () => setOpen(false) }, sent))] }));
}
// ---- Doctor: how the patient joins --------------------------------------------------
function JoinCard({ code, addresses, compact }) {
    if (compact) {
        return (_jsxs("p", { className: "mx-auto mb-4 w-fit rounded-2xl border-2 border-dashed border-[#ff7a00] bg-white/95 px-4 py-2 text-center text-lg text-gray-900", role: "status", children: ["\u101C\u1030\u1014\u102C \u1001\u103B\u102D\u1010\u103A\u1006\u1000\u103A\u1019\u103E\u102F \u1015\u103C\u1010\u103A\u1014\u1031\u101E\u100A\u103A \u2014 \u1021\u1001\u1014\u103A\u1038 ", _jsx("strong", { className: "tabular-nums tracking-widest", children: code }), " \u1016\u103C\u1004\u1037\u103A \u1015\u103C\u1014\u103A\u101D\u1004\u103A\u1015\u102B"] }));
    }
    return (_jsxs("section", { className: "mx-auto mb-6 w-full max-w-xl rounded-3xl border-[3px] border-dashed border-[#ff7a00] bg-white/95 p-6 text-gray-900 shadow-lg", "aria-label": "\u101C\u1030\u1014\u102C \u101D\u1004\u103A\u101B\u1031\u102C\u1000\u103A\u1014\u100A\u103A\u1038", children: [_jsx("p", { className: "text-center text-lg font-bold text-[#c25e00]", children: "\u101C\u1030\u1014\u102C \u101D\u1004\u103A\u101B\u1031\u102C\u1000\u103A\u101B\u1014\u103A \u1005\u1031\u102C\u1004\u1037\u103A\u1014\u1031\u101E\u100A\u103A" }), _jsx("p", { className: "mt-1 text-center text-base text-gray-700", children: "\u1024\u1014\u1036\u1015\u102B\u1010\u103A\u1000\u102D\u102F \u101C\u1030\u1014\u102C\u1000\u102D\u102F \u1015\u103C\u1015\u102B" }), _jsx("p", { className: "my-4 text-center text-7xl font-bold tracking-[.3em] text-gray-900 tabular-nums", "aria-label": `အခန်းနံပါတ် ${code.split('').join(' ')}`, children: code }), _jsxs("ol", { className: "space-y-2 text-lg", children: [_jsxs("li", { children: [_jsx("strong", { className: "text-[#c25e00]", children: "\u1041\u104B" }), " \u101C\u1030\u1014\u102C\u1005\u1000\u103A\u1000\u102D\u102F \u1024 Wi\u2011Fi / Hotspot \u1010\u103D\u1004\u103A \u1001\u103B\u102D\u1010\u103A\u1015\u102B\u104B"] }), _jsxs("li", { children: [_jsx("strong", { className: "text-[#c25e00]", children: "\u1042\u104B" }), " \u101C\u1030\u1014\u102C\u1005\u1000\u103A\u104F browser \u1010\u103D\u1004\u103A \u1016\u103D\u1004\u1037\u103A\u1015\u102B \u2014", addresses.length ? (addresses.map((address) => (_jsxs("span", { className: "mt-1 block break-all rounded-xl bg-orange-50 px-3 py-2 font-mono text-lg font-bold text-gray-900", children: [address, "/?role=patient&room=", code] }, address)))) : (_jsx("span", { className: "mt-1 block rounded-xl bg-orange-50 px-3 py-2 text-base text-gray-700", children: "\u1024\u1000\u103D\u1014\u103A\u1015\u103B\u1030\u1010\u102C\u104F IP \u101C\u102D\u1015\u103A\u1005\u102C (npm run dev:clinic \u1016\u103C\u1004\u1037\u103A \u1015\u103C\u1015\u102B\u1019\u100A\u103A)" }))] }), _jsxs("li", { children: [_jsx("strong", { className: "text-[#c25e00]", children: "\u1043\u104B" }), " \u201C\u101C\u1030\u1014\u102C\u201D \u1000\u102D\u102F\u101B\u103D\u1031\u1038\u1015\u103C\u102E\u1038 \u1021\u1001\u1014\u103A\u1038\u1014\u1036\u1015\u102B\u1010\u103A ", _jsx("strong", { className: "tabular-nums", children: code }), " \u1000\u102D\u102F \u101B\u102D\u102F\u1000\u103A\u1011\u100A\u1037\u103A\u1015\u102B\u104B"] })] })] }));
}
