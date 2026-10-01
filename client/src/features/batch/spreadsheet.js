/**
 * Spreadsheet plumbing shared by the admin batch imports.
 *
 * Kept separate from the dialogs so the parsing rules live in one place: a
 * sections file and a rooms file differ only in their column names, and the
 * loose header matching below is the part that is easy to get subtly wrong.
 */

/** Collapses a header cell to a comparable key: lowercase, single spaces. */
function headerKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Maps the sheet's header row onto field names. Returns the field each alias
 * resolved to, so an unmapped column can be reported instead of silently
 * dropping data.
 */
function resolveColumns(headers, aliases) {
  const resolved = {}
  const unmapped = []

  headers.forEach((header, index) => {
    const key = headerKey(header)
    if (!key) return

    const field = Object.keys(aliases).find((name) => aliases[name].includes(key))

    if (field) {
      if (!(field in resolved)) resolved[field] = index
    } else {
      unmapped.push(header)
    }
  })

  return { resolved, unmapped }
}

/**
 * Reads the first sheet of a workbook into records keyed by field name.
 *
 * Every cell is coerced to a string: numeric and capitalised cells are both
 * common in a hand-made sheet, and the columns this maps onto are TEXT columns
 * and enum columns that would otherwise be rejected downstream for reasons the
 * admin cannot see in the file.
 */
export function parseSheet(file, { aliases, requiredColumns, expectedHeaders, entityLabel }) {
  // Loaded on demand: the reader is a few hundred kilobytes and only the admin
  // batch dialogs ever need it, so it stays out of the main bundle.
  return Promise.all([import('xlsx'), file.arrayBuffer()]).then(([XLSX, buffer]) => {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error('That file has no sheets.')

    // `defval: ''` keeps short rows from shifting columns, and `raw: false`
    // applies each cell's display format so "1st Year" reads as text.
    const grid = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    })

    if (grid.length < 2) {
      throw new Error(`The sheet needs a header row and at least one ${entityLabel}.`)
    }

    const { resolved, unmapped } = resolveColumns(grid[0], aliases)

    const missing = requiredColumns.filter((column) => !(column in resolved))
    if (missing.length) {
      throw new Error(
        `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Expected headers: ${expectedHeaders.join(', ')}.`
      )
    }

    const rows = grid.slice(1).map((cells, index) => {
      const row = {}
      for (const [field, column] of Object.entries(resolved)) {
        row[field] = String(cells[column] ?? '').trim()
      }
      return { ...row, __row: index + 2 }
    })

    // A trailing newline in the sheet produces a row of empty strings.
    return {
      rows: rows.filter((row) =>
        Object.entries(row).some(([key, value]) => key !== '__row' && value !== '')
      ),
      unmapped,
    }
  })
}

/**
 * Writes an example sheet to a file the browser downloads. Built on demand
 * rather than shipped as a static asset so the headers can never drift from the
 * aliases the importer actually accepts.
 */
export async function downloadTemplate({ rows, fileName, sheetName = 'Sheet1' }) {
  const XLSX = await import('xlsx')

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export function validateUploadFile(file) {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return 'Choose an .xlsx, .xls or .csv file.'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'The file must be smaller than 5 MB.'
  }
  return null
}
