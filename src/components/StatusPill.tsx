export type Tone = 'ok' | 'busy' | 'warn' | 'off'

const TONES: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  busy: 'bg-orange-50 text-orange-800 border-orange-300',
  warn: 'bg-red-50 text-red-800 border-red-300',
  off: 'bg-white/80 text-gray-700 border-gray-300',
}

const DOTS: Record<Tone, string> = {
  ok: 'bg-emerald-500',
  busy: 'bg-[#ff7a00] animate-pulse',
  warn: 'bg-red-500',
  off: 'bg-gray-400',
}

/** Status chip: a coloured dot plus a text label, so colour is never the only cue. */
export default function StatusPill({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${TONES[tone]}`}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOTS[tone]}`} aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span>{value}</span>
    </span>
  )
}
