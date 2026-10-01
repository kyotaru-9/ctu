import { useRef, useState } from 'react'
import { biCloudUpload, biDownload, biFileEarmarkExcel } from '../../utils/icons'
import { Alert, Badge, Button, Modal, ScrollX, TBody, TD, TH, THead, TR, Table } from '../../components/ui'
import { downloadTemplate, parseSheet, validateUploadFile } from './spreadsheet'

/**
 * Shared shell for the admin batch imports: choose a spreadsheet, review the
 * parsed rows, then write them. Each caller supplies its column names, how a row
 * is reviewed, what to send, and anything extra to show once the import lands.
 *
 * Nothing is sent until the import is confirmed, so a mis-mapped column costs a
 * preview rather than a set of half-created records.
 */
export default function BatchImportModal({
  open,
  onClose,
  title,
  // Singular noun for the records being imported, used in counts and messages.
  entityLabel,
  pluralLabel,
  intro,
  aliases,
  requiredColumns,
  expectedHeaders,
  templateRows,
  templateFileName,
  columns,
  reviewRow,
  uniqueBy,
  buildPayload,
  submit,
  errorMessage,
  renderResult,
}) {
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [unmapped, setUnmapped] = useState([])
  const [results, setResults] = useState(null)
  const [importing, setImporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  // A key repeated inside one file is caught here rather than left to the
  // server, so the preview shows which row is the duplicate instead of the
  // result reporting that a row was skipped for no visible reason.
  const seen = new Map()

  const review = rows.map((row, index) => {
    const checked = reviewRow(row)
    if (checked.issue || !uniqueBy) return checked

    // `uniqueBy` accepts several fields joined by `|`, since a section is only
    // unique as a combination rather than on any one column.
    const key = uniqueBy
      .split('|')
      .map((field) => String(row[field] ?? '').trim().toLowerCase())
      .join('|')
    if (key.replace(/\|/g, '').trim() === '') return checked

    const first = seen.get(key)
    if (first === undefined) {
      seen.set(key, index)
      return checked
    }

    return { ...checked, issue: `Duplicate of row ${first + 2}` }
  })

  const blocked = review.filter((row) => row.issue)
  const importable = review.filter((row) => !row.issue)

  function reset() {
    setFileName('')
    setRows([])
    setUnmapped([])
    setResults(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function close() {
    reset()
    onClose()
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setResults(null)

    const problem = validateUploadFile(file)
    if (problem) {
      setError(problem)
      return
    }

    try {
      const parsed = await parseSheet(file, {
        aliases,
        requiredColumns,
        expectedHeaders,
        entityLabel,
      })
      setFileName(file.name)
      setRows(parsed.rows)
      setUnmapped(parsed.unmapped)

      if (!parsed.rows.length) {
        setError(`No ${pluralLabel} were found in that sheet.`)
      }
    } catch (err) {
      setFileName('')
      setRows([])
      setError(err.message || 'Could not read that file.')
    }
  }

  async function handleDownloadTemplate() {
    setDownloading(true)
    try {
      await downloadTemplate({ rows: templateRows, fileName: templateFileName })
    } catch {
      setError('Could not build the template file.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleImport() {
    setImporting(true)
    setError('')

    try {
      // The row number is a preview-only field; the server validates again.
      const payload = importable.map(buildPayload)
      const response = await submit(payload)

      if (!response.success) {
        setError(response.message || errorMessage)
        return
      }

      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.message || errorMessage)
    } finally {
      setImporting(false)
    }
  }

  const summary = results
    ? `${results.created.length} created · ${results.skipped.length} already existed · ${results.failed.length} failed`
    : null

  return (
    <Modal
      open={open}
      onClose={close}
      title={results ? 'Import complete' : title}
      size="xl"
      footer={
        results ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={importing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={biCloudUpload}
              onClick={handleImport}
              loading={importing}
              disabled={!importable.length}
            >
              Import {importable.length} {entityLabel}
              {importable.length === 1 ? '' : 's'}
            </Button>
          </>
        )
      }
    >
      {results ? (
        <div className="flex flex-col gap-5">
          <Alert tone={results.failed.length ? 'warn' : 'ok'}>{summary}</Alert>

          {results.failed.length > 0 && (
            <div className="rounded-md border border-bad/30 bg-bad-soft p-3">
              <p className="text-xs font-semibold tracking-wide text-bad uppercase">Not imported</p>
              <ul className="mt-2 flex flex-col gap-1">
                {results.failed.map((entry) => (
                  <li key={entry.row} className="text-sm text-ink">
                    {entry.row}: {entry.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {renderResult?.(results)}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {error && <Alert tone="bad">{error}</Alert>}

          <Alert tone="info">{intro}</Alert>

          <div>
            <Button
              variant="accent-outline"
              icon={biDownload}
              loading={downloading}
              onClick={handleDownloadTemplate}
            >
              Download template
            </Button>
            <p className="mt-1.5 text-xs text-ink-muted">
              A starter sheet with the right headers and one example row.
            </p>
          </div>

          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="sr-only"
              id="batch-upload-input"
            />
            <label
              htmlFor="batch-upload-input"
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-sunken px-6 py-9 text-center transition-colors hover:border-ink-subtle hover:bg-line/40"
            >
              <span
                aria-hidden="true"
                className="grid h-10 w-10 place-items-center rounded-lg bg-surface text-base text-ink-subtle"
              >
                <i className={biFileEarmarkExcel} />
              </span>
              <span className="text-sm font-medium text-ink">
                {fileName || 'Choose a spreadsheet'}
              </span>
              <span className="text-xs text-ink-muted">
                {fileName ? 'Choose a different file' : 'XLSX, XLS or CSV · up to 5 MB'}
              </span>
            </label>
          </div>

          {unmapped.length > 0 && (
            <Alert tone="warn">
              Ignored column{unmapped.length === 1 ? '' : 's'}: {unmapped.join(', ')}.
            </Alert>
          )}

          {rows.length > 0 && (
            <>
              {blocked.length > 0 && (
                <Alert tone="warn">
                  {blocked.length} row{blocked.length === 1 ? '' : 's'} will be skipped for missing
                  or unrecognised values. Fix them in the file and upload it again.
                </Alert>
              )}

              <ScrollX minW="40rem">
                <Table>
                  <THead>
                    <tr>
                      <TH>Row</TH>
                      {columns.map((column) => (
                        <TH key={column.field}>{column.label}</TH>
                      ))}
                    </tr>
                  </THead>
                  <TBody>
                    {review.map((row) => (
                      <TR key={row.__row}>
                        <TD className="tabular">{row.__row}</TD>
                        {columns.map((column, position) => (
                          <TD key={column.field} className={column.className}>
                            {/* A blocked row names its problem once, in the first
                                column, rather than repeating it across the row. */}
                            {row.issue && position === 0 ? (
                              <Badge tone="bad">{row.issue}</Badge>
                            ) : column.render ? (
                              column.render(row)
                            ) : (
                              row[column.field] || '—'
                            )}
                          </TD>
                        ))}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </ScrollX>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
