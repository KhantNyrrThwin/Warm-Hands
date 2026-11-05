import { useCallback, useEffect, useRef, useState } from 'react'
import MessageBubble, { Avatar } from './MessageBubble'
import Notification from './Notification'
import SignCapture from './SignCapture'
import StatusPill, { type Tone } from './StatusPill'
import { CameraIcon, HandIcon, MicIcon, SendIcon } from './icons'
import {
  getJoinAddresses,
  joinRoom,
  SENDER,
  newMessageId,
  type ChatMessage,
  type LinkStatus,
  type Presence,
  type Role,
  type RoomLink,
} from '../api/conversation'
import { translateTextToSigns } from '../api/translation'
import { useSpeechInput, type MicStatus } from '../hooks/useSpeechInput'
import { useSignCapture, type CameraStatus, type RecognizerStatus } from '../hooks/useSignCapture'

type Props = { role: Role; code: string; onLeave: () => void }

const LINK: Record<LinkStatus, [string, Tone]> = {
  online: ['ချိတ်ဆက်ပြီး', 'ok'],
  connecting: ['ချိတ်ဆက်နေသည်…', 'busy'],
  local: ['ဤစက်တွင်သာ', 'busy'],
  offline: ['ချိတ်ဆက်မှု ပြတ်နေ', 'warn'],
}
const MIC: Record<MicStatus, [string, Tone]> = {
  ready: ['မိုက် အဆင်သင့်', 'off'],
  listening: ['မိုက် နားထောင်နေ', 'busy'],
  blocked: ['မိုက် ခွင့်မပြု', 'warn'],
  unsupported: ['မိုက် မရနိုင်', 'warn'],
}
const CAMERA: Record<CameraStatus, [string, Tone]> = {
  off: ['ကင်မရာ ပိတ်ထား', 'off'],
  starting: ['ကင်မရာ ဖွင့်နေ…', 'busy'],
  on: ['ကင်မရာ ဖွင့်ထား', 'ok'],
  blocked: ['ကင်မရာ ခွင့်မပြု', 'warn'],
}
const RECOGNIZER: Record<RecognizerStatus, [string, Tone]> = {
  unknown: ['လက်ဟန် AI စစ်နေ…', 'off'],
  ready: ['လက်ဟန် AI အဆင်သင့်', 'ok'],
  offline: ['လက်ဟန် AI မရှိ', 'warn'],
}

const DOCTOR_PHRASES = ['မင်္ဂလာပါ', 'နေမကောင်းဘူးလား', 'ခေါင်းကိုက်လား', 'ဆေးသောက်ပါ', 'ကျေးဇူးတင်ပါတယ်']

