import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import logoImg from '../assets/LOGO.png';
import { DoctorIcon, PatientIcon, WifiIcon } from './icons';
const ROLES = [
    {
        role: 'doctor',
        title: 'ဆရာဝန်',
        english: 'Doctor',
        detail: 'စာရိုက်ပါ သို့မဟုတ် အသံဖြင့်ပြောပါ — လူနာထံ လက်ဟန်ဖြင့် ပြပေးပါမည်။',
        Icon: DoctorIcon,
    },
    {
        role: 'patient',
        title: 'လူနာ',
        english: 'Patient',
        detail: 'ကင်မရာရှေ့တွင် လက်ဟန်ပြပါ — ဆရာဝန်ထံ စာသားဖြင့် ပို့ပေးပါမည်။',
        Icon: PatientIcon,
    },
];
export default function RoleSelect({ onSelect }) {
    return (_jsxs("main", { className: "relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-8", children: [_jsx("img", { src: logoImg, alt: "Warm Hands", className: "mb-8 h-14 w-fit object-contain drop-shadow-md sm:h-16" }), _jsxs("section", { className: "rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl backdrop-blur-xl sm:p-10", "aria-labelledby": "role-title", children: [_jsx("p", { className: "text-base font-bold text-[#c25e00]", children: "\u1006\u1031\u1038\u1001\u1014\u103A\u1038 \u1005\u1000\u102C\u1038\u1015\u103C\u1031\u102C\u1001\u1014\u103A\u1038 \u00B7 Clinic conversation" }), _jsx("h1", { id: "role-title", className: "mt-2 text-3xl font-bold leading-snug text-gray-900 sm:text-4xl", children: "\u101E\u1004\u103A\u1018\u101A\u103A\u101E\u1030\u101C\u1032\u104B" }), _jsx("p", { className: "mt-2 text-lg text-gray-700", children: "\u1024\u1005\u1000\u103A\u1000\u102D\u102F \u1021\u101E\u102F\u1036\u1038\u1015\u103C\u102F\u1019\u100A\u1037\u103A\u101E\u1030\u1000\u102D\u102F \u101B\u103D\u1031\u1038\u1015\u102B\u104B Choose who is using this device." }), _jsx("div", { className: "mt-8 grid gap-4 sm:grid-cols-2", children: ROLES.map(({ role, title, english, detail, Icon }) => (_jsxs("button", { type: "button", onClick: () => onSelect(role), className: "group flex min-h-48 cursor-pointer flex-col items-start gap-3 rounded-3xl border-[3px] border-[#ff7a00] bg-white p-6 text-left shadow-md transition-all hover:bg-orange-50 hover:shadow-xl focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#ff7a00] active:scale-[.98]", children: [_jsx("span", { className: `grid h-16 w-16 place-items-center rounded-2xl ${role === 'doctor' ? 'bg-[#ff7a00] text-white' : 'bg-orange-100 text-[#c25e00]'}`, children: _jsx(Icon, {}) }), _jsxs("span", { className: "text-3xl font-bold text-gray-900", children: [title, " ", _jsxs("span", { className: "text-xl font-semibold text-gray-500", children: ["\u00B7 ", english] })] }), _jsx("span", { className: "text-lg leading-relaxed text-gray-700", children: detail })] }, role))) }), _jsxs("div", { className: "mt-8 flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-base text-gray-800", children: [_jsx(WifiIcon, { className: "mt-0.5 h-6 w-6 shrink-0 text-[#c25e00]" }), _jsxs("p", { children: ["\u1005\u1000\u103A\u1014\u103E\u1005\u103A\u101C\u102F\u1036\u1038\u1000\u102D\u102F ", _jsx("strong", { children: "Wi\u2011Fi \u1010\u1005\u103A\u1001\u102F\u1010\u100A\u103A\u1038" }), " (\u101E\u102D\u102F\u1037\u1019\u101F\u102F\u1010\u103A \u1016\u102F\u1014\u103A\u1038 Hotspot) \u1010\u103D\u1004\u103A \u1001\u103B\u102D\u1010\u103A\u1015\u102B\u104B \u1006\u101B\u102C\u101D\u1014\u103A\u1000 \u1021\u1001\u1014\u103A\u1038\u1014\u1036\u1015\u102B\u1010\u103A\u1016\u103D\u1004\u1037\u103A\u1015\u103C\u102E\u1038 \u101C\u1030\u1014\u102C\u1000 \u1011\u102D\u102F\u1014\u1036\u1015\u102B\u1010\u103A\u1016\u103C\u1004\u1037\u103A \u101D\u1004\u103A\u1015\u102B\u104B"] })] })] })] }));
}
