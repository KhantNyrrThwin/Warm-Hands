type IconProps = { className?: string }

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const MicIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
)

export const SendIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className} strokeWidth={2.5}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
)

export const HandIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M18 11V6a2 2 0 0 0-4 0v4" />
    <path d="M14 10V4a2 2 0 0 0-4 0v6" />
    <path d="M10 10.5V3a2 2 0 0 0-4 0v9" />
    <path d="m7 12.5-1.72-1.72a2 2 0 0 0-2.82 2.82L6 17c1.45 1.45 2.1 3 3.5 3h6.63a4 4 0 0 0 3.87-3.23l1.1-6a2 2 0 0 0-1.99-2.27 2 2 0 0 0-1.11.3V11" />
  </svg>
)

export const CameraIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </svg>
)

export const PlayIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base} className={className} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
  </svg>
)

export const CloseIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className} strokeWidth={2.5}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

export const DoctorIcon = ({ className = 'h-10 w-10' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M11 2v2" /><path d="M5 2v2" />
    <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
    <path d="M8 15a6 6 0 0 0 12 0v-3" />
    <circle cx="20" cy="10" r="2" />
  </svg>
)

export const PatientIcon = ({ className = 'h-10 w-10' }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
  </svg>
)

export const WifiIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 20h.01" /><path d="M2 8.82a15 15 0 0 1 20 0" />
    <path d="M5 12.86a10 10 0 0 1 14 0" /><path d="M8.5 16.43a5 5 0 0 1 7 0" />
  </svg>
)
