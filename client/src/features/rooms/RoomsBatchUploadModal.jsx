import { roomService } from '../../services/roomService'
import BatchImportModal from '../batch/BatchImportModal'

/**
 * Sheet headers are matched loosely on purpose. A file typed by hand in Excel
 * arrives as "Code", "ROOM_CODE" or "Room Code" depending on who made it, and
 * rejecting the whole import over capitalisation is not a useful trade.
 */
const COLUMN_ALIASES = {
  room_code: ['code', 'room code', 'room_code', 'roomcode', 'room number', 'no'],
  floor: ['floor', 'floor level', 'floor_level', 'level'],
  description: ['description', 'notes', 'remarks'],
}

const REQUIRED_COLUMNS = ['room_code']

/** Headers plus one example row, so the expected shape is visible. */
const TEMPLATE_SHEET = [
  ['code', 'floor', 'description'],
  ['101', '1', 'Computer Laboratory'],
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

/** Batch room import. Each row becomes a classroom with its own QR code. */
export default function RoomsBatchUploadModal({ open, onClose, onImported }) {
  return (
    <BatchImportModal
      open={open}
      onClose={onClose}
      title="Batch upload rooms"
      entityLabel="room"
      pluralLabel="rooms"
      intro={
        <>
          The first sheet needs a header row with <strong>code</strong>, <strong>floor</strong> and{' '}
          <strong>description</strong>. Only code is required. Each row creates one classroom and generates
          its QR code.
        </>
      }
      aliases={COLUMN_ALIASES}
      requiredColumns={REQUIRED_COLUMNS}
      expectedHeaders={['code', 'floor', 'description']}
      templateRows={TEMPLATE_SHEET}
      templateFileName="ctu-rooms-template.xlsx"
      columns={[
        { field: 'room_code', label: 'Code', className: 'tabular font-medium' },
        { field: 'floor', label: 'Floor', className: 'tabular' },
        { field: 'description', label: 'Description' },
      ]}
      reviewRow={reviewRow}
      uniqueBy="room_code"
      buildPayload={(row) => ({
        room_code: row.room_code,
        floor: row.floor,
        description: row.description,
      })}
      submit={async (rows) => {
        const response = await roomService.batchCreate(rows)
        if (response.success) onImported?.()
        return response
      }}
      errorMessage="Failed to import rooms"
    />
  )
}