export default function ConversationScreen({ role, code, onLeave }: Props) {
  const peer: Role = role === 'doctor' ? 'patient' : 'doctor'
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [delivered, setDelivered] = useState<Set<string>>(() => new Set())
  const [link, setLink] = useState<LinkStatus>('connecting')
  const [presence, setPresence] = useState<Presence>({ doctor: role === 'doctor', patient: role === 'patient' })
  const [notice, setNotice] = useState('')
  const [addresses, setAddresses] = useState<string[]>([])
  const linkRef = useRef<RoomLink | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const room = joinRoom(code, role, {
      onStatus: setLink,
      onPresence: setPresence,
      onHistory: (history) => {
        setMessages((current) => {
          const known = new Set(history.map((message) => message.id))
          return [...history, ...current.filter((message) => !known.has(message.id))]
        })
        setDelivered((current) => new Set([...current, ...history.map((message) => message.id)]))
      },
      onMessage: (message) => {
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]))
      },
      onAck: (id) => setDelivered((current) => new Set(current).add(id)),
    })
    linkRef.current = room
    return () => {
      room.close()
      linkRef.current = null
    }
  }, [code, role])

  useEffect(() => {
    if (role === 'doctor') void getJoinAddresses().then(setAddresses)
  }, [role])

  // Keep the newest message in view, like a messenger.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = useCallback(async (text: string, source: ChatMessage['source']) => {
    const clean = text.trim()
    if (!clean) return
    const translation = await translateTextToSigns(clean)
    const message: ChatMessage = {
      id: newMessageId(),
      from: role,
      text: clean,
      source,
      signs: translation.signs,
      note: translation.note,
      sentAt: Date.now(),
    }
    setMessages((current) => [...current, message])
    linkRef.current?.send(message)
  }, [role])

  const dismiss = useCallback(() => setNotice(''), [])
  const [linkLabel, linkTone] = LINK[link]
  const peerHere = presence[peer]
  const subtitle = link === 'offline'
    ? 'ချိတ်ဆက်မှု ပြတ်နေသည်'
    : peerHere ? 'အွန်လိုင်း' : `ဝင်ရောက်ရန် စောင့်နေသည် · အခန်း ${code}`

  return (
    <div className="relative z-10 mx-auto flex h-dvh w-full max-w-4xl flex-col bg-white/30 shadow-2xl backdrop-blur-[2px]">
      <Notification message={notice} onDismiss={dismiss} />

      {/* Chat header: who you are talking to ----------------------------------- */}
      <header className="flex items-center gap-3 bg-[#ff7a00] px-3 py-2.5 text-white shadow-md sm:px-5">
        <button type="button" onClick={onLeave} aria-label="စကားပြောခန်းမှ ထွက်ရန်" className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full text-2xl font-bold hover:bg-white/15">
          ←
        </button>
        <span className="relative">
          <Avatar role={peer} className="h-12 w-12 !bg-white !text-[#c25e00]" />
          <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#ff7a00] ${peerHere ? 'bg-emerald-400' : 'bg-gray-300'}`} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{SENDER[peer]}</h1>
          <p className="truncate text-sm text-orange-50">{subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
          သင် · {SENDER[role]}
        </span>
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-base font-bold text-[#c25e00]">
          <span className="sr-only">အခန်း </span><span className="tabular-nums tracking-widest">{code}</span>
        </span>
      </header>

      {/* Device + connection status --------------------------------------------- */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-orange-100 bg-white/90 px-3 py-2 sm:px-5" aria-label="အခြေအနေ">
        <StatusPill label="ချိတ်ဆက်မှု" value={linkLabel} tone={linkTone} />
        {role === 'doctor' ? <DoctorMicPill /> : <PatientPills />}
      </div>

      {/* Conversation -------------------------------------------------------------- */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-[#fff7ee]/80 px-2 py-4 sm:px-6">
        <p className="mx-auto mb-4 w-fit rounded-full bg-black/20 px-3 py-1 text-sm font-semibold text-white">ယနေ့</p>
        {role === 'doctor' && !peerHere && <JoinCard code={code} addresses={addresses} compact={messages.length > 0} />}
        {!messages.length && (role === 'patient' || peerHere) && (
          <div className="mx-auto mt-10 max-w-sm rounded-3xl bg-white/90 p-6 text-center text-lg text-gray-800 shadow">
            <HandIcon className="mx-auto mb-3 h-12 w-12 text-[#ff7a00]" />
            {role === 'patient'
              ? 'ဆရာဝန်၏ စကားကို လက်ဟန်ဖြင့် ပြပေးပါမည်။ သင်ပြောလိုလျှင် အောက်ရှိ ခလုတ်ကို နှိပ်ပါ။'
              : 'လူနာ ဝင်ရောက်ပြီးပါပြီ။ စာရိုက်ပါ သို့မဟုတ် မိုက်ကိုနှိပ်ပြီး ပြောပါ။'}
          </div>
        )}
        <ol aria-live="polite" aria-relevant="additions" aria-label="မက်ဆေ့ချ်များ">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              viewer={role}
              delivered={delivered.has(message.id)}
              groupStart={messages[index - 1]?.from !== message.from}
              groupEnd={messages[index + 1]?.from !== message.from}
            />
          ))}
        </ol>
      </div>

      {role === 'doctor'
        ? <DoctorComposer onSend={send} onNotice={setNotice} />
        : <PatientComposer onSend={(text) => void send(text, 'sign')} onNotice={setNotice} />}
    </div>
  )
}

// ---- Device status store (composer → status strip) -------------------------------
// The mic/camera hooks live inside the composers; they publish their state here.
type DeviceStatus = { mic: MicStatus; camera: CameraStatus; recognizer: RecognizerStatus }
let deviceStatus: DeviceStatus = { mic: 'ready', camera: 'off', recognizer: 'unknown' }
const listeners = new Set<() => void>()
function publishDeviceStatus(next: Partial<DeviceStatus>) {
  deviceStatus = { ...deviceStatus, ...next }
  listeners.forEach((listener) => listener())
}
function useDeviceStatus() {
  const [, force] = useState(0)
  useEffect(() => {
    const listener = () => force((value) => value + 1)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])
  return deviceStatus
}

function DoctorMicPill() {
  const [label, tone] = MIC[useDeviceStatus().mic]
  return <StatusPill label="မိုက်" value={label} tone={tone} />
}

function PatientPills() {
  const status = useDeviceStatus()
  const [cameraLabel, cameraTone] = CAMERA[status.camera]
  const [aiLabel, aiTone] = RECOGNIZER[status.recognizer]
  return (
    <>
      <StatusPill label="ကင်မရာ" value={cameraLabel} tone={cameraTone} />
      <StatusPill label="လက်ဟန် AI" value={aiLabel} tone={aiTone} />
    </>
  )
}

// ---- Doctor: type or speak ----------------------------------------------------------
function DoctorComposer({ onSend, onNotice }: { onSend: (text: string, source: ChatMessage['source']) => Promise<void>; onNotice: (text: string) => void }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState<ChatMessage['source']>('typed')
  const speech = useSpeechInput((heard) => {
    setText((current) => (current ? `${current} ${heard}` : heard))
    setSource('voice')
  }, onNotice)
  useEffect(() => { publishDeviceStatus({ mic: speech.status }) }, [speech.status])

  const submit = () => {
    if (!text.trim()) return
    void onSend(text, source)
    setText('')
    setSource('typed')
  }
  const listening = speech.status === 'listening'

  return (
    <div className="border-t border-orange-100 bg-white px-2 pb-3 pt-2 sm:px-4">
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1" aria-label="အမြန်စကားစု">
        {DOCTOR_PHRASES.map((phrase) => (
          <button key={phrase} type="button" onClick={() => void onSend(phrase, 'typed')} className="shrink-0 cursor-pointer rounded-full border-2 border-orange-200 bg-orange-50 px-4 py-1.5 text-base font-semibold text-gray-900 hover:border-[#ff7a00]">
            {phrase}
          </button>
        ))}
      </div>
      {listening && (
        <p className="mb-2 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-lg font-semibold text-red-800" role="status">
          <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
          နားထောင်နေသည်… {speech.interim}
        </p>
      )}
      <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); submit() }}>
        <div className="flex min-w-0 flex-1 items-end rounded-[28px] border-2 border-orange-200 bg-orange-50/60 focus-within:border-[#ff7a00] focus-within:bg-white">
          <label htmlFor="doctor-message" className="sr-only">လူနာထံ ပို့မည့်စာ</label>
          <textarea
            id="doctor-message"
            rows={1}
            value={text}
            onChange={(event) => { setText(event.target.value); if (!event.target.value) setSource('typed') }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submit()
              }
            }}
            placeholder="မက်ဆေ့ချ် ရိုက်ပါ…"
            className="max-h-36 min-h-14 min-w-0 flex-1 resize-none bg-transparent px-5 py-3.5 text-xl text-gray-900 outline-none placeholder:text-gray-500"
          />
          <button
            type="button"
            onClick={listening ? speech.stop : speech.start}
            aria-pressed={listening}
            aria-label={listening ? 'အသံဖမ်းခြင်း ရပ်ရန်' : 'အသံဖြင့် ပြောရန်'}
            className={`m-1 grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full active:scale-95 ${listening ? 'bg-red-500 text-white' : 'text-[#c25e00] hover:bg-orange-100'}`}
          >
            {listening ? <span className="h-4 w-4 rounded-sm bg-white" aria-hidden="true" /> : <MicIcon className="h-7 w-7" />}
          </button>
        </div>
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="ပို့ရန်"
          className="grid h-14 w-14 shrink-0 cursor-pointer place-items-center rounded-full bg-[#ff7a00] text-white shadow-md hover:bg-[#e66f00] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendIcon className="h-6 w-6 -translate-x-px translate-y-px" />
        </button>
      </form>
    </div>
  )
}

