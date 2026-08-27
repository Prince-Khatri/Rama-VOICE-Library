import { Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLibrary } from '@/hooks/use-library'
import { importBooks } from '@/lib/api'
import { generateCopyCodes } from '@/lib/copy-codes'
import { parseBooksCsv, type CsvBookRow } from '@/lib/csv'
import { formatError } from '@/lib/utils'

type PreviewRow = CsvBookRow & {
  duplicate: boolean
  selected: boolean
  previewCodes: string[]
}

export function ImportPage() {
  const { books, reload } = useLibrary()
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

  const selected = rows.filter((row) => row.selected && !row.error)

  const existingKeys = useMemo(
    () => new Set(books.map((book) => `${book.title.trim().toLowerCase()}::${book.author.trim().toLowerCase()}`)),
    [books],
  )

  function loadFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseBooksCsv(String(reader.result ?? ''))
      setFileName(file.name)
      const reserved = books.flatMap((book) => book.copies.map((copy) => copy.copy_code))
      setRows(
        parsed.map((row) => {
          const duplicate = existingKeys.has(`${row.title.trim().toLowerCase()}::${row.author.trim().toLowerCase()}`)
          const previewCodes = row.error ? [] : generateCopyCodes(row.title, row.copies, reserved)
          reserved.push(...previewCodes)
          return {
            ...row,
            duplicate,
            selected: !row.error && !duplicate,
            previewCodes,
          }
        }),
      )
    }
    reader.readAsText(file)
  }

  async function confirmImport() {
    setImporting(true)
    try {
      const result = await importBooks(
        selected
          .filter((row) => !row.duplicate)
          .map((row) => ({ title: row.title, author: row.author, copies: row.copies })),
      )
      toast.success(`Imported ${result.imported} ${result.imported === 1 ? 'book' : 'books'}`)
      setRows([])
      setFileName('')
      await reload()
    } catch (err) {
      toast.error(formatError(err))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Import"
        description="Bring titles in from a spreadsheet. Preview first so nothing is duplicated by accident."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-12 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files?.[0]
              if (file) loadFile(file)
            }}
          >
            <Upload className="mb-3 size-6 text-primary" />
            <p className="font-medium">Drop a CSV or click to choose a file</p>
            <p className="mt-1 text-sm text-muted-foreground">Columns: title, author, copies</p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) loadFile(file)
              }}
            />
          </label>
          <p className="mt-4 text-xs text-muted-foreground">
            Example: <code>Bhagavad Gita,A.C. Bhaktivedanta Swami Prabhupada,3</code>
          </p>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No file selected"
          description="Import creates one book and the matching number of individually coded copies."
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-xl">Preview {fileName}</h2>
                <p className="text-sm text-muted-foreground">
                  {selected.filter((row) => !row.duplicate).length} ready to import
                  {rows.some((row) => row.duplicate) ? ' · duplicates are left unchecked' : ''}
                </p>
              </div>
              <Button onClick={() => void confirmImport()} disabled={importing || selected.filter((row) => !row.duplicate).length === 0}>
                {importing ? 'Importing…' : 'Import selected'}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Import</th>
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Author</th>
                    <th className="pb-3 font-medium">Copies</th>
                    <th className="pb-3 font-medium">Copy codes</th>
                    <th className="pb-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.line}-${index}`} className="border-t border-border align-top">
                      <td className="py-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={Boolean(row.error) || row.duplicate}
                          onChange={(event) => {
                            const checked = event.target.checked
                            setRows((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, selected: checked } : item,
                              ),
                            )
                          }}
                        />
                      </td>
                      <td className="py-3 font-medium">{row.title || '—'}</td>
                      <td className="py-3">{row.author || '—'}</td>
                      <td className="py-3">{row.copies || '—'}</td>
                      <td className="py-3 text-muted-foreground">{row.previewCodes.join(', ') || '—'}</td>
                      <td className="py-3">
                        {row.error ? (
                          <span className="text-destructive">{row.error}</span>
                        ) : row.duplicate ? (
                          <span className="text-amber-700">Already in your library</span>
                        ) : (
                          <span className="text-muted-foreground">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
