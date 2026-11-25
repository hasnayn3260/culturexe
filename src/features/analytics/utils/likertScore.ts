export type LikertMetrics = {
  average: number
  percentage: number
  responseCount: number
}

const DEFAULT_MINIMUM = 1
const DEFAULT_MAXIMUM = 5

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function normaliseLikertAverage(
  average: number,
  minimum = DEFAULT_MINIMUM,
  maximum = DEFAULT_MAXIMUM,
): number | null {
  if (
    !Number.isFinite(average) ||
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    maximum <= minimum
  ) {
    return null
  }

  const boundedAverage = clamp(average, minimum, maximum)
  return ((boundedAverage - minimum) / (maximum - minimum)) * 100
}

export function calculateLikertMetrics(
  values: unknown[],
  minimum = DEFAULT_MINIMUM,
  maximum = DEFAULT_MAXIMUM,
): LikertMetrics | null {
  const responses = values
    .map(Number)
    .filter((value) => (
      Number.isFinite(value) && value >= minimum && value <= maximum
    ))

  if (responses.length === 0) return null

  const average = responses.reduce((sum, value) => sum + value, 0) /
    responses.length
  const percentage = normaliseLikertAverage(average, minimum, maximum)

  if (percentage === null) return null

  return {
    average,
    percentage,
    responseCount: responses.length,
  }
}

export function roundedLikertPercentage(values: unknown[]): number | null {
  const metrics = calculateLikertMetrics(values)
  return metrics ? Math.round(metrics.percentage) : null
}
