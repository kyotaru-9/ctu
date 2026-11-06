import { useEffect, useState } from 'react'
import AuditLogCalendar from '../features/audit/AuditLogCalendar'
import { Button, Modal } from './ui'

/**
 * The day picker the admin list pages share: the audit log calendar in a modal.
 * Clicking a day toggles it in the selection — ctrl, shift, or plain click all
 * build the set, and shift-drag fills the range between two days — so several
 * days can be filtered at once. The selection is controlled by the caller
 * through `selectedDays`/`onDaysChange`; closing the modal keeps it.
 *
 * `counts` maps day keys to the number of records on that day, which is what
 * the calendar marks.
 */
export default function DayPickerModal({
  open,
  onClose,
  onDaysChange,
  selectedDays = [],
  counts = {},
  title = 'Filter by date',
  description = 'Pick days to narrow the list to them. Click a day to toggle it; hold shift to select a range. Days with records are marked with a count.',
  loading = false,
  single = false,
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Reopen on the current month rather than wherever the last browse ended.
  useEffect(() => {
    if (!open) return
    const now = new Date()
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onDaysChange([])}
            disabled={selectedDays.length === 0}
          >
            Clear
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">{description}</p>

        <AuditLogCalendar
          month={month}
          onMonthChange={setMonth}
          counts={counts}
          selected={selectedDays}
          // Single mode is a form field, not a filter: the first click commits
          // the day and closes, so the toggle/range selection stays off.
          onSelect={single ? () => {} : onDaysChange}
          onPickDay={
            single
              ? (day) => {
                  onDaysChange([day])
                  onClose()
                }
              : undefined
          }
          loading={loading}
        />
      </div>
    </Modal>
  )
}
