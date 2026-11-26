import { Input } from '@/components/ui/input'

type SharedProps = {
  id: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

type Time24HourInputProps = SharedProps & {
  value: string
  onValueChange: (value: string) => void
  ariaLabel?: string
}

type DateTime24HourInputProps = SharedProps & {
  value: string
  onValueChange: (value: string) => void
  min?: string
  max?: string
  dateAriaLabel?: string
  timeAriaLabel?: string
}

export function isTwentyFourHourTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function datePart(value: string): string {
  return value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || ''
}

function timePart(value: string): string {
  return value.split('T')[1]?.slice(0, 5) || ''
}

function normalizeTypedTime(value: string): string {
  const compact = value.trim().replace(/\s+/g, '')
  return /^\d{4}$/.test(compact)
    ? `${compact.slice(0, 2)}:${compact.slice(2)}`
    : compact
}

export function Time24HourInput({
  id,
  value,
  onValueChange,
  disabled = false,
  invalid = false,
  className = '',
  ariaLabel = 'Time in 24-hour format',
}: Time24HourInputProps) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder="HH:mm"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={(event) => onValueChange(normalizeTypedTime(event.target.value))}
      disabled={disabled}
      aria-invalid={invalid}
      aria-label={ariaLabel}
      className={`${className} font-mono tabular-nums`}
    />
  )
}

export function DateTime24HourInput({
  id,
  value,
  onValueChange,
  min,
  max,
  disabled = false,
  invalid = false,
  className = '',
  dateAriaLabel = 'Date',
  timeAriaLabel = 'Time in 24-hour format',
}: DateTime24HourInputProps) {
  const date = datePart(value)
  const time = timePart(value)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
      <Input
        id={id}
        type="date"
        value={date}
        min={datePart(min || '') || undefined}
        max={datePart(max || '') || undefined}
        onChange={(event) => {
          const nextDate = event.target.value
          onValueChange(nextDate ? `${nextDate}T${time || '09:00'}` : '')
        }}
        disabled={disabled}
        aria-invalid={invalid}
        aria-label={dateAriaLabel}
        className={className}
      />
      <Time24HourInput
        id={`${id}-time`}
        value={time}
        onValueChange={(nextTime) => {
          if (date) onValueChange(`${date}T${nextTime}`)
        }}
        disabled={disabled || !date}
        invalid={invalid}
        ariaLabel={timeAriaLabel}
        className={className}
      />
    </div>
  )
}
