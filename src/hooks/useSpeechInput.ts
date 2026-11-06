import { useCallback, useEffect, useRef, useState } from 'react'

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean

  onresult: ((event: {
    resultIndex: number
    results: ArrayLike<
      ArrayLike<{ transcript: string }> & { isFinal: boolean }
    >
  }) => void) | null

  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null

  start: () => void
  stop: () => void
  abort: () => void
}

function speechRecognitionConstructor():
  | (new () => BrowserSpeechRecognition)
  | null {
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }

  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

export type MicStatus =
  | 'ready'
  | 'listening'
  | 'blocked'
  | 'unsupported'

export function useSpeechInput(
  onFinal: (text: string) => void,
  onError: (message: string) => void,
) {
  const supported =
    typeof window !== 'undefined' &&
    !!speechRecognitionConstructor() &&
    window.isSecureContext

  const [status, setStatus] =
    useState<MicStatus>(
      supported ? 'ready' : 'unsupported',
    )

  const [interim, setInterim] = useState('')

  const recognitionRef =
    useRef<BrowserSpeechRecognition | null>(null)

  const errorRef = useRef('')
  const sessionRef = useRef(0)
  const shouldContinueRef = useRef(false)

  const finalRef = useRef(onFinal)
  const errorCbRef = useRef(onError)

  useEffect(() => {
    finalRef.current = onFinal
    errorCbRef.current = onError
  })

  const start = useCallback(() => {
    const Ctor = speechRecognitionConstructor()

    if (!Ctor || !window.isSecureContext) {
      setStatus('unsupported')
      errorCbRef.current(
        'ဤ browser တွင် အသံမှ စာသားပြောင်းမရပါ။ Chrome (HTTPS) ဖြင့် ဖွင့်ပါ။',
      )
      return
    }

    if (recognitionRef.current) {
      return
    }

    shouldContinueRef.current = true

    const session = sessionRef.current + 1
    sessionRef.current = session
    errorRef.current = ''

    const recognition = new Ctor()
    recognition.lang = 'my-MM'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      if (session !== sessionRef.current) return

      let interimText = ''
      let newFinalText = ''

      // Loop through results starting from event.resultIndex to avoid re-processing old history
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          newFinalText += transcript + ' '
        } else {
          interimText += transcript
        }
      }

      if (newFinalText.trim()) {
        const cleaned = newFinalText.replace(/\s+/g, ' ').trim()
        finalRef.current(cleaned)
      }

      setInterim(interimText.trim())
    }

    recognition.onerror = (event) => {
      if (session !== sessionRef.current) return
      if (event.error === 'aborted') return

      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        shouldContinueRef.current = false
        setStatus('blocked')
        errorCbRef.current(
          'အသံသုံးရန် Microphone ခွင့်ပြုချက် လိုအပ်ပါသည်။',
        )
        return
      }

      if (event.error !== 'no-speech') {
        errorRef.current =
          'အသံမှ စာသားပြောင်းမရပါ။ ပြန်စမ်းကြည့်ပါ။'
      }
    }

    recognition.onend = () => {
      if (session !== sessionRef.current) return

      recognitionRef.current = null
      setInterim('')

      if (!shouldContinueRef.current) {
        setStatus((current) =>
          current === 'blocked' ? 'blocked' : 'ready',
        )
        if (errorRef.current) {
          errorCbRef.current(errorRef.current)
        }
        return
      }

      setTimeout(() => {
        if (!shouldContinueRef.current) return
        start()
      }, 200)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setStatus('listening')
    } catch {
      recognitionRef.current = null
      errorCbRef.current(
        'အသံဖမ်းခြင်းကို စမရပါ။ Microphone ကို စစ်ဆေးပါ။',
      )
    }
  }, [])

  const stop = useCallback(() => {
    shouldContinueRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setInterim('')
    setStatus('ready')
  }, [])

  useEffect(() => {
    return () => {
      shouldContinueRef.current = false
      sessionRef.current += 1
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  return {
    status,
    interim,
    start,
    stop,
  }
}