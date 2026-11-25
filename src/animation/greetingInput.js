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
    sick: ['နေမကောင်း', 'နေမကောင်းပါ', 'အဖျား', 'ဖျား', 'sick', 'fever'],
    what_happened: ['ဘာဖြစ်လို့လဲ', 'ဘာဖြစ်လဲ', 'what happened'],
    stomach_ache: ['အစာအိမ်နာ', 'stomach ache'],
    how: ['ဘယ်လို', 'how'],
    drink: ['သောက်', 'drink'],
    eat: ['စား', 'eat'],
    breakfast: ['မနက်စာ', 'breakfast'],
    lunch: ['နေ့လည်စာ', 'lunch'],
    dinner: ['ညစာ', 'dinner'],
    finished: ['ပြီး', 'finished'],
    have_you_finished: ['ပြီးပြီလား', 'have you finished', 'have you finished?', 'have you done', 'have you done?'],
    unfinished: ['unfinished', 'not finished', 'not yet', 'မပြီးသေး'],
    five: ['၅', '5', 'five'],
    minute: ['မိနစ်', 'minute'],
    doctor: ['ဆရာဝန်', 'doctor'],
    nurse: ['သူနာပြု', 'nurse'],
    wake_up: ['အိပ်ရာထ', 'wake up', 'woke up', 'get up'],
    time: ['အချိန်', 'time'],
    hour: ['နာရီ', 'hour', 'hours', 'clock', "o'clock"],
    tomorrow: ['မနက်ဖြန်', 'tomorrow'],
    day_after_tomorrow: ['သန်ဘက်ခါ', 'day after tomorrow', 'the day after tomorrow'],
    meet: ['တွေ့', 'meet', 'see'],
    go: ['သွား', 'go'],
    father: ['အဖေ', 'father', 'dad'],
    mother: ['အမေ', 'mother', 'mom'],
    older_sister: ['အစ်မ', 'older sister', 'elder sister', 'sister'],
    younger_brother: ['ညီ', 'younger brother'],
    older_brother: ['အစ်ကို', 'older brother', 'elder brother', 'brother'],
    safe: ['လုံခြုံ', 'safe', 'secure'],
    pound: ['ပေါင်', 'pound', 'pounds', 'lb'],
    obviously: ['ထင်ရှား', 'obviously', 'obvious', 'clearly'],
    severe: ['အပြင်းအထန်', 'severe', 'severely'],
    el_nino: ['အယ်လ်နီညို', 'el nino', 'el niño'],
    hundred: ['ဟန်ဒြက်', 'hundred', 'ဟန်းဒရက်'],
    kilogram: ['ကီလိုဂရမ်', 'kilogram', 'kilograms', 'kg'],
    gram: ['ဂရမ်', 'gram', 'grams'],
    cough: ['ချောင်းဆိုး', 'cough', 'coughing'],
    toothache: ['သွားကိုက်', 'toothache', 'tooth ache'],
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
    { id: 'nurse', my: 'သူနာပြု', en: 'Nurse', forms: ['သူနာပြု', 'nurse'] },
    { id: 'wake_up', my: 'အိပ်ရာထ', en: 'Wake Up', forms: ['အိပ်ရာထ', 'wake up', 'woke up', 'get up'] },
    { id: 'time', my: 'အချိန်', en: 'Time', forms: ['အချိန်', 'time'] },
    { id: 'hour', my: 'နာရီ', en: 'Hour', forms: ['နာရီ', 'hour', 'hours', 'clock', "o'clock"] },
    { id: 'tomorrow', my: 'မနက်ဖြန်', en: 'Tomorrow', forms: ['မနက်ဖြန်', 'tomorrow'] },
    { id: 'day_after_tomorrow', my: 'သန်ဘက်ခါ', en: 'Day After Tomorrow', forms: ['သန်ဘက်ခါ', 'day after tomorrow', 'the day after tomorrow'] },
    { id: 'meet', my: 'တွေ့', en: 'Meet', forms: ['တွေ့', 'meet', 'see'] },
    { id: 'go', my: 'သွား', en: 'Go', forms: ['သွား', 'go'] },
    { id: 'older_sister', my: 'အစ်မ', en: 'Older Sister', forms: ['အစ်မ', 'older sister', 'elder sister', 'sister'] },
    { id: 'younger_brother', my: 'ညီ', en: 'Younger Brother', forms: ['ညီ', 'younger brother'] },
    { id: 'older_brother', my: 'အစ်ကို', en: 'Older Brother', forms: ['အစ်ကို', 'older brother', 'elder brother', 'brother'] },
    { id: 'safe', my: 'လုံခြုံ', en: 'Safe', forms: ['လုံခြုံ', 'safe', 'secure'] },
    { id: 'pound', my: 'ပေါင်', en: 'Pound', forms: ['ပေါင်', 'pound', 'pounds', 'lb'] },
    { id: 'obviously', my: 'ထင်ရှား', en: 'Obviously', forms: ['ထင်ရှား', 'obviously', 'obvious', 'clearly'] },
    { id: 'severe', my: 'အပြင်းအထန်', en: 'Severe', forms: ['အပြင်းအထန်', 'severe', 'severely'] },
    { id: 'el_nino', my: 'အယ်လ်နီညို', en: 'El Nino', forms: ['အယ်လ်နီညို', 'el nino', 'el niño'] },
    { id: 'hundred', my: 'ဟန်ဒြက်', en: 'Hundred', forms: ['ဟန်ဒြက်', 'hundred', 'ဟန်းဒရက်'] },
    { id: 'kilogram', my: 'ကီလိုဂရမ်', en: 'Kilogram', forms: ['ကီလိုဂရမ်', 'kilogram', 'kilograms', 'kg'] },
    { id: 'gram', my: 'ဂရမ်', en: 'Gram', forms: ['ဂရမ်', 'gram', 'grams'] },
    { id: 'cough', my: 'ချောင်းဆိုး', en: 'Cough', forms: ['ချောင်းဆိုး', 'cough', 'coughing'] },
    { id: 'hospital', my: 'ဆေးရုံ', en: 'Hospital', forms: ['ဆေးရုံ', 'hospital'] },
    { id: 'pain', my: 'နာကျင်', en: 'Pain', forms: ['နာကျင်', 'pain'] },
    { id: 'water', my: 'ရေ', en: 'Water', forms: ['ရေ', 'water'] },
    { id: 'eat', my: 'စား', en: 'Eat', forms: ['အစာစား', 'စား', 'eat'] },
    { id: 'breakfast', my: 'မနက်စာ', en: 'Breakfast', forms: ['မနက်စာ', 'breakfast', 'morning meal'] },
    { id: 'lunch', my: 'နေ့လည်စာ', en: 'Lunch', forms: ['နေ့လည်စာ', 'lunch'] },
    { id: 'dinner', my: 'ညစာ', en: 'Dinner', forms: ['ညစာ', 'dinner', 'supper'] },
    { id: 'drink', my: 'သောက်', en: 'Drink', forms: ['သောက်', 'drink'] },
    { id: 'toilet', my: 'အိမ်သာ', en: 'Toilet', forms: ['အိမ်သာ', 'toilet'] },
    { id: 'name', my: 'နာမည်', en: 'Name', forms: ['နာမည်', 'name'] },
    { id: 'me', my: 'ကျွန်တော်', en: 'Me', forms: ['ကျွန်တော်', 'ကျွန်မ', 'me'] },
    { id: 'you', my: 'သင်', en: 'You', forms: ['သင်', 'you'] },
    { id: 'sick', my: 'နေမကောင်းပါ', en: 'Sick', forms: ['နေမကောင်း', 'အဖျား', 'ဖျား', 'sick', 'fever'] },
    { id: 'mother', my: 'အမေ', en: 'Mother', forms: ['အမေ', 'mother'] },
    { id: 'father', my: 'အဖေ', en: 'Father', forms: ['အဖေ', 'father'] },
    // Listed as one word so သွားကိုက် is not read as သွား (go) + ကိုက်.
    { id: 'toothache', my: 'သွားကိုက်', en: 'Toothache', forms: ['သွားကိုက်', 'toothache'] },
    { id: 'what_happened', my: 'ဘာဖြစ်လို့လဲ', en: 'What happened', forms: ['ဘာဖြစ်လို့လဲ', 'ဘာဖြစ်လဲ', 'ဘာဖြစ်', 'what happened'] },
    { id: 'stomach_ache', my: 'အစာအိမ်နာ', en: 'Stomach ache', forms: ['အစာအိမ်နာ', 'stomach ache', 'stomachache'] },
    { id: 'how', my: 'ဘယ်လို', en: 'How', forms: ['ဘယ်လို', 'how'] },
    { id: 'finished', my: 'ပြီး', en: 'Finished / after', forms: ['ပြီး', 'after', 'finished'] },
    { id: 'have_you_finished', my: 'ပြီးပြီလား', en: 'Have you finished?', forms: ['ပြီးပြီလား', 'have you finished', 'have you done', 'finished yet'] },
    { id: 'unfinished', my: 'မပြီးသေး', en: 'Unfinished', forms: ['unfinished', 'not finished', 'not yet', 'မပြီးသေး'] },
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
