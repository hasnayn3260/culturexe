export const PASSWORD_REQUIREMENTS = [
  'At least 8 characters',
  'At least one uppercase letter',
  'At least one lowercase letter',
  'At least one number',
  'At least one symbol',
] as const

export function getPasswordValidationError(password: string): string | null {
  if (password.length < 8) return PASSWORD_REQUIREMENTS[0]
  if (!/[A-Z]/.test(password)) return PASSWORD_REQUIREMENTS[1]
  if (!/[a-z]/.test(password)) return PASSWORD_REQUIREMENTS[2]
  if (!/\d/.test(password)) return PASSWORD_REQUIREMENTS[3]
  if (!/[^A-Za-z0-9\s]/.test(password)) return PASSWORD_REQUIREMENTS[4]

  return null
}

export function validatePassword(password: string): void {
  const error = getPasswordValidationError(password)
  if (error) throw new Error(`Password must contain: ${error.toLowerCase()}.`)
}
