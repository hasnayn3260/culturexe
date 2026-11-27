type CultureXeMarkProps = {
  size?: number
  id?: string
}

export default function CultureXeMark({ size = 38, id = 'culturexe-mark' }: CultureXeMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-a`} cx="30%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#C9E8A0" />
          <stop offset="40%" stopColor="#5BBFB0" />
          <stop offset="100%" stopColor="#1A6BAA" />
        </radialGradient>
        <radialGradient id={`${id}-b`} cx="70%" cy="65%" r="65%">
          <stop offset="0%" stopColor="#E8D890" />
          <stop offset="40%" stopColor="#5AB0D0" />
          <stop offset="100%" stopColor="#1BBFB0" />
        </radialGradient>
      </defs>
      <path d="M50 50 C50 50 20 35 18 20 C16 5 30 2 40 10 C50 18 50 50 50 50Z" fill={`url(#${id}-a)`} opacity="0.92" />
      <path d="M50 50 C50 50 15 55 12 70 C9 85 22 92 35 85 C48 78 50 50 50 50Z" fill={`url(#${id}-a)`} opacity="0.75" />
      <path d="M50 50 C50 50 80 35 82 20 C84 5 70 2 60 10 C50 18 50 50 50 50Z" fill={`url(#${id}-b)`} opacity="0.88" />
      <path d="M50 50 C50 50 85 55 88 70 C91 85 78 92 65 85 C52 78 50 50 50 50Z" fill={`url(#${id}-b)`} opacity="0.72" />
      <circle cx="50" cy="50" r="7" fill="white" opacity="0.36" />
    </svg>
  )
}

