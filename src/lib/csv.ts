export type CsvBookRow = {
  title: string
  author: string
  copies: number
  line: number
  error?: string
}

export function parseBooksCsv(text: string): CsvBookRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const header = splitCsvLine(lines[0]!).map((cell) => cell.toLowerCase())
  const hasHeader =
    header.includes('title') && header.includes('author') && header.includes('copies')

  const start = hasHeader ? 1 : 0
  const titleIndex = hasHeader ? header.indexOf('title') : 0
  const authorIndex = hasHeader ? header.indexOf('author') : 1
  const copiesIndex = hasHeader ? header.indexOf('copies') : 2

  return lines.slice(start).map((line, index) => {
    const cells = splitCsvLine(line)
    const title = (cells[titleIndex] ?? '').trim()
    const author = (cells[authorIndex] ?? '').trim()
    const copiesRaw = (cells[copiesIndex] ?? '').trim()
    const copies = Number(copiesRaw)
    const row: CsvBookRow = {
      title,
      author,
      copies: Number.isFinite(copies) ? copies : 0,
      line: index + start + 1,
    }

    if (!title) row.error = 'Title is required'
    else if (!author) row.error = 'Author is required'
    else if (!Number.isInteger(copies) || copies < 1) row.error = 'Copies must be a whole number of 1 or more'

    return row
  })
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells.map((cell) => cell.trim())
}
