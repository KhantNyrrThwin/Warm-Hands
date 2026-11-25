import { planSigns } from '../animation/greetingInput'
import type { SignId } from '../animation/signs'
import { RECORDED_LABELS } from '../animation/clips/recorded.generated'

/**
 * Text → Myanmar Sign Language translation used for the doctor's messages
 * (and to replay the patient's recognised sentence).
 *
 * This currently runs the on-device gloss planner. Swap the body for a call
 * to a server translation service without touching the UI: the conversation
 * screen only depends on this shape.
 */
export type SignTranslation = {
  /** Clips the 3D character can play, in order. */
  signs: SignId[]
  /** Human-readable note about signs that are missing or unknown. */
  note: string
  /** True when every word in the text has an animated sign. */
  complete: boolean
}

export async function translateTextToSigns(text: string): Promise<SignTranslation> {
  const plan = planSigns(text)
  return {
    signs: plan.playable,
    note: plan.playable.length && !plan.pending.length && !plan.unknown.length ? '' : plan.note,
    complete: plan.playable.length > 0 && !plan.pending.length && !plan.unknown.length,
  }
}

const SIGN_LABELS: Record<SignId, string> = {
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
  breakfast: 'မနက်စာ',
  lunch: 'နေ့လည်စာ',
  dinner: 'ညစာ',
  finished: 'ပြီး',
  have_you_finished: 'ပြီးပြီလား',
  unfinished: 'မပြီးသေး',
  five: '၅',
  minute: 'မိနစ်',
  doctor: 'ဆရာဝန်',
  nurse: 'သူနာပြု',
  wake_up: 'အိပ်ရာထ',
  time: 'အချိန်',
  hour: 'နာရီ',
  tomorrow: 'မနက်ဖြန်',
  day_after_tomorrow: 'သန်ဘက်ခါ',
  meet: 'တွေ့',
  go: 'သွား',
  father: 'အဖေ',
  mother: 'အမေ',
  older_sister: 'အစ်မ',
  younger_brother: 'ညီ',
  older_brother: 'အစ်ကို',
  safe: 'လုံခြုံ',
  pound: 'ပေါင်',
  obviously: 'ထင်ရှား',
  severe: 'အပြင်းအထန်',
  el_nino: 'အယ်လ်နီညို',
  hundred: 'ဟန်ဒြက်',
  kilogram: 'ကီလိုဂရမ်',
  gram: 'ဂရမ်',
  cough: 'ချောင်းဆိုး',
  toothache: 'သွားကိုက်',
  ...RECORDED_LABELS,
}

export const signLabel = (id: SignId) => SIGN_LABELS[id] ?? id
