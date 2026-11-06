import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LIVE_FRAME_MS,
  captureVideoFrame,
  connectLiveTranslator,
  getAiHealth,
  type LiveConnection,
  type LiveUpdate,
  type SignLanguage,
} from '../api/signLanguage'

export type CameraStatus = 'off' | 'starting' | 'on' | 'blocked'
export type RecognizerStatus = 'unknown' | 'ready' | 'offline'

/**
 * Patient camera → MSL recognition. Streams frames to the AI server's live
 * translator and exposes the recognised Myanmar sentence.
 */
export function useSignCapture(language: SignLanguage, onError: (message: string) => void) {
  const [camera, setCamera] = useState<CameraStatus>('off')
  const [recognizer, setRecognizer] = useState<RecognizerStatus>('unknown')
  const [sentence, setSentence] = useState('')
  const [latest, setLatest] = useState('')
  const [hands, setHands] = useState(false)
  const [signNumber, setSignNumber] = useState(1)
  const [remaining, setRemaining] = useState(3)
  const [completed, setCompleted] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const liveRef = useRef<LiveConnection | null>(null)
  const timerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const errorRef = useRef(onError)
  useEffect(() => { errorRef.current = onError })

  const checkRecognizer = useCallback(async () => {
    try {
      const health = await getAiHealth(language)
      setRecognizer(health.ok ? 'ready' : 'offline')
      return health.ok
    } catch {
      setRecognizer('offline')
      return false
    }
  }, [language])

  useEffect(() => {
    let live = true
    getAiHealth(language)
      .then((health) => { if (live) setRecognizer(health.ok ? 'ready' : 'offline') })
      .catch(() => { if (live) setRecognizer('offline') })
    return () => { live = false }
  }, [language])

  const stopTimers = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  const stopStream = useCallback(() => {
    stopTimers()
    liveRef.current?.close()
    liveRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamera((current) => (current === 'blocked' ? 'blocked' : 'off'))
  }, [])

  const clear = useCallback(() => {
    setSentence('')
    setLatest('')
    setSignNumber(1)
    setRemaining(3)
    setCompleted(false)
  }, [])

  /** Resolves to false when the camera or recogniser could not start. */
  const start = useCallback(async (): Promise<boolean> => {
    clear()
    cancelledRef.current = false
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamera('blocked')
      errorRef.current('ကင်မရာသုံးရန် HTTPS လိပ်စာဖြင့် ဖွင့်ရပါမည်။ (npm run dev:clinic)')
      return false
    }
    setCamera('starting')
    if (!(await checkRecognizer())) {
      setCamera('off')
      errorRef.current('လက်ဟန်မှတ်သားသည့် AI server မဖွင့်ရသေးပါ။ (npm run dev:ai)')
      return false
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      if (cancelledRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setCamera('off')
        return false
      }
      setCamera('on')
      return true
    } catch {
      setCamera('blocked')
      errorRef.current('ကင်မရာကို ဖွင့်မရပါ။ Camera ခွင့်ပြုချက်ကို စစ်ဆေးပါ။')
      return false
    }
  }, [checkRecognizer, clear])

  // Once the <video> is mounted with the stream, start streaming frames.
  useEffect(() => {
    if (camera !== 'on') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    let started = false

    const onUpdate = (update: LiveUpdate) => {
      setRemaining(Math.max(0, Math.ceil(update.sign_remaining)))
      setSignNumber(update.sign_number)
      setHands(update.hands)
      if (update.myanmar) setSentence(update.myanmar)
      if (update.latest) setLatest(update.latest)
      if (update.completed) {
        cancelledRef.current = true
        setCompleted(true)
        stopStream()
      }
    }
    const connection = connectLiveTranslator(onUpdate, (message) => {
      if (!cancelledRef.current) errorRef.current(message)
    }, language)
    liveRef.current = connection

    const grab = () => {
      void captureVideoFrame(video).then((blob) => {
        if (blob && !cancelledRef.current) connection.sendFrame(blob)
      })
    }
    const begin = () => {
      if (started || cancelledRef.current) return
      started = true
      grab()
      timerRef.current = window.setInterval(grab, LIVE_FRAME_MS)
    }
    const onReady = () => { void video.play().then(begin).catch(begin) }
    video.addEventListener('loadedmetadata', onReady)
    if (video.readyState >= 1) onReady()
    return () => {
      video.removeEventListener('loadedmetadata', onReady)
      stopTimers()
      connection.close()
      if (liveRef.current === connection) liveRef.current = null
    }
  }, [camera, language, stopStream])

  const restart = useCallback(() => {
    liveRef.current?.reset()
    clear()
  }, [clear])

  /** Ask the server to finish the sentence now (it replies with `completed`). */
  const finish = useCallback(() => {
    stopTimers()
    if (liveRef.current) liveRef.current.complete()
    else setCompleted(true)
  }, [])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    stopStream()
    clear()
  }, [clear, stopStream])

  useEffect(() => () => {
    cancelledRef.current = true
    stopTimers()
    liveRef.current?.close()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  return { videoRef, camera, recognizer, sentence, latest, hands, signNumber, remaining, completed, start, restart, finish, cancel, clear }
}
