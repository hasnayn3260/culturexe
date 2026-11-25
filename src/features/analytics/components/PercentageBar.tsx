type PercentageBarProps = {
  value?: number | null
  height?: number
  fill?: string
  fillClassName?: string
  label?: string
  className?: string
}

function boundedPercentage(value?: number | null): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 100)
}

export default function PercentageBar({
  value,
  height = 8,
  fill = 'linear-gradient(90deg,#1BBFB0,#00D4C0)',
  fillClassName = '',
  label = 'Progress',
  className = '',
}: PercentageBarProps) {
  const percentage = boundedPercentage(value)

  return (
    <div
      className={`dim-bar-bg ${className}`.trim()}
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percentage)}
    >
      <div
        className={`dim-bar ${fillClassName}`.trim()}
        style={{
          height: '100%',
          width: `${percentage}%`,
          borderRadius: 99,
          background: fillClassName ? undefined : fill,
          transition: 'width 0.35s ease',
        }}
      />
    </div>
  )
}
