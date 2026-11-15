import type { Role } from '../api/conversation'

/**
 * DEMO branch: the fixed clinic conversation used for the video recording.
 *
 * The patient signs word by word (one 3-second round per word). Whatever the
 * camera sees, each round reveals the next scripted word and the message that
 * is sent is exactly the scripted line.
 */
export type DemoWord = { id: string; label: string }
export type DemoLine = { from: Role; text: string; words?: DemoWord[] }

export const DEMO_SCRIPT: DemoLine[] = [
  { from: 'doctor', text: 'မင်္ဂလာပါ' },
  { from: 'patient', text: 'မင်္ဂလာပါ', words: [{ id: 'mingalarbar', label: 'မင်္ဂလာပါ' }] },
  { from: 'doctor', text: 'ဘာဖြစ်လို့လဲ' },
  { from: 'patient', text: 'အစာအိမ်နာလို့', words: [{ id: 'stomach_ache', label: 'အစာအိမ်နာ' }] },
  { from: 'doctor', text: 'ဆေးသောက်ပါ' },
  { from: 'patient', text: 'ဘယ်လိုသောက်ရမလဲ', words: [{ id: 'how', label: 'ဘယ်လို' }, { id: 'drink', label: 'သောက်' }] }
 // { from: 'doctor', text: 'အစာစားပြီး ၅ မိနစ်မှာ သောက်ပါ' },
]

export const DOCTOR_LINES = DEMO_SCRIPT.filter((line) => line.from === 'doctor')
export const PATIENT_LINES = DEMO_SCRIPT.filter((line) => line.from === 'patient')

/** The patient's next scripted line, given how many they have already sent. */
export const patientLine = (sent: number) => PATIENT_LINES[Math.min(sent, PATIENT_LINES.length - 1)]

/** Seconds the patient has for each word. */
export const WORD_SECONDS = 3
