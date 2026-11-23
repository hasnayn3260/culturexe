type UsernameSource = {
  fullName: string
  email: string
  department?: string
  branch?: string
  locationSite?: string
  organisationName?: string
}

const MAX_USERNAME_LENGTH = 50

function usernamePart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

function candidate(parts: string[]): string {
  return parts.filter(Boolean).join('.').slice(0, MAX_USERNAME_LENGTH)
}

export function usernameCandidates(source: UsernameSource): string[] {
  const names = source.fullName
    .split(/\s+/)
    .map(usernamePart)
    .filter(Boolean)
  const firstName = names[0] || 'user'
  const surname = names.at(-1) || firstName
  const middleNames = names.slice(1, -1)
  const simpleName = candidate([firstName, surname])
  const middleInitials = middleNames.map((name) => name[0]).filter(Boolean)
  const initialledName = candidate([firstName, ...middleInitials, surname])
  const completeName = candidate([firstName, ...middleNames, surname])
  const qualifiers = [
    source.department,
    source.branch,
    source.locationSite,
    source.organisationName,
  ].map((value) => usernamePart(value || '')).filter(Boolean)
  const emailName = candidate(
    source.email.split('@')[0].split(/[._+-]+/).map(usernamePart),
  )

  return [...new Set([
    simpleName,
    initialledName,
    completeName,
    ...qualifiers.flatMap((qualifier) => [
      candidate([simpleName, qualifier]),
      candidate([completeName, qualifier]),
    ]),
    emailName,
  ].filter((value) => value.length >= 3))]
}

export function availableUsername(
  source: UsernameSource,
  isAvailable: (username: string) => boolean,
): string | null {
  return usernameCandidates(source).find(isAvailable) || null
}
