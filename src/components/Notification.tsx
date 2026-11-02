import { useEffect } from 'react'

type Props = {
  message: string
  onDismiss: () => void
}

export default function Notification({ message, onDismiss }: Props) {
  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(onDismiss, 6000)
    return () => window.clearTimeout(timeout)
  }, [message, onDismiss])

  return (
    <div className="fixed inset-x-4 top-24 z-[80] flex justify-center pointer-events-none" role="status" aria-live="polite" aria-atomic="true">
      {message && (
        <div className="pointer-events-auto flex max-w-lg items-start gap-4 rounded-2xl border border-orange-200 bg-white/95 px-5 py-4 text-gray-800 shadow-xl backdrop-blur-md">
          <p className="text-sm leading-relaxed">{message}</p>
          <button type="button" onClick={onDismiss} aria-label="အသိပေးချက်ပိတ်ရန်" className="shrink-0 cursor-pointer rounded-full px-2 text-xl leading-none text-gray-500 hover:bg-gray-100 hover:text-gray-900">×</button>
        </div>
      )}
    </div>
  )
}
