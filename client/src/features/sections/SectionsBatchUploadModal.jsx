import { sectionService } from '../../services/sectionService'
import { Badge, Button, DetailList } from '../../components/ui'
import BatchImportModal from '../batch/BatchImportModal'

/**
 * Sheet headers are matched loosely on purpose. A file typed by hand in Excel
 * arrives as "Mayor", "MAYOR_NAME" or "Year Level" depending on who made it, and
 * rejecting the whole import over capitalisation is not a useful trade.
 */
const COLUMN_ALIASES = {
  mayor_name: ['mayor', 'mayor name', 'mayor_name', 'mayor names', 'section mayor'],
  program: ['program', 'programme', 'course'],
  year_level: ['year', 'year level', 'year_level', 'yr', 'yearlevel'],
  section_name: ['section', 'section name', 'section_name', 'block'],
  shift: ['shift', 'shift type', 'shift_type'],
}

const REQUIRED_COLUMNS = ['program', 'year_level', 'section_name']

/** Headers plus one example row, so the expected shape is visible. */
const TEMPLATE_SHEET = [
  ['mayor', 'program', 'year', 'section', 'shift'],
  ['Juan Dela Cruz', 'BSIT', 3, 'A', 'day'],
]

/**
 * Normalises one parsed row and names the problem that would stop it importing.
 * Runs over the whole preview so a bad row is visible before anything is sent,
 * rather than coming back as a failure after the fact.
 */
function reviewRow(row) {
  const missing = REQUIRED_COLUMNS.filter((column) => !row[column])
  if (missing.length) return { ...row, issue: `Missing ${missing.join(', ')}` }

  const shift = (row.shift || 'day').toLowerCase()
  if (shift !== 'day' && shift !== 'night') {
    return { ...row, issue: `Unknown shift "${row.shift}"` }
  }

  return { ...row, shift, issue: null }
}

/**
 * Lists the login the import generated for each section. One account per section,
 * named by its mayor where the file supplied one, so the credentials can be
 * handed out without cross-referencing the spreadsheet.
 */
function CreatedAccounts({ results }) {
  const accounts = results.map((entry) => ({
    ...entry.credentials,
    section: `${entry.section.program} ${entry.section.year_level}${entry.section.section_name}`,
    mayor: entry.mayor_name,
  }))

  function handleCopy() {
    const text = accounts
      .map((account) =>
        [
          `${account.section}${account.mayor ? ` — ${account.mayor}` : ''}`,
          `Email: ${account.email}`,
          `Password: ${account.password}`,
        ].join('\n')
      )
      .join('\n\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <>
      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {accounts.map((account) => (
          <div key={account.email} className="rounded-md border border-line bg-surface-sunken p-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              {account.section}
              {account.mayor ? ` · ${account.mayor}` : ''}
            </p>
            <DetailList
              columns={1}
              items={[
                { label: 'Email', value: account.email, className: 'font-mono text-sm' },
                { label: 'Password', value: account.password, className: 'font-mono text-sm' },
              ]}
            />
          </div>
        ))}
      </div>

      <Button
        variant="accent-outline"
        icon="bi bi-clipboard"
        block
        className="mt-4"
        onClick={handleCopy}
      >
        Copy all credentials
      </Button>
    </>
  )
}

/** Batch section import. Each row becomes a section and a student login. */
export default function SectionsBatchUploadModal({ open, onClose, onImported }) {
  return (
    <BatchImportModal
      open={open}
      onClose={onClose}
      title="Batch upload sections"
      entityLabel="section"
      pluralLabel="sections"
      intro={
        <>
          The first sheet needs a header row with <strong>mayor</strong>,{' '}
          <strong>program</strong>, <strong>year</strong>, <strong>section</strong> and{' '}
          <strong>shift</strong>. Each row creates one section and generates its student login
          automatically.
        </>
      }
      aliases={COLUMN_ALIASES}
      requiredColumns={REQUIRED_COLUMNS}
      expectedHeaders={['mayor', 'program', 'year', 'section', 'shift']}
      templateRows={TEMPLATE_SHEET}
      templateFileName="ctu-sections-template.xlsx"
      columns={[
        { field: 'mayor_name', label: 'Mayor', className: 'font-medium' },
        { field: 'program', label: 'Program' },
        { field: 'year_level', label: 'Year', className: 'tabular' },
        { field: 'section_name', label: 'Section' },
        {
          field: 'shift',
          label: 'Shift',
          render: (row) =>
            row.issue ? (
              <Badge tone="bad">{row.issue}</Badge>
            ) : (
              <Badge tone={row.shift === 'night' ? 'warn' : 'info'}>
                {row.shift === 'night' ? 'Night' : 'Day'}
              </Badge>
            ),
        },
      ]}
      reviewRow={reviewRow}
      // A section is identified by all four of these together.
      uniqueBy="program|year_level|section_name|shift"
      buildPayload={(row) => ({
        mayor_name: row.mayor_name,
        program: row.program,
        year_level: row.year_level,
        section_name: row.section_name,
        shift: row.shift,
      })}
      submit={async (rows) => {
        const response = await sectionService.batchCreate(rows)
        if (response.success) onImported?.()
        return response
      }}
      errorMessage="Failed to import sections"
      renderResult={(results) =>
        results.created.length > 0 ? <CreatedAccounts results={results.created} /> : null
      }
    />
  )
}
