const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'as',
  'it',
  'is',
  'and',
  'in',
  'on',
  'to',
  'for',
  'from',
])

export function prefixFromTitle(title: string): string {
  const words = title
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word.toLowerCase()))

  if (words.length === 0) return 'BK'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .slice(0, 3)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}

export function nextCopyCode(prefix: string, existingCodes: string[]): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, 'i')
  let max = 0
  for (const code of existingCodes) {
    const match = code.match(pattern)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

export function generateCopyCodes(title: string, count: number, reserved: string[] = []): string[] {
  const prefix = prefixFromTitle(title)
  const codes: string[] = []
  const used = [...reserved]
  for (let i = 0; i < count; i += 1) {
    const code = nextCopyCode(prefix, used)
    codes.push(code)
    used.push(code)
  }
  return codes
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
