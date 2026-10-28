import { useMemo } from 'react'
import { educatorService } from '../../services/educatorService'
import BatchImportModal from '../batch/BatchImportModal'

/**
 * Sheet headers are matched loosely on purpose.
 */
const COLUMN_ALIASES = {
  name: ['name', 'educator name', 'educator_name', 'instructor', 'instructor name'],
  department: ['department', 'dept', 'department name'],
}

const REQUIRED_COLUMNS = ['name', 'department']

/** Headers plus one example row, so the expected shape is visible. */
const TEMPLATE_SHEET = [
  ['name', 'department'],
  ['John Doe', 'Computer Science'],
]

/**
 * Batch educator import. Each row creates one educator with a name and department.
 */
export default function EducatorsBatchUploadModal({ open, onClose, onImported }) {
  /**
   * Normalises one parsed row and names the problem that would stop it importing.
   */
  function reviewRow(row) {
    const missing = REQUIRED_COLUMNS.filter((column) => !row[column])
    if (missing.length) return { ...row, issue: `Missing ${missing.join(', ')}` }

    const name = typeof row.name === 'string' ? row.name.trim() : row.name
    const department = typeof row.department === 'string' ? row.department.trim() : row.department

    if (!name || name.length === 0) {
      return { ...row, issue: 'Name cannot be empty' }
    }

    if (!department || department.length === 0) {
      return { ...row, issue: 'Department cannot be empty' }
    }

    return { ...row, issue: null }
  }

  return (
    <BatchImportModal
      open={open}
      onClose={onClose}
      title="Batch upload educators"
      entityLabel="educator"
      pluralLabel="educators"
      intro={
        <>
          The first sheet needs a header row with <strong>name</strong> and <strong>department</strong>. Each
          row creates one educator. Duplicate educators (same name) will be skipped.
        </>
      }
      aliases={COLUMN_ALIASES}
      requiredColumns={REQUIRED_COLUMNS}
      expectedHeaders={['name', 'department']}
      templateRows={TEMPLATE_SHEET}
      templateFileName="ctu-educators-template.xlsx"
      columns={[
        {
          field: 'name',
          label: 'Name',
          className: 'font-medium',
        },
        {
          field: 'department',
          label: 'Department',
        },
      ]}
      reviewRow={reviewRow}
      uniqueBy="name"
      buildPayload={(row) => ({
        name: row.name,
        department: row.department,
      })}
      submit={async (rows) => {
        const response = await educatorService.batchCreate(rows)
        if (response.success) onImported?.()
        return response
      }}
      errorMessage="Failed to import educators"
    />
  )
}
