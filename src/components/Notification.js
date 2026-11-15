import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export default function Notification({ message, onDismiss }) {
    useEffect(() => {
        if (!message)
            return;
        const timeout = window.setTimeout(onDismiss, 6000);
        return () => window.clearTimeout(timeout);
    }, [message, onDismiss]);
    return (_jsx("div", { className: "fixed inset-x-4 top-24 z-[80] flex justify-center pointer-events-none", role: "status", "aria-live": "polite", "aria-atomic": "true", children: message && (_jsxs("div", { className: "pointer-events-auto flex max-w-lg items-start gap-4 rounded-2xl border border-orange-200 bg-white/95 px-5 py-4 text-gray-800 shadow-xl backdrop-blur-md", children: [_jsx("p", { className: "text-sm leading-relaxed", children: message }), _jsx("button", { type: "button", onClick: onDismiss, "aria-label": "\u1021\u101E\u102D\u1015\u1031\u1038\u1001\u103B\u1000\u103A\u1015\u102D\u1010\u103A\u101B\u1014\u103A", className: "shrink-0 cursor-pointer rounded-full px-2 text-xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900", children: "\u00D7" })] })) }));
}
