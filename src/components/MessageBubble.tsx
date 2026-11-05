import { SENDER, type ChatMessage, type Role } from '../api/conversation'
import SignGif from './SignGif'
import { DoctorIcon, PatientIcon } from './icons'

type Props = {
  message: ChatMessage
  viewer: Role
  delivered: boolean
  /** Last bubble of a run from the same sender: gets the tail and avatar. */
  groupEnd: boolean
  /** First bubble of a run: gets the sender name. */
  groupStart: boolean
}

const time = (value: number) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function Avatar({ role, className = 'h-10 w-10' }: { role: Role; className?: string }) {
  const Icon = role === 'doctor' ? DoctorIcon : PatientIcon
  return (
    <span className={`grid shrink-0 place-items-center rounded-full shadow ${role === 'doctor' ? 'bg-[#ff7a00] text-white' : 'bg-orange-100 text-[#c25e00]'} ${className}`} aria-hidden="true">
      <Icon className="h-[55%] w-[55%]" />
    </span>
  )
}

/**
 * Messenger-style bubble. What each side sees:
 *  - Doctor: sent = text + MSL animation; received = text only.
 *  - Patient: sent and received = MSL animation only.
 */
export default function MessageBubble({ message, viewer, delivered, groupEnd, groupStart }: Props) {
  const mine = message.from === viewer
  const showText = viewer === 'doctor'
  const showSign = viewer === 'patient' || mine
  const who = mine ? 'သင်' : SENDER[message.from]

  const meta = (
    <span className={`ml-auto flex shrink-0 items-center gap-1 self-end text-xs font-semibold ${mine ? 'text-orange-50' : 'text-gray-500'}`}>
      {time(message.sentAt)}
      {mine && (
        <span aria-label={delivered ? 'ပို့ပြီး' : 'ပို့နေသည်'} className="text-sm leading-none">
          {delivered ? '✓✓' : '🕓'}
        </span>
      )}
    </span>
  )

  return (
    <li className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${groupEnd ? 'mb-3' : 'mb-0.5'}`}>
      {!mine && (groupEnd ? <Avatar role={message.from} /> : <span className="w-10 shrink-0" aria-hidden="true" />)}

      <article
        aria-label={`${who} ${time(message.sentAt)}`}
        className={`relative max-w-[82%] shadow-sm sm:max-w-[70%] ${showSign ? 'p-1.5' : 'px-4 py-2.5'} ${mine
          ? `bg-[#ff7a00] text-white ${groupEnd ? 'rounded-[22px] rounded-br-md bubble-tail-right' : 'rounded-[22px] rounded-br-md'}`
          : `bg-white text-gray-900 ${groupEnd ? 'rounded-[22px] rounded-bl-md bubble-tail-left' : 'rounded-[22px] rounded-bl-md'}`}`}
      >
        {!mine && groupStart && (
          <p className={`text-sm font-bold text-[#c25e00] ${showSign ? 'px-2.5 pb-1 pt-1' : ''}`}>{SENDER[message.from]}</p>
        )}

        {showSign && (
          <SignGif signs={message.signs} label={`${who}၏ လက်ဟန်`} className="w-52 sm:w-60" />
        )}

        {showText ? (
          <div className={`flex flex-wrap items-end gap-x-3 ${showSign ? 'px-2.5 pb-1 pt-2' : ''}`}>
            <p className="whitespace-pre-wrap break-words text-xl leading-relaxed">{message.text}</p>
            {meta}
          </div>
        ) : (
          <div className="flex px-2 pb-0.5 pt-1">{meta}</div>
        )}

        {mine && viewer === 'doctor' && message.note && (
          <p className="px-2.5 pb-1 text-sm text-orange-50">{message.note}</p>
        )}
      </article>
    </li>
  )
}
