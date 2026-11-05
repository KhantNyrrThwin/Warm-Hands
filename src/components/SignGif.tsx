import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import fallbackImage from '../assets/WarmHands_Traditional_Fallback.png'
import type { SignId } from '../animation/signs'
import { getRendererStatus, playSigns, subscribeRendererStatus, type SignPlayback } from '../animation/signRenderer'
import { HandIcon } from './icons'

type Props = {
  signs: SignId[]
  /** Accessible description, e.g. "ဆရာဝန်၏ လက်ဟန်". */
  label: string
  className?: string
}

/** A looping, GIF-like MSL animation of the Warm Hands character. */
export default function SignGif({ signs, label, className = 'w-56 sm:w-64' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playbackRef = useRef<SignPlayback | null>(null)
  const [clip, setClip] = useState(-1)
  const status = useSyncExternalStore(subscribeRendererStatus, getRendererStatus)
  const key = signs.join(',')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !key) return
    const playback = playSigns(canvas, key.split(',') as SignId[], setClip)
    playbackRef.current = playback
    return () => {
      playback.dispose()
      playbackRef.current = null
    }
  }, [key])

  if (!signs.length) {
    return (
      <div className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-orange-50 p-4 text-center text-base text-gray-700 ${className}`}>
        <HandIcon className="h-10 w-10 text-[#ff7a00]" />
        ဤစာအတွက် လက်ဟန် မရှိသေးပါ
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => playbackRef.current?.restart()}
      aria-label={`${label} — ထပ်ကြည့်ရန် နှိပ်ပါ`}
      className={`group relative block aspect-square cursor-pointer overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_center,#fff3e3_0%,#ffe2c0_70%,#ffd3a3_100%)] ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      {status === 'fallback' && <img src={fallbackImage} alt="" className="absolute inset-0 h-full w-full object-contain" />}
      {(status === 'loading' || status === 'idle') && (
        <span className="absolute inset-0 grid place-items-center text-base font-semibold text-[#9a4b00]">လက်ဟန် ပြင်ဆင်နေသည်…</span>
      )}
      {signs.length > 1 && status === 'ready' && (
        <span className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden="true">
          {signs.map((id, index) => (
            <span key={`${id}-${index}`} className={`h-2 rounded-full transition-all ${index === clip ? 'w-5 bg-[#ff7a00]' : 'w-2 bg-[#ff7a00]/35'}`} />
          ))}
        </span>
      )}
      <span className="absolute right-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-xs font-bold text-[#9a4b00] opacity-80 group-hover:opacity-100">MSL ↻</span>
    </button>
  )
}
