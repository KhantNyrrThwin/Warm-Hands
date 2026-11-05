import { planSigns } from '../animation/greetingInput'
import type { SignId } from '../animation/signs'

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
}

export const signLabel = (id: SignId) => SIGN_LABELS[id] ?? id
