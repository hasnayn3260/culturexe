const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz'
const NUMBERS = '23456789'
const SYMBOLS = '!@#$%*-_?'
const ALL_CHARACTERS = `${UPPERCASE}${LOWERCASE}${NUMBERS}${SYMBOLS}`

function randomIndex(maximum: number): number {
  const maximumValidValue = Math.floor(256 / maximum) * maximum
  const bytes = new Uint8Array(1)

  do {
    crypto.getRandomValues(bytes)
  } while (bytes[0] >= maximumValidValue)

  return bytes[0] % maximum
}

function randomCharacter(characters: string): string {
  return characters[randomIndex(characters.length)]
}

export function generateTemporaryPassword(length = 16): string {
  if (length < 12) throw new Error('Temporary passwords must be at least 12 characters.')

  const characters = [
    randomCharacter(UPPERCASE),
    randomCharacter(LOWERCASE),
    randomCharacter(NUMBERS),
    randomCharacter(SYMBOLS),
  ]

  while (characters.length < length) {
    characters.push(randomCharacter(ALL_CHARACTERS))
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    ;[characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ]
  }

  return characters.join('')
}
