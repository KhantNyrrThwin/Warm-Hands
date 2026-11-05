import type { SignId } from '../animation/signs'

/**
 * Clinic conversation link between the doctor device and the patient device.
 *
 * Both devices open the app from the same computer (the one running
 * `npm run dev:clinic` + the AI server) over the clinic Wi-Fi or a phone
 * hotspot, then join the same 4-digit room code. Messages are relayed by the
 * AI server at `/api/room/{code}`. When that server is not reachable the link
 * falls back to a same-device channel so two browser tabs can still talk.
 */

export type Role = 'doctor' | 'patient'

export type ChatMessage = {
  id: string
  from: Role
  /** Myanmar text: typed/spoken by the doctor, or recognised from the patient's signs. */
  text: string
  /** How the text was produced. */
  source: 'typed' | 'voice' | 'sign'
  /** Animated MSL clips for this message, in order. */
  signs: SignId[]
  /** Note from the text→sign planner (missing signs, etc.). */
  note: string
  sentAt: number
}

export const SENDER: Record<Role, string> = { doctor: 'ဆရာဝန်', patient: 'လူနာ' }

export type LinkStatus = 'connecting' | 'online' | 'local' | 'offline'

export type Presence = Record<Role, boolean>

export type RoomHandlers = {
  onStatus: (status: LinkStatus) => void
  onPresence: (presence: Presence) => void
  onHistory: (messages: ChatMessage[]) => void
  onMessage: (message: ChatMessage) => void
  /** The relay stored the message (shown as a delivered tick). */
  onAck?: (id: string) => void
}

export type RoomLink = {
  send: (message: ChatMessage) => void
  close: () => void
}

export const newRoomCode = () => String(Math.floor(1000 + Math.random() * 9000))

export const newMessageId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const isRoomCode = (value: string) => /^\d{4}$/.test(value)

/** LAN addresses of the host computer, so the doctor can tell the patient where to connect. */
export async function getJoinAddresses(): Promise<string[]> {
  const { protocol, hostname, port } = window.location
  const suffix = port ? `:${port}` : ''
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  if (!local) return [`${protocol}//${hostname}${suffix}`]
  try {
    const response = await fetch('/api/network')
    if (!response.ok) return []
    const data = (await response.json()) as { addresses?: string[] }
    return (data.addresses ?? []).map((address) => `https://${address}${suffix}`)
  } catch {
    return []
  }
}

export function joinRoom(code: string, role: Role, handlers: RoomHandlers): RoomLink {
  let closed = false
  let socket: WebSocket | null = null
  let local: ReturnType<typeof localChannel> | null = null
  let retry = 0
  let retryTimer = 0
  let everOpened = false
  const outbox: ChatMessage[] = []

  const connect = () => {
    if (closed) return
    handlers.onStatus('connecting')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/room/${code}?role=${role}`)
    socket = ws
    ws.onopen = () => {
      everOpened = true
      retry = 0
      handlers.onStatus('online')
      while (outbox.length) ws.send(JSON.stringify({ type: 'message', message: outbox.shift() }))
    }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data))
        if (data.type === 'history') handlers.onHistory(data.messages as ChatMessage[])
        else if (data.type === 'presence') handlers.onPresence({ doctor: !!data.doctor, patient: !!data.patient })
        else if (data.type === 'message') handlers.onMessage(data.message as ChatMessage)
        else if (data.type === 'ack' && data.id) handlers.onAck?.(String(data.id))
      } catch {
        /* ignore malformed frames */
      }
    }
    ws.onclose = () => {
      if (closed || socket !== ws) return
      socket = null
      if (!everOpened && retry >= 1) {
        // Relay server is not running: keep working between tabs on this device.
        local = localChannel(code, role, handlers)
        handlers.onStatus('local')
        while (outbox.length) local.send(outbox.shift()!)
        return
      }
      handlers.onStatus('offline')
      handlers.onPresence({ doctor: role === 'doctor', patient: role === 'patient' })
      retry += 1
      retryTimer = window.setTimeout(connect, Math.min(1000 * 2 ** retry, 8000))
    }
  }

  connect()

  return {
    send(message) {
      if (local) return local.send(message)
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'message', message }))
      else outbox.push(message)
    },
    close() {
      closed = true
      window.clearTimeout(retryTimer)
      socket?.close()
      local?.close()
    },
  }
}

/** Same-device fallback (two tabs) using BroadcastChannel + sessionless storage. */
function localChannel(code: string, role: Role, handlers: RoomHandlers) {
  const key = `warm-hands-room-${code}`
  const channel = new BroadcastChannel(key)
  const peer: Role = role === 'doctor' ? 'patient' : 'doctor'
  let peerSeen = 0

  const readHistory = (): ChatMessage[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]') as ChatMessage[]
    } catch {
      return []
    }
  }
  const writeHistory = (messages: ChatMessage[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(messages.slice(-200)))
    } catch {
      /* storage unavailable */
    }
  }

  handlers.onHistory(readHistory())
  const report = () => handlers.onPresence({ [role]: true, [peer]: Date.now() - peerSeen < 5000 } as Presence)
  channel.onmessage = (event) => {
    const data = event.data as { type: string; role?: Role; message?: ChatMessage }
    if (data.role === peer) peerSeen = Date.now()
    if (data.type === 'bye' && data.role === peer) peerSeen = 0
    if (data.type === 'message' && data.message) handlers.onMessage(data.message)
    report()
  }
  const beat = () => channel.postMessage({ type: 'beat', role })
  beat()
  report()
  const timer = window.setInterval(() => { beat(); report() }, 2000)

  return {
    send(message: ChatMessage) {
      writeHistory([...readHistory(), message])
      channel.postMessage({ type: 'message', role, message })
      handlers.onAck?.(message.id)
    },
    close() {
      window.clearInterval(timer)
      channel.postMessage({ type: 'bye', role })
      channel.close()
    },
  }
}
