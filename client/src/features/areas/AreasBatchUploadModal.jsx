import { areaService } from '../../services/areaService'
import BatchImportModal from '../batch/BatchImportModal'

/**
 * Sheet headers are matched loosely on purpose. A file typed by hand in Excel
 * arrives as "Name", "AREA" or "Area Name" depending on who made it, and
 * rejecting the whole import over capitalisation is not a useful trade.
 */
const COLUMN_ALIASES = {
  name: ['name', 'area', 'area name', 'area_name', 'location'],
  floor: ['floor', 'floor level', 'floor_level', 'level'],
  description: ['description', 'notes', 'remarks'],
}

const REQUIRED_COLUMNS = ['name']

/** Headers plus one example row, so the expected shape is visible. */
const TEMPLATE_SHEET = [
  ['name', 'floor', 'description'],
  ['Comfort Room', 'First Floor', 'Near the lobby'],
]

/**
 * Normalises one parsed row and names the problem that would stop it importing.
 * Runs over the whole preview so a bad row is visible before anything is sent,
 * rather than coming back as a failure after the fact.
 */
function reviewRow(row) {
  const missing = REQUIRED_COLUMNS.filter((column) => !row[column])
  if (missing.length) return { ...row, issue: `Missing ${missing.join(', ')}` }

  return { ...row, issue: null }
}

/** Batch area import. Each row becomes one cleaning area. */
export default function AreasBatchUploadModal({ open, onClose, onImported }) {
  return (
    <BatchImportModal
      open={open}
      onClose={onClose}
      title="Batch upload areas"
      entityLabel="area"
      pluralLabel="areas"
      intro={
        <>
          The first sheet needs a header row with <strong>name</strong>, <strong>floor</strong> and{' '}
          <strong>description</strong>. Only name is required. Each row creates one cleaning area.
        </>
      }
      aliases={COLUMN_ALIASES}
      requiredColumns={REQUIRED_COLUMNS}
      expectedHeaders={['name', 'floor', 'description']}
      templateRows={TEMPLATE_SHEET}
      templateFileName="ctu-areas-template.xlsx"
      columns={[
        { field: 'name', label: 'Name', className: 'font-medium' },
        { field: 'floor', label: 'Floor', className: 'tabular' },
        { field: 'description', label: 'Description' },
      ]}
      reviewRow={reviewRow}
      uniqueBy="name"
      buildPayload={(row) => ({
        name: row.name,
        floor: row.floor,
        description: row.description,
      })}
      submit={async (rows) => {
        const response = await areaService.batchCreate(rows)
        if (response.success) onImported?.()
        return response
      }}
      errorMessage="Failed to import areas"
    />
  )
}
