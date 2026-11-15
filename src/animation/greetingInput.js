import { ANIMATED_SIGN_IDS } from './signs';
const clean = (text) => text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
const SIGN_TEXT = {
    headache: ['ခေါင်းကိုက်', 'ခေါင်းကိုက်ပါ', 'headache'],
    i: ['ကျွန်တော်', 'ကျွန်ုပ်', 'ကျွန်မ', 'i'],
    hello: ['မင်္ဂလာပါ', 'hello', 'mingalarbar'],
    thank_you: ['ကျေးဇူးတင်ပါတယ်', 'thank you', 'thank_you'],
    please: ['ကျေးဇူးပြု', 'please'],
    help: ['ကူညီပါ', 'help'],
    medicine: ['ဆေး', 'medicine'],
    sick: ['နေမကောင်း', 'နေမကောင်းပါ', 'ဖျား', 'sick'],
    what_happened: ['ဘာဖြစ်လို့လဲ', 'ဘာဖြစ်လဲ', 'what happened'],
    stomach_ache: ['အစာအိမ်နာ', 'stomach ache'],
    how: ['ဘယ်လို', 'how'],
    drink: ['သောက်', 'drink'],
    eat: ['စား', 'eat'],
    finished: ['ပြီး', 'finished'],
    five: ['၅', '5', 'five'],
    minute: ['မိနစ်', 'minute'],
};
export const isMingalarbar = (text) => matchSign(text) === 'hello';
export function matchSign(text) {
    const value = clean(text).toLowerCase();
    if (!value)
        return null;
    for (const [id, labels] of Object.entries(SIGN_TEXT)) {
        if (labels.some((label) => clean(label).toLowerCase() === value))
            return id;
    }
    return null;
}
const ANIMATED = new Set(ANIMATED_SIGN_IDS);
const REQUESTS = new Set(['help', 'eat', 'drink']);
const GLOSSES = [
    { id: 'hello', my: 'မင်္ဂလာပါ', en: 'Hello', forms: ['မင်္ဂလာပါ', 'hello', 'mingalarbar'] },
    { id: 'i', my: 'ကျွန်ုပ်', en: 'I', forms: ['ကျွန်ုပ်', 'ကျွန်တော်', 'ကျွန်မ', 'i'] },
    { id: 'headache', my: 'ခေါင်းကိုက်ပါ', en: 'Headache', forms: ['ခေါင်းကိုက်', 'headache'] },
    { id: 'thank_you', my: 'ကျေးဇူးတင်ပါတယ်', en: 'Thank you', forms: ['ကျေးဇူးတင်ပါတယ်', 'ကျေးဇူးတင်', 'thank you', 'thank_you', 'thanks'] },
    { id: 'please', my: 'ကျေးဇူးပြု', en: 'Please', forms: ['ကျေးဇူးပြု', 'please'] },
    { id: 'help', my: 'ကူညီပါ', en: 'Help', forms: ['ကူညီ', 'help'] },
    { id: 'medicine', my: 'ဆေး', en: 'Medicine', forms: ['ဆေး', 'medicine'] },
    { id: 'yes', my: 'ဟုတ်ကဲ့', en: 'Yes', forms: ['ဟုတ်ကဲ့', 'ဟုတ်', 'yes'] },
    { id: 'no', my: 'မဟုတ်ပါ', en: 'No', forms: ['မဟုတ်', 'no'] },
    { id: 'doctor', my: 'ဆရာဝန်', en: 'Doctor', forms: ['ဆရာဝန်', 'doctor'] },
    { id: 'hospital', my: 'ဆေးရုံ', en: 'Hospital', forms: ['ဆေးရုံ', 'hospital'] },
    { id: 'pain', my: 'နာကျင်', en: 'Pain', forms: ['နာကျင်', 'pain'] },
    { id: 'water', my: 'ရေ', en: 'Water', forms: ['ရေ', 'water'] },
    { id: 'eat', my: 'စား', en: 'Eat', forms: ['အစာစား', 'စား', 'eat'] },
    { id: 'drink', my: 'သောက်', en: 'Drink', forms: ['သောက်', 'drink'] },
    { id: 'toilet', my: 'အိမ်သာ', en: 'Toilet', forms: ['အိမ်သာ', 'toilet'] },
    { id: 'name', my: 'နာမည်', en: 'Name', forms: ['နာမည်', 'name'] },
    { id: 'me', my: 'ကျွန်တော်', en: 'Me', forms: ['ကျွန်တော်', 'ကျွန်မ', 'me'] },
    { id: 'you', my: 'သင်', en: 'You', forms: ['သင်', 'you'] },
    { id: 'sick', my: 'နေမကောင်းပါ', en: 'Sick', forms: ['နေမကောင်း', 'ဖျား', 'sick'] },
    { id: 'mother', my: 'အမေ', en: 'Mother', forms: ['အမေ', 'mother'] },
    { id: 'father', my: 'အဖေ', en: 'Father', forms: ['အဖေ', 'father'] },
    { id: 'what_happened', my: 'ဘာဖြစ်လို့လဲ', en: 'What happened', forms: ['ဘာဖြစ်လို့လဲ', 'ဘာဖြစ်လဲ', 'ဘာဖြစ်', 'what happened'] },
    { id: 'stomach_ache', my: 'အစာအိမ်နာ', en: 'Stomach ache', forms: ['အစာအိမ်နာ', 'stomach ache', 'stomachache'] },
    { id: 'how', my: 'ဘယ်လို', en: 'How', forms: ['ဘယ်လို', 'how'] },
    { id: 'finished', my: 'ပြီး', en: 'Finished / after', forms: ['ပြီး', 'after', 'finished'] },
    { id: 'five', my: '၅', en: 'Five', forms: ['၅', '5', 'five'] },
    { id: 'minute', my: 'မိနစ်', en: 'Minute', forms: ['မိနစ်', 'minutes', 'minute'] },
];
const BY_ID = Object.fromEntries(GLOSSES.map((gloss) => [gloss.id, gloss]));
// Spoken extras that are not their own signs. Stripped after a gloss is found
// so ကူညီပေးပါနော် and ကူညီပါ both become the help sign.
const PARTICLES = ['ရမလဲ', 'လို့', 'မှာ', 'လဲ', 'ကို', '၍', 'ခင်ဗျား', 'ခင်ဗျာ', 'ပါတယ်', 'နော်', 'ပေး', '၍', 'ပါ', 'ရှင့်', 'ရှင်', 'ဗျာ', 'ဗျ', 'ဦး', 'လား', 'တယ်', 'သည်', 'ဘူး', 'ကွာ', 'နဲ့', 'နှင့်'];
const isGap = (char) => /[\s.,!?;:'"()[\]{}။၊]/.test(char);
const isLatin = (form) => /[a-z]/i.test(form);
function glossAt(_text, lower, index) {
    let best = null;
    for (const gloss of GLOSSES) {
        for (const form of gloss.forms) {
            const needle = form.toLowerCase();
            if (lower.slice(index, index + needle.length) !== needle)
                continue;
            if (isLatin(needle)) {
                const prev = index > 0 ? lower[index - 1] : ' ';
                const next = lower[index + needle.length] ?? ' ';
                if (/[a-z]/i.test(prev) || /[a-z]/i.test(next))
                    continue;
            }
            if (!best || needle.length > best.length)
                best = { id: gloss.id, length: needle.length };
        }
    }
    return best;
}
function particleAt(text, index) {
    for (const particle of PARTICLES) {
        if (text.startsWith(particle, index))
            return particle.length;
    }
    return 0;
}
function phrase(ids) {
    return ids.map((id) => BY_ID[id].my).join(' → ');
}
export function planSigns(raw) {
    const text = clean(raw);
    const lower = text.toLowerCase();
    const signs = [];
    const unknown = [];
    let index = 0;
    while (index < text.length) {
        if (isGap(text[index])) {
            index += 1;
            continue;
        }
        const gloss = glossAt(text, lower, index);
        const particle = particleAt(text, index);
        if (gloss && gloss.length >= particle) {
            signs.push(gloss.id);
            index += gloss.length;
            continue;
        }
        if (particle) {
            index += particle;
            continue;
        }
        let end = index + 1;
        while (end < text.length && !isGap(text[end]) && !glossAt(text, lower, end) && !particleAt(text, end))
            end += 1;
        unknown.push(text.slice(index, end));
        index = end;
    }
    const playable = signs.filter((id) => ANIMATED.has(id));
    const pending = signs.filter((id) => !ANIMATED.has(id));
    const canonical = signs
        .map((id, position) => {
        const next = signs[position + 1];
        if (id === 'please' && next && REQUESTS.has(next))
            return 'ကျေးဇူးပြု၍';
        return BY_ID[id].my;
    })
        .join(' ');
    return { signs, playable, pending, unknown, canonical, note: describe(signs, playable, pending, unknown) };
}
function describe(signs, playable, pending, unknown) {
    if (!signs.length) {
        if (unknown.length)
            return `ဤစာသားအတွက် လက်ဟန်မရှိသေးပါ — ${unknown.join('၊ ')}`;
        return 'စာသားရိုက်ထည့်ပါ။ ဥပမာ — ကျွန်ုပ်နေမကောင်းပါ';
    }
    const parts = [];
    if (playable.length)
        parts.push(`${phrase(playable)}`);
    if (pending.length)
        parts.push(`ဤလက်ဟန်များကို မပြနိုင်သေးပါ — ${phrase(pending)}`);
    if (unknown.length)
        parts.push(`လက်ဟန်မရှိသေးသည့် စာသား — ${unknown.join('၊ ')}`);
    return parts.join(' ');
}
