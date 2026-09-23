export const LIVE_FRAME_MS = 120

export type AiHealth = {
  ok: boolean
  clip_seconds: number
  error?: string | null
  model?: string
  is_msl?: boolean
}

export async function getAiHealth(): Promise<AiHealth> {
  const response = await fetch('/api/health')
  if (!response.ok) {
    throw new Error('The Python sign-language service is not running.')
  }
  return response.json() as Promise<AiHealth>
}

export type LiveUpdate = {
  sentence: string
  grammar: string
  myanmar: string
  latest: string
  confidence: number
  hands: boolean
  buffered: number
  error?: string
}

export type LiveConnection = {
  sendFrame: (frame: Blob) => void
  reset: () => void
  close: () => void
}

export function connectLiveTranslator(
  onUpdate: (update: LiveUpdate) => void,
  onError: (message: string) => void,
): LiveConnection {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const socket = new WebSocket(`${protocol}//${window.location.host}/api/live`)
  socket.binaryType = 'arraybuffer'
  let inflight = false
  let pending: Blob | null = null
  let closed = false

  const pump = () => {
    if (closed || inflight || !pending || socket.readyState !== WebSocket.OPEN) return
    const frame = pending
    pending = null
    inflight = true
    void frame.arrayBuffer().then((buffer) => {
      if (closed || socket.readyState !== WebSocket.OPEN) {
        inflight = false
        return
      }
      socket.send(buffer)
    })
  }

  socket.onmessage = (event) => {
    inflight = false
    try {
      const update = JSON.parse(String(event.data)) as LiveUpdate
      if (update.error) onError(update.error)
      else onUpdate(update)
    } catch {
      onError('Live translation returned an unreadable result.')
    }
    pump()
  }
  socket.onerror = () => {
    inflight = false
    onError('Live translation disconnected.')
  }
  socket.onclose = () => {
    closed = true
    inflight = false
  }

  return {
    sendFrame(frame: Blob) {
      pending = frame
      pump()
    },
    reset() {
      if (socket.readyState === WebSocket.OPEN) socket.send('reset')
    },
    close() {
      closed = true
      pending = null
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    },
  }
}

export function captureVideoFrame(video: HTMLVideoElement, maxWidth = 320): Promise<Blob | null> {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (!sourceWidth || !sourceHeight) return Promise.resolve(null)

  const scale = Math.min(1, maxWidth / sourceWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth * scale))
  canvas.height = Math.max(1, Math.round(sourceHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.55)
  })
}
