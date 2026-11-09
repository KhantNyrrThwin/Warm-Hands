import { useEffect, useRef, useState } from 'react'
import { translateTextToSigns } from '../api/translation'
import type { SignId } from '../animation/signs'
import { WORD_SECONDS, type DemoLine } from '../demo/script'
import SignGif from './SignGif'
import { CloseIcon, SendIcon } from './icons'

type Props = {
  line: DemoLine
  onSend: (text: string) => void
  onClose: () => void
}

/**
 * DEMO: full-screen camera where the patient signs the scripted line one
 * word per round. Each round reveals the next scripted word; the result is
 * always the scripted sentence.
 */
export default function DemoSignCapture({ line, onSend, onClose }: Props) {
  const words = line.words ?? []
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camera, setCamera] = useState<'starting' | 'on' | 'none'>('starting')
  const [found, setFound] = useState(0)
  const [remaining, setRemaining] = useState(WORD_SECONDS)
  const [run, setRun] = useState(0)
  const [signs, setSigns] = useState<SignId[]>([])
  const done = found >= words.length

  useEffect(() => { void translateTextToSigns(line.text).then((t) => setSigns(t.signs)) }, [line.text])

  // Camera (preview only).
  useEffect(() => {
    let live = true
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (!live) { stream.getTracks().forEach((track) => track.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCamera('on')
      } catch {
        if (live) setCamera('none')
      }
    }
    void start()
    return () => {
      live = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // One countdown round per word.
  useEffect(() => {
    if (camera === 'starting' || done) return
    const began = performance.now()
    const timer = window.setInterval(() => {
      const left = WORD_SECONDS - (performance.now() - began) / 1000
      if (left <= 0) {
        window.clearInterval(timer)
        setRemaining(WORD_SECONDS)
        setFound((value) => value + 1)
      } else setRemaining(Math.ceil(left))
    }, 100)
    return () => window.clearInterval(timer)
  }, [camera, done, found, run])

  const restart = () => {
    setFound(0)
    setRemaining(WORD_SECONDS)
    setRun((value) => value + 1)
  }

  const sentence = done ? line.text : words.slice(0, found).map((word) => word.label).join(' ')

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/85 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label="လက်ဟန်ဖြင့် စာပို့ရန်">
      <div className="relative aspect-[3/4] max-h-[72dvh] w-full max-w-3xl overflow-hidden rounded-3xl border-4 border-[#ff7a00] bg-black shadow-[0_0_40px_rgba(255,122,0,0.3)] sm:aspect-video">
        <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full scale-x-[-1] object-cover ${done ? 'opacity-30' : ''}`} />

        {camera === 'starting' && (
          <p className="absolute inset-0 grid place-items-center text-2xl font-bold text-white" role="status">ကင်မရာဖွင့်နေသည်…</p>
        )}

        {!done && camera !== 'starting' && (
          <>
            <div className="absolute left-3 top-3 flex flex-col gap-2">
              <span className="flex w-fit items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold tracking-wider text-white shadow-lg">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" aria-hidden="true" /> ကင်မရာ ဖွင့်ထား
              </span>
              <span className="flex w-fit items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg" role="status">
                ✋ လက်ဟန် ဖတ်နေသည်
              </span>
            </div>
            <div className="absolute right-3 top-3 rounded-2xl bg-black/70 px-5 py-3 text-center text-white" role="timer" aria-label="ယခုလက်ဟန်အတွက် ကျန်ချိန်">
              <div className="text-sm">လက်ဟန် {found + 1} / {words.length}</div>
              <div className="text-5xl font-bold tabular-nums">{remaining}</div>
            </div>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-5 pt-12 text-center">
          {!done && found > 0 && (
            <div className="mb-2 flex flex-wrap justify-center gap-2">
              {words.slice(0, found).map((word, index) => (
                <span key={`${word.id}-${index}`} className="rounded-full bg-[#ff7a00] px-4 py-1 text-xl font-bold text-white shadow">{word.label}</span>
              ))}
            </div>
          )}
          {done ? (
            <>
              <p className="text-lg font-semibold text-orange-200">ဤစာကို ဆရာဝန်ထံ ပို့မလား။</p>
              <div className="mt-3 flex items-center justify-center gap-4">
                <SignGif signs={signs} label="သင်၏ လက်ဟန်" className="w-32 shrink-0 sm:w-40" />
                <p className="text-left text-3xl font-bold leading-snug text-white" aria-live="polite">{sentence}</p>
              </div>
            </>
          ) : (
            <p className="text-3xl font-bold leading-snug text-white drop-shadow" aria-live="polite">{found ? '' : 'လက်ဟန်ပြပါ'}</p>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-3xl flex-wrap justify-center gap-3">
        {done ? (
          <>
            <button type="button" onClick={() => onSend(line.text)} className="flex min-h-16 flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#ff7a00] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98]">
              <SendIcon /> ပို့ရန်
            </button>
            <button type="button" onClick={restart} className="min-h-16 flex-1 cursor-pointer rounded-2xl border-2 border-white/60 bg-white/10 px-6 text-xl font-bold text-white hover:bg-white/20">
              ပြန်ပြရန်
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setFound(words.length)} disabled={camera === 'starting'} className="min-h-16 flex-[2] cursor-pointer rounded-2xl bg-[#ff7a00] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98] disabled:opacity-50">
              ပြီးပါပြီ
            </button>
            <button type="button" onClick={restart} disabled={camera === 'starting'} className="min-h-16 flex-1 cursor-pointer rounded-2xl border-2 border-white/60 bg-white/10 px-6 text-xl font-bold text-white hover:bg-white/20 disabled:opacity-50">
              ပြန်စရန်
            </button>
          </>
        )}
        <button type="button" onClick={onClose} aria-label="ပိတ်ရန်" className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-white/60 bg-white/10 px-5 text-xl font-bold text-white hover:bg-white/20">
          <CloseIcon /> ပိတ်ရန်
        </button>
      </div>

      {!done && (
        <p className="max-w-3xl rounded-xl bg-black/40 px-5 py-2 text-center text-lg text-white">
          {WORD_SECONDS} စက္ကန့်အတွင်း စကားလုံးတစ်လုံးချင်း လက်ဟန်ပြပါ။
        </p>
      )}
    </div>
  )
}
