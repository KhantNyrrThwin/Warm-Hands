import type { useSignCapture } from '../hooks/useSignCapture'
import { planSigns } from '../animation/greetingInput'
import SignGif from './SignGif'
import { CloseIcon, SendIcon } from './icons'

type Capture = ReturnType<typeof useSignCapture>

type Props = {
  capture: Capture
  onSend: (text: string) => void
  onRetry: () => void
  onClose: () => void
}

/** Full-screen camera view where the patient signs a message in MSL. */
export default function SignCapture({ capture, onSend, onRetry, onClose }: Props) {
  const { videoRef, camera, sentence, hands, signNumber, remaining, completed } = capture
  const reviewing = completed

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/85 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label="လက်ဟန်ဖြင့် စာပို့ရန်">
      <div className="relative aspect-[3/4] max-h-[72dvh] w-full max-w-3xl overflow-hidden rounded-3xl border-4 border-[#ff7a00] bg-black shadow-[0_0_40px_rgba(255,122,0,0.3)] sm:aspect-video">
        <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full scale-x-[-1] object-cover ${reviewing ? 'opacity-30' : ''}`} />

        {camera === 'starting' && (
          <p className="absolute inset-0 grid place-items-center text-2xl font-bold text-white" role="status">ကင်မရာဖွင့်နေသည်…</p>
        )}

        {!reviewing && camera === 'on' && (
          <>
            <div className="absolute left-3 top-3 flex flex-col gap-2">
              <span className="flex w-fit items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-sm font-bold tracking-wider text-white shadow-lg">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" aria-hidden="true" /> ကင်မရာ ဖွင့်ထား
              </span>
              <span className={`flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-lg ${hands ? 'bg-emerald-600 text-white' : 'bg-white/90 text-gray-800'}`} role="status">
                {hands ? '✋ လက်တွေ့ပြီ' : 'လက်ကို ကင်မရာထဲ ထားပါ'}
              </span>
            </div>
            <div className="absolute right-3 top-3 rounded-2xl bg-black/70 px-5 py-3 text-center text-white" role="timer" aria-label="ယခုလက်ဟန်အတွက် ကျန်ချိန်">
              <div className="text-sm">လက်ဟန် {signNumber}</div>
              <div className="text-5xl font-bold tabular-nums">{remaining}</div>
            </div>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-5 pb-5 pt-12 text-center">
          {reviewing ? (
            <>
              <p className="text-lg font-semibold text-orange-200">{sentence ? 'ဤစာကို ဆရာဝန်ထံ ပို့မလား။' : 'လက်ဟန်မတွေ့ပါ။ ပြန်ပြကြည့်ပါ။'}</p>
              {sentence && (
                <div className="mt-3 flex items-center justify-center gap-4">
                  <SignGif signs={planSigns(sentence).playable} label="သင်၏ လက်ဟန်" className="w-32 shrink-0 sm:w-40" />
                  <p className="text-left text-3xl font-bold leading-snug text-white" aria-live="polite">{sentence}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-3xl font-bold leading-snug text-white drop-shadow" aria-live="polite">{sentence || 'လက်ဟန်ပြပါ'}</p>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-3xl flex-wrap justify-center gap-3">
        {reviewing ? (
          <>
            {sentence && (
              <button type="button" onClick={() => onSend(sentence)} className="flex min-h-16 flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[#ff7a00] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98]">
                <SendIcon /> ပို့ရန်
              </button>
            )}
            <button type="button" onClick={onRetry} className="min-h-16 flex-1 cursor-pointer rounded-2xl border-2 border-white/60 bg-white/10 px-6 text-xl font-bold text-white hover:bg-white/20">
              ပြန်ပြရန်
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={capture.finish} disabled={camera !== 'on'} className="min-h-16 flex-[2] cursor-pointer rounded-2xl bg-[#ff7a00] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98] disabled:opacity-50">
              ပြီးပါပြီ
            </button>
            <button type="button" onClick={capture.restart} disabled={camera !== 'on'} className="min-h-16 flex-1 cursor-pointer rounded-2xl border-2 border-white/60 bg-white/10 px-6 text-xl font-bold text-white hover:bg-white/20 disabled:opacity-50">
              ပြန်စရန်
            </button>
          </>
        )}
        <button type="button" onClick={onClose} aria-label="ပိတ်ရန်" className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-white/60 bg-white/10 px-5 text-xl font-bold text-white hover:bg-white/20">
          <CloseIcon /> ပိတ်ရန်
        </button>
      </div>

      {!reviewing && (
        <p className="max-w-3xl rounded-xl bg-black/40 px-5 py-2 text-center text-lg text-white">
          ၅ စက္ကန့်အတွင်း လက်ဟန်တစ်ခု ပြပါ။ စာကြောင်းပြီးလျှင် “ပြီးပါပြီ” ကို နှိပ်ပါ။
        </p>
      )}
    </div>
  )
}