// ---- Patient: sign to the camera ------------------------------------------------------
function PatientComposer({ onSend, onNotice }: { onSend: (text: string) => void; onNotice: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const capture = useSignCapture('myanmar', onNotice)
  useEffect(() => { publishDeviceStatus({ camera: capture.camera, recognizer: capture.recognizer }) }, [capture.camera, capture.recognizer])

  const begin = async () => {
    setOpen(true)
    if (!(await capture.start())) setOpen(false)
  }
  const close = () => {
    capture.cancel()
    setOpen(false)
  }

  return (
    <div className="border-t border-orange-100 bg-white px-3 pb-3 pt-3 sm:px-4">
      <button
        type="button"
        onClick={() => void begin()}
        disabled={open}
        className="flex min-h-16 w-full cursor-pointer items-center justify-center gap-4 rounded-full bg-[#ff7a00] px-6 text-2xl font-bold text-white shadow-lg hover:bg-[#e66f00] active:scale-[.98] disabled:opacity-60"
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/20"><CameraIcon className="h-7 w-7" /></span>
        လက်ဟန်ဖြင့် ပြောရန်
      </button>
      {open && (
        <SignCapture
          capture={capture}
          onSend={(text) => { onSend(text); close() }}
          onRetry={() => void begin()}
          onClose={close}
        />
      )}
    </div>
  )
}

// ---- Doctor: how the patient joins --------------------------------------------------
function JoinCard({ code, addresses, compact }: { code: string; addresses: string[]; compact: boolean }) {
  if (compact) {
    return (
      <p className="mx-auto mb-4 w-fit rounded-2xl border-2 border-dashed border-[#ff7a00] bg-white/95 px-4 py-2 text-center text-lg text-gray-900" role="status">
        လူနာ ချိတ်ဆက်မှု ပြတ်နေသည် — အခန်း <strong className="tabular-nums tracking-widest">{code}</strong> ဖြင့် ပြန်ဝင်ပါ
      </p>
    )
  }
  return (
    <section className="mx-auto mb-6 w-full max-w-xl rounded-3xl border-[3px] border-dashed border-[#ff7a00] bg-white/95 p-6 text-gray-900 shadow-lg" aria-label="လူနာ ဝင်ရောက်နည်း">
      <p className="text-center text-lg font-bold text-[#c25e00]">လူနာ ဝင်ရောက်ရန် စောင့်နေသည်</p>
      <p className="mt-1 text-center text-base text-gray-700">ဤနံပါတ်ကို လူနာကို ပြပါ</p>
      <p className="my-4 text-center text-7xl font-bold tracking-[.3em] text-gray-900 tabular-nums" aria-label={`အခန်းနံပါတ် ${code.split('').join(' ')}`}>{code}</p>
      <ol className="space-y-2 text-lg">
        <li><strong className="text-[#c25e00]">၁။</strong> လူနာစက်ကို ဤ Wi‑Fi / Hotspot တွင် ချိတ်ပါ။</li>
        <li>
          <strong className="text-[#c25e00]">၂။</strong> လူနာစက်၏ browser တွင် ဖွင့်ပါ —
          {addresses.length ? (
            addresses.map((address) => (
              <span key={address} className="mt-1 block break-all rounded-xl bg-orange-50 px-3 py-2 font-mono text-lg font-bold text-gray-900">{address}/?role=patient&amp;room={code}</span>
            ))
          ) : (
            <span className="mt-1 block rounded-xl bg-orange-50 px-3 py-2 text-base text-gray-700">ဤကွန်ပျူတာ၏ IP လိပ်စာ (npm run dev:clinic ဖြင့် ပြပါမည်)</span>
          )}
        </li>
        <li><strong className="text-[#c25e00]">၃။</strong> “လူနာ” ကိုရွေးပြီး အခန်းနံပါတ် <strong className="tabular-nums">{code}</strong> ကို ရိုက်ထည့်ပါ။</li>
      </ol>
    </section>
  )
}
