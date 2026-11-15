import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SENDER } from '../api/conversation';
import SignGif from './SignGif';
import { DoctorIcon, PatientIcon } from './icons';
const time = (value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export function Avatar({ role, className = 'h-10 w-10' }) {
    const Icon = role === 'doctor' ? DoctorIcon : PatientIcon;
    return (_jsx("span", { className: `grid shrink-0 place-items-center rounded-full shadow ${role === 'doctor' ? 'bg-[#ff7a00] text-white' : 'bg-orange-100 text-[#c25e00]'} ${className}`, "aria-hidden": "true", children: _jsx(Icon, { className: "h-[55%] w-[55%]" }) }));
}
/**
 * Messenger-style bubble. What each side sees:
 *  DEMO: both sides see every message as MSL animation + text.
 */
export default function MessageBubble({ message, viewer, delivered, groupEnd, groupStart }) {
    const mine = message.from === viewer;
    const showText = true;
    const showSign = true;
    const who = mine ? 'သင်' : SENDER[message.from];
    const meta = (_jsxs("span", { className: `ml-auto flex shrink-0 items-center gap-1 self-end text-xs font-semibold ${mine ? 'text-orange-50' : 'text-gray-500'}`, children: [time(message.sentAt), mine && (_jsx("span", { "aria-label": delivered ? 'ပို့ပြီး' : 'ပို့နေသည်', className: "text-sm leading-none", children: delivered ? '✓✓' : '🕓' }))] }));
    return (_jsxs("li", { className: `flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${groupEnd ? 'mb-3' : 'mb-0.5'}`, children: [!mine && (groupEnd ? _jsx(Avatar, { role: message.from }) : _jsx("span", { className: "w-10 shrink-0", "aria-hidden": "true" })), _jsxs("article", { "aria-label": `${who} ${time(message.sentAt)}`, className: `relative max-w-[82%] shadow-sm sm:max-w-[70%] ${showSign ? 'p-1.5' : 'px-4 py-2.5'} ${mine
                    ? `bg-[#ff7a00] text-white ${groupEnd ? 'rounded-[22px] rounded-br-md bubble-tail-right' : 'rounded-[22px] rounded-br-md'}`
                    : `bg-white text-gray-900 ${groupEnd ? 'rounded-[22px] rounded-bl-md bubble-tail-left' : 'rounded-[22px] rounded-bl-md'}`}`, children: [!mine && groupStart && (_jsx("p", { className: `text-sm font-bold text-[#c25e00] ${showSign ? 'px-2.5 pb-1 pt-1' : ''}`, children: SENDER[message.from] })), showSign && (_jsx(SignGif, { signs: message.signs, label: `${who}၏ လက်ဟန်`, className: "w-52 sm:w-60" })), showText ? (_jsxs("div", { className: `flex flex-wrap items-end gap-x-3 ${showSign ? 'px-2.5 pb-1 pt-2' : ''}`, children: [_jsx("p", { className: "whitespace-pre-wrap break-words text-xl leading-relaxed", children: message.text }), meta] })) : (_jsx("div", { className: "flex px-2 pb-0.5 pt-1", children: meta })), mine && viewer === 'doctor' && message.note && (_jsx("p", { className: "px-2.5 pb-1 text-sm text-orange-50", children: message.note }))] })] }));
}
