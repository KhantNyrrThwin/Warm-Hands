import { ANIMATED_SIGN_IDS, type SignId } from './signs'

const clean = (text: string) =>
  text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim()

const SIGN_TEXT: Record<SignId, string[]> = {
  headache: ['ခေါင်းကိုက်', 'ခေါင်းကိုက်ပါ', 'headache'],
  i: ['ကျွန်တော်', 'ကျွန်ုပ်', 'ကျွန်မ', 'i'],
  hello: ['မင်္ဂလာပါ', 'hello', 'mingalarbar'],
  thank_you: ['ကျေးဇူးတင်ပါတယ်', 'thank you', 'thank_you'],
  please: ['ကျေးဇူးပြု', 'please'],
  help: ['ကူညီပါ', 'help'],
  medicine: ['ဆေး', 'medicine'],
  sick: ['နေမကောင်း', 'နေမကောင်းပါ', 'ဖျား', 'sick'],
}

export const isMingalarbar = (text: string) => matchSign(text) === 'hello'

export function matchSign(text: string): SignId | null {
  const value = clean(text).toLowerCase()
  if (!value) return null
  for (const [id, labels] of Object.entries(SIGN_TEXT) as Array<[SignId, string[]]>) {
    if (labels.some((label) => clean(label).toLowerCase() === value)) return id
  }
  return null
}

/** All 20 Myanmar signs. Only the clips in `signs.ts` are played. */
export type GlossId =
  | SignId
  | 'i'
  | 'headache'
  | 'yes'
  | 'no'
  | 'doctor'
  | 'hospital'
  | 'pain'
  | 'water'
  | 'eat'
  | 'drink'
  | 'toilet'
  | 'name'
  | 'me'
  | 'you'
  | 'sick'
  | 'mother'
  | 'father'

const ANIMATED = new Set<GlossId>(ANIMATED_SIGN_IDS)

const REQUESTS = new Set<GlossId>(['help', 'eat', 'drink'])

type Gloss = {
  id: GlossId
  my: string
  en: string
  forms: string[]
}

const GLOSSES: Gloss[] = [
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
  { id: 'eat', my: 'စား', en: 'Eat', forms: ['စား', 'eat'] },
  { id: 'drink', my: 'သောက်', en: 'Drink', forms: ['သောက်', 'drink'] },
  { id: 'toilet', my: 'အိမ်သာ', en: 'Toilet', forms: ['အိမ်သာ', 'toilet'] },
  { id: 'name', my: 'နာမည်', en: 'Name', forms: ['နာမည်', 'name'] },
  { id: 'me', my: 'ကျွန်တော်', en: 'Me', forms: ['ကျွန်တော်', 'ကျွန်မ', 'me'] },
  { id: 'you', my: 'သင်', en: 'You', forms: ['သင်', 'you'] },
  { id: 'sick', my: 'နေမကောင်းပါ', en: 'Sick', forms: ['နေမကောင်း', 'ဖျား', 'sick'] },
  { id: 'mother', my: 'အမေ', en: 'Mother', forms: ['အမေ', 'mother'] },
  { id: 'father', my: 'အဖေ', en: 'Father', forms: ['အဖေ', 'father'] },
]

const BY_ID = Object.fromEntries(GLOSSES.map((gloss) => [gloss.id, gloss])) as Record<GlossId, Gloss>

// Spoken extras that are not their own signs. Stripped after a gloss is found
// so ကူညီပေးပါနော် and ကူညီပါ both become the help sign.
const PARTICLES = ['ကို', '၍', 'ခင်ဗျား', 'ခင်ဗျာ', 'ပါတယ်', 'နော်', 'ပေး', '၍', 'ပါ', 'ရှင့်', 'ရှင်', 'ဗျာ', 'ဗျ', 'ဦး', 'လား', 'တယ်', 'သည်', 'ဘူး', 'ကွာ', 'နဲ့', 'နှင့်']

const isGap = (char: string) => /[\s.,!?;:'"()[\]{}။၊]/.test(char)

const isLatin = (form: string) => /[a-z]/i.test(form)

function glossAt(_text: string, lower: string, index: number): { id: GlossId; length: number } | null {
  let best: { id: GlossId; length: number } | null = null
  for (const gloss of GLOSSES) {
    for (const form of gloss.forms) {
      const needle = form.toLowerCase()
      if (lower.slice(index, index + needle.length) !== needle) continue
      if (isLatin(needle)) {
        const prev = index > 0 ? lower[index - 1] : ' '
        const next = lower[index + needle.length] ?? ' '
        if (/[a-z]/i.test(prev) || /[a-z]/i.test(next)) continue
      }
      if (!best || needle.length > best.length) best = { id: gloss.id, length: needle.length }
    }
  }
  return best
}

function particleAt(text: string, index: number): number {
  for (const particle of PARTICLES) {
    if (text.startsWith(particle, index)) return particle.length
  }
  return 0
}

function phrase(ids: GlossId[]): string {
  return ids.map((id) => BY_ID[id].my).join(' → ')
}

export type SignPlan = {
  signs: GlossId[]
  playable: SignId[]
  pending: GlossId[]
  unknown: string[]
  canonical: string
  note: string
}

export function planSigns(raw: string): SignPlan {
  const text = clean(raw)
  const lower = text.toLowerCase()
  const signs: GlossId[] = []
  const unknown: string[] = []
  let index = 0

  while (index < text.length) {
    if (isGap(text[index])) {
      index += 1
      continue
    }
    const gloss = glossAt(text, lower, index)
    const particle = particleAt(text, index)
    if (gloss && gloss.length >= particle) {
      signs.push(gloss.id)
      index += gloss.length
      continue
    }
    if (particle) {
      index += particle
      continue
    }
    let end = index + 1
    while (end < text.length && !isGap(text[end]) && !glossAt(text, lower, end) && !particleAt(text, end)) end += 1
    unknown.push(text.slice(index, end))
    index = end
  }

  const playable = signs.filter((id): id is SignId => ANIMATED.has(id))
  const pending = signs.filter((id) => !ANIMATED.has(id))
  const canonical = signs
    .map((id, position) => {
      const next = signs[position + 1]
      if (id === 'please' && next && REQUESTS.has(next)) return 'ကျေးဇူးပြု၍'
      return BY_ID[id].my
    })
    .join(' ')

  return { signs, playable, pending, unknown, canonical, note: describe(signs, playable, pending, unknown) }
}

function describe(signs: GlossId[], playable: SignId[], pending: GlossId[], unknown: string[]): string {
  if (!signs.length) {
    if (unknown.length) return `ဤစာသားအတွက် လက်ဟန်မရှိသေးပါ — ${unknown.join('၊ ')}`
    return 'စာသားရိုက်ထည့်ပါ။ ဥပမာ — ကျွန်ုပ်နေမကောင်းပါ'
  }
  const parts: string[] = []
  if (playable.length) parts.push(`${phrase(playable)}`)
  if (pending.length) parts.push(`ဤလက်ဟန်များကို မပြနိုင်သေးပါ — ${phrase(pending)}`)
  if (unknown.length) parts.push(`လက်ဟန်မရှိသေးသည့် စာသား — ${unknown.join('၊ ')}`)
  return parts.join(' ')
}
