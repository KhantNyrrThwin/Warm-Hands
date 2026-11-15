import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ANIMATED_SIGN_IDS } from '../animation/signs';
import { signLabel } from '../api/translation';
import SignGif from './SignGif';
/**
 * Pose inspection page: `?preview=drink,eat` loops those clips,
 * `?preview=all` shows every clip, `&t=1.2` freezes them at 1.2 s,
 * `&seq` plays the listed clips as one signed sentence.
 */
export default function SignPreview({ query }) {
    const params = new URLSearchParams(query);
    const raw = params.get('preview') ?? 'all';
    const at = params.get('t');
    const ids = (raw === 'all' ? [...ANIMATED_SIGN_IDS] : raw.split(',')).filter((id) => ANIMATED_SIGN_IDS.includes(id));
    const time = at === null ? undefined : Number(at);
    const times = params.get('times')?.split(',').map(Number);
    if (times) {
        // One clip frozen at several moments: `?preview=drink&times=.8,1.2,1.6`
        return (_jsx("div", { className: "flex min-h-dvh flex-wrap content-start justify-center gap-2 bg-white p-2", children: times.map((moment) => (_jsxs("figure", { className: "flex flex-col items-center", children: [_jsx(SignGif, { signs: ids, label: `${moment}`, className: "w-60", at: moment }), _jsxs("figcaption", { className: "text-sm font-bold", children: [ids.join('+'), " @ ", moment, "s"] })] }, moment))) }));
    }
    if (params.has('seq')) {
        return (_jsx("div", { className: "flex min-h-dvh items-start justify-center bg-white p-4", children: _jsx(SignGif, { signs: ids, label: "sequence", className: "w-[440px]", at: time }) }));
    }
    return (_jsx("div", { className: "flex min-h-dvh flex-wrap content-start justify-center gap-4 bg-white p-4", children: ids.map((id) => (_jsxs("figure", { className: "flex flex-col items-center", children: [_jsx(SignGif, { signs: [id], label: id, className: "w-72", at: time }), _jsxs("figcaption", { className: "mt-1 text-lg font-bold", children: [signLabel(id), " \u00B7 ", id] })] }, id))) }));
}
