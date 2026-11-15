import { planSigns } from '../animation/greetingInput';
export async function translateTextToSigns(text) {
    const plan = planSigns(text);
    return {
        signs: plan.playable,
        note: plan.playable.length && !plan.pending.length && !plan.unknown.length ? '' : plan.note,
        complete: plan.playable.length > 0 && !plan.pending.length && !plan.unknown.length,
    };
}
const SIGN_LABELS = {
    hello: 'မင်္ဂလာပါ',
    thank_you: 'ကျေးဇူးတင်ပါတယ်',
    please: 'ကျေးဇူးပြု',
    help: 'ကူညီပါ',
    medicine: 'ဆေး',
    sick: 'နေမကောင်း',
    i: 'ကျွန်ုပ်',
    headache: 'ခေါင်းကိုက်',
    what_happened: 'ဘာဖြစ်လို့လဲ',
    stomach_ache: 'အစာအိမ်နာ',
    how: 'ဘယ်လို',
    drink: 'သောက်',
    eat: 'စား',
    finished: 'ပြီး',
    five: '၅',
    minute: 'မိနစ်',
};
export const signLabel = (id) => SIGN_LABELS[id] ?? id;
