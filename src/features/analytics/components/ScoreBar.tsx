import PercentageBar from './PercentageBar'

type ScoreBarProps = {
  score?: number | null
  height?: number
  label?: string
}
//test version validator
function scoreGradient(score?: number | null): string {
  if (score !== null && score !== undefined && score >= 70) {
    return 'linear-gradient(90deg,#1BBFB0,#00D4C0)'
  }
  if (score !== null && score !== undefined && score >= 50) {
    return 'linear-gradient(90deg,#C9B882,#E0D09A)'
  }
  return 'linear-gradient(90deg,#E8563A,#F47A65)'
}

export default function ScoreBar({
  score,
  height = 8,
  label = 'Normalised score',
}: ScoreBarProps) {
  return (
    <PercentageBar
      value={score}
      height={height}
      fill={scoreGradient(score)}
      label={label}
    />
  )
}
