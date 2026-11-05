import logoImg from '../assets/LOGO.png'
import type { Role } from '../api/conversation'
import { DoctorIcon, PatientIcon, WifiIcon } from './icons'

const ROLES: Array<{ role: Role; title: string; english: string; detail: string; Icon: typeof DoctorIcon }> = [
  {
    role: 'doctor',
    title: 'ဆရာဝန်',
    english: 'Doctor',
    detail: 'စာရိုက်ပါ သို့မဟုတ် အသံဖြင့်ပြောပါ — လူနာထံ လက်ဟန်ဖြင့် ပြပေးပါမည်။',
    Icon: DoctorIcon,
  },
  {
    role: 'patient',
    title: 'လူနာ',
    english: 'Patient',
    detail: 'ကင်မရာရှေ့တွင် လက်ဟန်ပြပါ — ဆရာဝန်ထံ စာသားဖြင့် ပို့ပေးပါမည်။',
    Icon: PatientIcon,
  },
]

export default function RoleSelect({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-8">
      <img src={logoImg} alt="Warm Hands" className="mb-8 h-14 w-fit object-contain drop-shadow-md sm:h-16" />
      <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-2xl backdrop-blur-xl sm:p-10" aria-labelledby="role-title">
        <p className="text-base font-bold text-[#c25e00]">ဆေးခန်း စကားပြောခန်း · Clinic conversation</p>
        <h1 id="role-title" className="mt-2 text-3xl font-bold leading-snug text-gray-900 sm:text-4xl">သင်ဘယ်သူလဲ။</h1>
        <p className="mt-2 text-lg text-gray-700">ဤစက်ကို အသုံးပြုမည့်သူကို ရွေးပါ။ Choose who is using this device.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ROLES.map(({ role, title, english, detail, Icon }) => (
            <button
              key={role}
              type="button"
              onClick={() => onSelect(role)}
              className="group flex min-h-48 cursor-pointer flex-col items-start gap-3 rounded-3xl border-[3px] border-[#ff7a00] bg-white p-6 text-left shadow-md transition-all hover:bg-orange-50 hover:shadow-xl focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#ff7a00] active:scale-[.98]"
            >
              <span className={`grid h-16 w-16 place-items-center rounded-2xl ${role === 'doctor' ? 'bg-[#ff7a00] text-white' : 'bg-orange-100 text-[#c25e00]'}`}>
                <Icon />
              </span>
              <span className="text-3xl font-bold text-gray-900">
                {title} <span className="text-xl font-semibold text-gray-500">· {english}</span>
              </span>
              <span className="text-lg leading-relaxed text-gray-700">{detail}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-base text-gray-800">
          <WifiIcon className="mt-0.5 h-6 w-6 shrink-0 text-[#c25e00]" />
          <p>
            စက်နှစ်လုံးကို <strong>Wi‑Fi တစ်ခုတည်း</strong> (သို့မဟုတ် ဖုန်း Hotspot) တွင် ချိတ်ပါ။ ဆရာဝန်က အခန်းနံပါတ်ဖွင့်ပြီး လူနာက ထိုနံပါတ်ဖြင့် ဝင်ပါ။
          </p>
        </div>
      </section>
    </main>
  )
}
