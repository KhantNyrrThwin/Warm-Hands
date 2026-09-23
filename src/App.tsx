import { useState, useRef, useEffect, useCallback } from 'react'
import bgImg from './assets/Main_BG.jpg'
import logoImg from './assets/LOGO.png'
import CharacterViewer from './components/CharacterViewer'
import { matchSign, planSigns, type SignPlan } from './animation/greetingInput'
import { LIVE_FRAME_MS, captureVideoFrame, connectLiveTranslator, getAiHealth, type LiveConnection, type LiveUpdate } from './api/signLanguage'
import './App.css'

function App() {
  const [inputText, setInputText] = useState('')
  const [activeSign, setActiveSign] = useState<string | null>(null)
  const [sequence, setSequence] = useState<string[] | null>(null)
  const [sequenceToken, setSequenceToken] = useState(0)
  const [characterStatus, setCharacterStatus] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [playbackMessage, setPlaybackMessage] = useState('')
  const [grammarNote, setGrammarNote] = useState('')
  const isAnimating = useRef(false)

  const [isCameraActive, setIsCameraActive] = useState(false)
  const [liveSentence, setLiveSentence] = useState('')
  const [liveGrammar, setLiveGrammar] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const captureTimerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const liveRef = useRef<LiveConnection | null>(null)
  const lastSignRef = useRef('')
  const onLiveRef = useRef<(update: LiveUpdate) => void>(() => {})

  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const audioStreamRef = useRef<MediaStream | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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

  const applySignResult = (text: string) => {
    setInputText(text)
    const id = matchSign(text)
    if (id) {
      setTimeout(() => playSign(id), 100)
    }
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
    liveRef.current?.reset()
    lastSignRef.current = ''
    setLiveSentence('')
    setLiveGrammar('')
    setInputText('')
    setGrammarNote('')
  }

  const startCamera = async () => {
    cancelledRef.current = false
    lastSignRef.current = ''
    setLiveSentence('')
    setLiveGrammar('')
    setGrammarNote('')
    setPlaybackMessage('Opening camera…')
    try {
      const health = await getAiHealth()
      if (!health.ok) {
        setPlaybackMessage(health.error || 'AI model is not ready.')
        return
      }
    } catch {
      setPlaybackMessage('Start the Python AI server first (npm run dev:ai).')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setIsCameraActive(true)
      setPlaybackMessage('Sign in view. Words appear as you sign.')
    } catch (err) {
      console.error('Error accessing camera:', err)
      stopStream()
      alert('Unable to access camera. Please ensure permissions are granted.')
    }
  }

  useEffect(() => {
    if (!isCameraActive) return
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
  }, [isCameraActive])

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      setIsRecording(true)

      const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextConstructor) throw new Error('Audio recording is unavailable in this browser')
      const audioContext = new AudioContextConstructor()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      analyser.fftSize = 512
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      let lastSoundTime = Date.now()

      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray)

        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const average = sum / bufferLength

        const SILENCE_THRESHOLD = 5
        if (average > SILENCE_THRESHOLD) {
          lastSoundTime = Date.now()
        } else if (Date.now() - lastSoundTime > 3000) {
          stopVoiceRecording()
          return
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel)
      }

      checkAudioLevel()
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('Unable to access microphone. Please ensure permissions are granted.')
    }
  }

  const stopVoiceRecording = () => {
    if (!audioStreamRef.current) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error)
      audioContextRef.current = null
    }

    audioStreamRef.current.getTracks().forEach((track) => track.stop())
    audioStreamRef.current = null

    setIsRecording(false)
    setShowVoiceModal(false)

    applySignResult('မင်္ဂလာပါ')
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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const blockUntilReady = () => {
    if (isAnimating.current) return true
    if (characterStatus !== 'ready') {
      setPlaybackMessage(characterStatus === 'loading' ? 'Please wait for the character to load.' : 'The 3D greeting is unavailable in this browser.')
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
  onLiveRef.current = (update) => {
    setLiveSentence(update.sentence)
    setLiveGrammar(update.grammar)
    const text = update.grammar || update.sentence
    if (text) setInputText(text)
    if (update.myanmar) setGrammarNote(update.myanmar)
    if (update.latest && update.latest !== lastSignRef.current) {
      lastSignRef.current = update.latest
      const id = matchSign(update.latest) || matchSign(update.myanmar)
      if (id) playSign(id)
    }
  }

  const finishGreeting = useCallback(() => {
    setActiveSign(null)
    setSequence(null)
    setPlaybackMessage('')
    isAnimating.current = false
  }, [])

  const showPlan = (plan: SignPlan) => {
    if (!plan.unknown.length && plan.canonical) setInputText(plan.canonical)
    setGrammarNote(plan.note)
    setPlaybackMessage(plan.playable.length ? '' : plan.note)
    if (plan.playable.length) playSequence(plan.playable)
  }

  const handleSend = () => {
    showPlan(planSigns(inputText))
  }
  return (
    <div
      className="min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat w-full flex flex-col items-center justify-between relative"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
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

            <button
              onClick={resetLive}
              className="cursor-pointer absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white font-bold text-sm px-4 py-2 rounded-full border border-white/30"
            >
              Reset
            </button>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-16 pt-10 text-center">
              <p className="text-white text-2xl font-bold drop-shadow">{liveGrammar || liveSentence || 'Sign in view'}</p>
              {liveSentence && liveGrammar && liveGrammar !== liveSentence && (
                <p className="text-white/80 text-sm mt-1">{liveSentence}</p>
              )}
            </div>

            <button
              onClick={cancelCamera}
              aria-label="Close camera"
              className="cursor-pointer absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-full transition-all border border-white/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <p className="text-white mt-8 font-medium text-xl shadow-sm tracking-wide bg-black/40 px-6 py-2 rounded-xl backdrop-blur-sm border border-white/10">Live translation. Keep signing. Reset clears the sentence. Grammar is corrected as words appear.</p>
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
              {isRecording ? 'Listening...' : 'Voice Input'}
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
                Start Record
              </button>
            ) : (
              <button
                onClick={stopVoiceRecording}
                className="cursor-pointer w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-95 text-lg flex items-center justify-center gap-2"
              >
                <span className="w-3 h-3 bg-white rounded-sm"></span> Stop Record
              </button>
            )}

            {isRecording && <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">Speak now...</p>}
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
            aria-label="Text to translate"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-full bg-transparent resize-none p-5 outline-none text-black text-lg placeholder:text-gray-600 rounded-2xl pb-16 font-medium [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            placeholder="Type a sentence, for example ကျေးဇူးပြု၍ ကူညီပါ"
          ></textarea>
          <p className="absolute bottom-4 left-5 right-20 text-xs text-amber-900" role="status">{playbackMessage || grammarNote}</p>

          <button
            onClick={handleSend}
            aria-label="Play greeting"
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
            <span className="font-bold text-sm md:text-base text-left leading-tight">Input Sign Language</span>
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
            <span className="font-bold text-sm md:text-base text-left leading-tight">Input Voice</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
