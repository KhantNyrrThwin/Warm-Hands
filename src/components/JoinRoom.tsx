import { useState } from 'react'
import logoImg from '../assets/LOGO.png'
import { isRoomCode, newRoomCode, type Role } from '../api/conversation'
import { WifiIcon } from './icons'

type Props = {
  role: Role
  initialCode?: string
  onJoin: (code: string) => void
  onBack: () => void
}

/**
 * Doctor: start a new room (or rejoin one). Patient: type the doctor's code.
 */
export default function JoinRoom({ role, initialCode = '', onJoin, onBack }: Props) {
  const [code, setCode] = useState(initialCode)
  const valid = isRoomCode(code)
  const doctor = role === 'doctor'

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-10 sm:px-8">
      <img src={logoImg} alt="Warm Hands" className="mb-6 h-12 w-fit object-contain drop-shadow-md sm:h-14" />
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl backdrop-blur-xl sm:p-10" aria-labelledby="join-title">
        <button type="button" onClick={onBack} className="mb-6 cursor-pointer rounded-full border-2 border-gray-300 bg-white px-4 py-2 text-base font-bold text-gray-700 hover:bg-gray-50">
          ← အခန်းကဏ္ဍ ပြန်ရွေးရန်
        </button>
        <h1 id="join-title" className="text-3xl font-bold text-gray-900">
          {doctor ? 'စကားပြောခန်း စတင်ရန်' : 'ဆရာဝန်၏ အခန်းသို့ ဝင်ရန်'}
        </h1>

        {doctor ? (
          <>
            <p className="mt-3 text-lg text-gray-700">အခန်းနံပါတ်အသစ် ဖွင့်ပြီး လူနာကို ပြပါ။ လူနာက ထိုနံပါတ်ကို သူ့စက်တွင် ရိုက်ထည့်ပါမည်။</p>
            <button
              type="button"
              onClick={() => onJoin(newRoomCode())}
              className="mt-6 w-full cursor-pointer rounded-2xl bg-[#ff7a00] px-6 py-5 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98]"
            >
              အခန်းအသစ် ဖွင့်ရန်
            </button>
            <p className="mt-8 text-base font-semibold text-gray-600">သို့မဟုတ် ယခင်အခန်းသို့ ပြန်ဝင်ရန်</p>
          </>
        ) : (
          <ol className="mt-4 space-y-2 text-lg text-gray-800">
            <li><strong className="text-[#c25e00]">၁။</strong> ဤစက်ကို ဆရာဝန်နှင့် Wi‑Fi တစ်ခုတည်းတွင် ချိတ်ပါ။</li>
            <li><strong className="text-[#c25e00]">၂။</strong> ဆရာဝန်၏ မျက်နှာပြင်ပေါ်ရှိ ဂဏန်း ၄ လုံးကို ရိုက်ထည့်ပါ။</li>
          </ol>
        )}

        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) onJoin(code)
          }}
        >
          <label className="sr-only" htmlFor="room-code">အခန်းနံပါတ် (ဂဏန်း ၄ လုံး)</label>
          <input
            id="room-code"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            autoFocus={!doctor}
            className="min-w-0 flex-1 rounded-2xl border-[3px] border-[#ff7a00] bg-white px-5 py-4 text-center text-5xl font-bold tracking-[.4em] text-gray-900 tabular-nums outline-none placeholder:text-gray-300 focus:ring-4 focus:ring-orange-200"
          />
          <button
            type="submit"
            disabled={!valid}
            className={`cursor-pointer rounded-2xl px-8 py-4 text-2xl font-bold shadow-md active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${doctor ? 'border-[3px] border-[#ff7a00] bg-white text-[#c25e00] hover:bg-orange-50' : 'bg-[#ff7a00] text-white hover:bg-[#e66f00]'}`}
          >
            ဝင်ရန်
          </button>
        </form>

        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-base text-gray-800">
          <WifiIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#c25e00]" />
          <p>
            {doctor
              ? 'အခန်းဖွင့်ပြီးနောက် လူနာစက်တွင် ဖွင့်ရမည့် လိပ်စာနှင့် အခန်းနံပါတ်ကို ပြပေးပါမည်။'
              : 'လိပ်စာကို ဆရာဝန်၏ မျက်နှာပြင်တွင် ကြည့်ပါ။ ဥပမာ https://192.168.1.5:5173'}
          </p>
        </div>
      </section>
    </main>
  )
}
