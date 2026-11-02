import { useState, useRef, useEffect, useCallback } from 'react'
import bgImg from './assets/Main_BG.jpg'
import logoImg from './assets/LOGO.png'
import CharacterViewer from './components/CharacterViewer'
import Notification from './components/Notification'
import { matchSign, planSigns, type SignPlan } from './animation/greetingInput'
import { LIVE_FRAME_MS, captureVideoFrame, connectLiveTranslator, getAiHealth, type SignLanguage, type LiveConnection, type LiveUpdate } from './api/signLanguage'
import './App.css'

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: BrowserSpeechResultEvent) => void) | null
  onerror: ((event: BrowserSpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type BrowserSpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

type BrowserSpeechErrorEvent = {
  error: string
}

function speechRecognitionConstructor(): (new () => BrowserSpeechRecognition) | null {
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

function App() {
  const [language, setLanguage] = useState<SignLanguage | null>(null)
  const [inputText, setInputText] = useState('')
  const [activeSign, setActiveSign] = useState<string | null>(null)
  const [sequence, setSequence] = useState<string[] | null>(null)
  const [sequenceToken, setSequenceToken] = useState(0)
  const [characterStatus, setCharacterStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [playbackMessage, setPlaybackMessage] = useState('')
  const [grammarNote, setGrammarNote] = useState('')
  const dismissNotification = useCallback(() => {
    setPlaybackMessage('')
    setGrammarNote('')
  }, [])
  const isAnimating = useRef(false)

  const [isCameraActive, setIsCameraActive] = useState(false)
  const [liveSentence, setLiveSentence] = useState('')
  const [liveGrammar, setLiveGrammar] = useState('')
  const [signRemaining, setSignRemaining] = useState(5)
  const [signNumber, setSignNumber] = useState(1)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const captureTimerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const liveRef = useRef<LiveConnection | null>(null)
  const lastSignRef = useRef('')
  const onLiveRef = useRef<(update: LiveUpdate) => void>(() => {})

  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [heardText, setHeardText] = useState('')
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const heardRef = useRef('')
  const voiceErrorRef = useRef('')
  const voiceSessionRef = useRef(0)
  const onVoiceRef = useRef<(text: string) => void>(() => {})

  const clearCaptureTimers = () => {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current)
      captureTimerRef.current = null
    }
  }

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraActive(false)
  }

  const cancelCamera = () => {
    cancelledRef.current = true
    liveRef.current?.close()
    liveRef.current = null
    clearCaptureTimers()
    stopStream()
    setPlaybackMessage('')
  }

  const resetLive = () => {
    setSignRemaining(5)
    setSignNumber(1)
    liveRef.current?.reset()
    lastSignRef.current = ''
    setLiveSentence('')
    setLiveGrammar('')
    setInputText('')
    setGrammarNote('')
  }

  const completeLive = () => {
    clearCaptureTimers()
    liveRef.current?.complete()
  }

  const startCamera = async () => {
    if (!language) return
    setSignRemaining(5)
    setSignNumber(1)
    cancelledRef.current = false
    lastSignRef.current = ''
    setLiveSentence('')
    setLiveGrammar('')
    setGrammarNote('')
    setPlaybackMessage('ကင်မရာဖွင့်နေသည်…')
    try {
      const health = await getAiHealth(language)
      if (!health.ok) {
        setPlaybackMessage('လက်ဟန်မော်ဒယ် အဆင်သင့်မဖြစ်သေးပါ။ ဒေတာနှင့် AI server ကို စစ်ဆေးပါ။')
        return
      }
    } catch {
      setPlaybackMessage('AI server ကို အရင်ဖွင့်ပါ။ (npm run dev:ai)')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setIsCameraActive(true)
      setPlaybackMessage('ကင်မရာရှေ့တွင် လက်ဟန်ပြပါ။')
    } catch (err) {
      console.error('Error accessing camera:', err)
      stopStream()
      alert('ကင်မရာကို ဖွင့်မရပါ။ Camera permission ကို စစ်ဆေးပါ။')
    }
  }

  useEffect(() => {
    if (!isCameraActive || !language) return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream
    let started = false
    const connection = connectLiveTranslator(
      (update) => onLiveRef.current(update),
      (message) => {
        if (!cancelledRef.current) setPlaybackMessage(message)
      },
      language,
    )
    liveRef.current = connection

    const grabFrame = () => {
      void captureVideoFrame(video).then((blob) => {
        if (blob && !cancelledRef.current) connection.sendFrame(blob)
      })
    }

    const begin = () => {
      if (started || cancelledRef.current) return
      started = true
      grabFrame()
      captureTimerRef.current = window.setInterval(grabFrame, LIVE_FRAME_MS)
    }

    const onReady = () => {
      void video.play().then(begin).catch(begin)
    }
    video.addEventListener('loadedmetadata', onReady)
    if (video.readyState >= 1) onReady()

    return () => {
      video.removeEventListener('loadedmetadata', onReady)
      clearCaptureTimers()
      connection.close()
      if (liveRef.current === connection) liveRef.current = null
    }
  }, [isCameraActive, language])

  const startVoiceRecording = () => {
    const SpeechRecognitionCtor = speechRecognitionConstructor()
    if (!SpeechRecognitionCtor) {
      alert('ဤ browser တွင် အသံမှ စာသားပြောင်းမရပါ။ Chrome ဖြင့် စမ်းကြည့်ပါ။')
      return
    }

    const session = voiceSessionRef.current + 1
    voiceSessionRef.current = session
    heardRef.current = ''
    voiceErrorRef.current = ''
    setHeardText('')

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'my-MM'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      if (session !== voiceSessionRef.current) return
      let finalText = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += piece
        else interim += piece
      }
      heardRef.current = `${finalText} ${interim}`.replace(/\s+/g, ' ').trim()
      setHeardText(heardRef.current)
    }
    recognition.onerror = (event) => {
      if (session !== voiceSessionRef.current) return
      if (event.error === 'aborted' || event.error === 'no-speech') return
      voiceErrorRef.current = event.error === 'not-allowed'
        ? 'အသံသုံးရန် Microphone permission လိုအပ်ပါသည်။'
        : 'အသံမှ စာသားပြောင်းမရပါ။ ပြန်စမ်းကြည့်ပါ။'
    }
    recognition.onend = () => {
      if (session !== voiceSessionRef.current) return
      recognitionRef.current = null
      setIsRecording(false)
      setShowVoiceModal(false)
      const text = heardRef.current
      const error = voiceErrorRef.current
      heardRef.current = ''
      voiceErrorRef.current = ''
      setHeardText('')
      if (error) {
        setPlaybackMessage(error)
        return
      }
      onVoiceRef.current(text)
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting speech recognition:', err)
      recognitionRef.current = null
      alert('အသံဖမ်းခြင်းကို စမရပါ။ Microphone permission ကို စစ်ဆေးပါ။')
    }
  }

  const stopVoiceRecording = () => {
    recognitionRef.current?.stop()
  }

  const closeVoiceModal = () => {
    if (isRecording) {
      stopVoiceRecording()
    } else {
      setShowVoiceModal(false)
    }
  }

  useEffect(() => {
    return () => {
      cancelledRef.current = true
      clearCaptureTimers()
      stopStream()
      voiceSessionRef.current += 1
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const blockUntilReady = () => {
    if (isAnimating.current) return true
    if (characterStatus !== 'ready') {
      setPlaybackMessage(characterStatus === 'loading' ? '3D ဇာတ်ကောင်ကို ပြင်ဆင်နေသည်။ ခဏစောင့်ပါ။' : 'ဤ browser တွင် 3D လက်ဟန်ပြသမှုကို အသုံးမပြုနိုင်ပါ။')
      return true
    }
    return false
  }

  const playSign = (id: string) => {
    if (blockUntilReady()) return
    isAnimating.current = true
    setPlaybackMessage('')
    setSequence(null)
    setActiveSign(id)
  }

  const playSequence = (ids: string[]) => {
    if (blockUntilReady()) return
    isAnimating.current = true
    setActiveSign(null)
    setSequence(ids)
    setSequenceToken((token) => token + 1)
  }
  useEffect(() => {
    onLiveRef.current = (update) => {
    setSignRemaining(Math.ceil(update.sign_remaining))
    setSignNumber(update.sign_number)
    const text = update.myanmar
    setLiveSentence(text)
    setLiveGrammar(text)
    if (text) setInputText(text)
    setGrammarNote('')
    if (update.completed) {
      cancelledRef.current = true
      clearCaptureTimers()
      liveRef.current?.close()
      liveRef.current = null
      stopStream()
      setPlaybackMessage(text ? 'ပြီးပါပြီ' : 'လက်ဟန်မတွေ့ပါ။ ပြန်လည်စမ်းကြည့်ပါ။')
      return
    }
    if (update.latest && update.latest !== lastSignRef.current) {
      lastSignRef.current = update.latest
      const id = matchSign(update.latest) || matchSign(update.myanmar)
      if (id) playSign(id)
    }
    }
  })

  const finishGreeting = useCallback(() => {
    setActiveSign(null)
    setSequence(null)
    setPlaybackMessage('')
    isAnimating.current = false
  }, [])

  const showPlan = (plan: SignPlan) => {
    setGrammarNote(plan.note)
    setPlaybackMessage(plan.playable.length ? '' : plan.note)
    if (plan.playable.length) playSequence(plan.playable)
  }

  useEffect(() => {
    onVoiceRef.current = (text: string) => {
    const spoken = text.trim()
    if (!spoken) {
      setPlaybackMessage('အသံကို စာသားအဖြစ် မဖတ်နိုင်ပါ။ ပြန်ပြောကြည့်ပါ။')
      return
    }
    setInputText(spoken)
    setPlaybackMessage('')
    setGrammarNote('')
    }
  })

  const handleSend = () => {
    showPlan(planSigns(inputText))
  }
  return (
    <div
      className="min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat w-full flex flex-col items-center justify-between relative"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
      <Notification message={playbackMessage || grammarNote} onDismiss={dismissNotification} />
      {!language && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md">
          <section role="dialog" aria-modal="true" aria-labelledby="language-title" className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
            <h1 id="language-title" className="text-3xl font-bold text-gray-900">ဘယ်လက်ဟန်ဘာသာစကားကို အသုံးပြုမလဲ။</h1>
            {(['myanmar', 'international'] as const).map((choice) => (
              <button key={choice} onClick={() => setLanguage(choice)} className="mt-5 w-full rounded-2xl border-2 border-[#ff7a00] p-5 text-left text-gray-900 hover:bg-orange-50">
                <strong>{choice === 'myanmar' ? 'မြန်မာလက်ဟန်ဘာသာစကား' : 'နိုင်ငံတကာလက်ဟန်ဘာသာစကား'}</strong>
              </button>
            ))}
          </section>
        </div>
      )}
      {language && <button onClick={() => { cancelCamera(); resetLive(); setLanguage(null); setActiveSign(null); setSequence(null) }} className="absolute right-6 top-6 z-30 rounded-full bg-white px-5 py-3 font-bold text-orange-700">{language === 'myanmar' ? 'မြန်မာ' : 'နိုင်ငံတကာ'} · ဘာသာစကားပြောင်းရန်</button>}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-3xl aspect-video rounded-3xl overflow-hidden border-4 border-[#ff7a00] shadow-[0_0_40px_rgba(255,122,0,0.3)] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            ></video>

            <div className="absolute top-4 left-4 bg-red-600 text-white font-bold text-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg tracking-wider">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              LIVE
            </div>

            <div className="absolute top-16 left-4 rounded-2xl bg-black/70 px-5 py-3 text-center text-white" role="timer" aria-label="ယခုလက်ဟန်အတွက် ကျန်ချိန်">
              <div className="text-sm">လက်ဟန် {signNumber}</div>
              <div className="text-5xl font-bold tabular-nums">{signRemaining}</div>
            </div>

            <button
              onClick={resetLive}
              className="cursor-pointer absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white font-bold text-sm px-4 py-2 rounded-full border border-white/30"
            >
              ပြန်စရန်
            </button>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-16 pt-10 text-center">
              <p className="text-white text-2xl font-bold drop-shadow">{liveGrammar || liveSentence || 'လက်ဟန်ပြပါ'}</p>

            </div>

            <button
              onClick={completeLive}
              className="cursor-pointer absolute bottom-4 left-4 bg-[#ff7a00] text-white font-bold px-6 py-3 rounded-full shadow-lg"
            >
              ပြီးပါပြီ
            </button>

            <button
              onClick={cancelCamera}
              aria-label="ကင်မရာပိတ်ရန်"
              className="cursor-pointer absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-full transition-all border border-white/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white mt-8 font-medium text-xl shadow-sm tracking-wide bg-black/40 px-6 py-2 rounded-xl backdrop-blur-sm border border-white/10">၅ စက္ကန့်အတွင်း လက်ဟန်တစ်ခု ပြပါ။ အချိန်ပြည့်လျှင် နောက်တစ်ခုအတွက် အချိန်စတွက်ပေးပါမည်။ လက်ဟန်မပြသည့် အလှည့်တွင် စာကြောင်းကို အဆုံးသတ်ပါမည်။ ကိုယ်တိုင်အဆုံးသတ်လိုလျှင် “ပြီးပါပြီ” ကို နှိပ်ပါ။</p>
        </div>
      )}

      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl border-4 border-[#ff7a00] animate-in zoom-in-95 duration-200 relative">

            <button
              onClick={closeVoiceModal}
              className="cursor-pointer absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>

            <h2 className="text-2xl font-bold mb-8 text-gray-800">
              {isRecording ? 'နားထောင်နေသည်…' : 'အသံမှ စာသား'}
            </h2>

            <div className={`relative flex items-center justify-center w-32 h-32 rounded-full mb-8 ${isRecording ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-[#ff7a00]'}`}>
              {isRecording && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-red-500 opacity-20 animate-ping"></div>
                  <div className="absolute inset-[-20px] rounded-full border-2 border-red-500 opacity-10 animate-ping" style={{ animationDelay: '0.2s' }}></div>
                </>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="z-10 relative">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>

            {!isRecording ? (
              <button
                onClick={startVoiceRecording}
                className="cursor-pointer w-full bg-[#ff7a00] hover:bg-[#e66f00] text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-95 text-lg"
              >
                စပြောရန်
              </button>
            ) : (
              <button
                onClick={stopVoiceRecording}
                className="cursor-pointer w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-95 text-lg flex items-center justify-center gap-2"
              >
                <span className="w-3 h-3 bg-white rounded-sm"></span> ရပ်ရန်
              </button>
            )}

            {heardText && <p className="mb-4 text-center text-gray-800" aria-live="polite">{heardText}</p>}
            {isRecording && <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">ယခုပြောနိုင်ပါပြီ။</p>}
          </div>
        </div>
      )}

      <div className="absolute top-6 left-6 md:left-10 z-20 pointer-events-auto select-none">
        <img src={logoImg} alt="Logo" className="h-12 md:h-16 drop-shadow-md object-contain" />
      </div>

      <div className="character-stage">
        <CharacterViewer active={true} sign={activeSign} sequence={sequence} sequenceToken={sequenceToken} onSignComplete={finishGreeting} onStatusChange={setCharacterStatus} />
      </div>

      <div className="flex-1"></div>

      <div className="input-panel w-full h-[25vh] bg-[#f3f2f2]/40 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] border-t border-white/50 flex items-center justify-center px-4 md:px-12 gap-6 pb-4 sm:pb-0 z-10 transition-all pointer-events-auto">

        <div className="message-box relative w-full max-w-3xl h-[75%] md:h-[65%] bg-white/70 backdrop-blur-2xl rounded-2xl border-2 border-[#ff7a00] shadow-sm flex flex-col transition-all">
          <textarea
            aria-label="လက်ဟန်ဖြင့် ပြမည့်စာသား"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-full bg-transparent resize-none p-5 outline-none text-black text-lg placeholder:text-gray-600 rounded-2xl pb-16 font-medium [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            placeholder="စာသားရိုက်ထည့်ပါ။ ဥပမာ — ကျွန်ုပ်နေမကောင်းပါ"
          ></textarea>

          <button
            onClick={handleSend}
            aria-label="လက်ဟန်ဖြင့် ပြရန်"
            disabled={!!activeSign || !!sequence || characterStatus !== 'ready'}
            className="cursor-pointer absolute right-3 bottom-3 bg-[#ff7a00] hover:bg-[#e66f00] transition-all p-3 rounded-full flex items-center justify-center shadow-lg active:scale-95 border border-[#ff7a00] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f3f4f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[-1px] translate-y-[1px]">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>

        <div className="input-actions flex flex-col gap-3 w-56 md:w-64">
          <button
            onClick={() => void startCamera()}
            disabled={isCameraActive}
            className="cursor-pointer w-full bg-white hover:bg-gray-50 border-2 border-[#ff7a00] rounded-full flex items-center p-1.5 pr-4 transition-all shadow-md group active:scale-95 text-[#ff7a00] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="bg-[#ff7a00]/10 rounded-full p-2 mr-3 group-hover:bg-[#ff7a00]/20 transition-colors shadow-inner flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M18 11V6a2 2 0 0 0-4 0v4" />
                <path d="M14 10V4a2 2 0 0 0-4 0v6" />
                <path d="M10 10.5V3a2 2 0 0 0-4 0v9" />
                <path d="m7 12.5-1.72-1.72a2 2 0 0 0-2.82 2.82L6 17c1.45 1.45 2.1 3 3.5 3h6.63a4 4 0 0 0 3.87-3.23l1.1-6a2 2 0 0 0-1.99-2.27 2 2 0 0 0-1.11.3V11" />
              </svg>
            </div>
            <span className="font-bold text-sm md:text-base text-left leading-tight">လက်ဟန်မှ စာသား</span>
          </button>

          <button
            onClick={() => setShowVoiceModal(true)}
            className="cursor-pointer w-full bg-[#ff7a00] hover:bg-[#e66f00] border-2 border-[#ff7a00] rounded-full flex items-center p-1.5 pr-4 transition-all shadow-md group active:scale-95 text-white"
          >
            <div className="bg-white/20 rounded-full p-2 mr-3 group-hover:bg-white/30 transition-colors shadow-inner flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <span className="font-bold text-sm md:text-base text-left leading-tight">အသံမှ စာသား</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
