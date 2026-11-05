import { useCallback, useEffect, useRef, useState } from 'react'

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function speechRecognitionConstructor(): (new () => BrowserSpeechRecognition) | null {
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

export type MicStatus = 'ready' | 'listening' | 'blocked' | 'unsupported'

/** Myanmar speech → text for the doctor. Calls `onFinal` with the full transcript. */
export function useSpeechInput(onFinal: (text: string) => void, onError: (message: string) => void) {
  const supported = typeof window !== 'undefined' && !!speechRecognitionConstructor() && window.isSecureContext
  const [status, setStatus] = useState<MicStatus>(supported ? 'ready' : 'unsupported')
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const heardRef = useRef('')
  const errorRef = useRef('')
  const sessionRef = useRef(0)
  const finalRef = useRef(onFinal)
  const errorCbRef = useRef(onError)
  useEffect(() => { finalRef.current = onFinal; errorCbRef.current = onError })

  const start = useCallback(() => {
    const Ctor = speechRecognitionConstructor()
    if (!Ctor || !window.isSecureContext) {
      setStatus('unsupported')
      errorCbRef.current('ဤ browser တွင် အသံမှ စာသားပြောင်းမရပါ။ Chrome (HTTPS) ဖြင့် ဖွင့်ပါ။')
      return
    }
    const session = sessionRef.current + 1
    sessionRef.current = session
    heardRef.current = ''
    errorRef.current = ''
    setInterim('')
    const recognition = new Ctor()
    recognition.lang = 'my-MM'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      if (session !== sessionRef.current) return
      let text = ''
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript
      heardRef.current = text.replace(/\s+/g, ' ').trim()
      setInterim(heardRef.current)
    }
    recognition.onerror = (event) => {
      if (session !== sessionRef.current) return
      if (event.error === 'aborted' || event.error === 'no-speech') return
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorRef.current = 'အသံသုံးရန် Microphone ခွင့်ပြုချက် လိုအပ်ပါသည်။'
        setStatus('blocked')
      } else {
        errorRef.current = 'အသံမှ စာသားပြောင်းမရပါ။ ပြန်စမ်းကြည့်ပါ။'
      }
    }
    recognition.onend = () => {
      if (session !== sessionRef.current) return
      recognitionRef.current = null
      const text = heardRef.current
      const error = errorRef.current
      setInterim('')
      setStatus((current) => (current === 'blocked' ? 'blocked' : 'ready'))
      if (error) errorCbRef.current(error)
      else if (text) finalRef.current(text)
      else errorCbRef.current('အသံကို မကြားရပါ။ ပြန်ပြောကြည့်ပါ။')
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setStatus('listening')
    } catch {
      recognitionRef.current = null
      errorCbRef.current('အသံဖမ်းခြင်းကို စမရပါ။ Microphone ကို စစ်ဆေးပါ။')
    }
  }, [])

  const stop = useCallback(() => recognitionRef.current?.stop(), [])

  useEffect(() => () => {
    sessionRef.current += 1
    recognitionRef.current?.abort()
  }, [])

  return { status, interim, start, stop }
}
