import { useCallback, useEffect, useState } from 'react'
import { auditService } from '../../services/auditService'
import { biSearch } from '../../utils/icons'
import { Alert, Button, Modal } from '../../components/ui'
import AuditLogCalendar from './AuditLogCalendar'

/**
 * Picks a day to browse, using the same calendar the cleanup dialog uses so the
 * marked days mean the same thing in both places.
 *
 * Closes as soon as a day is chosen — the point is to get to that day's entries,
 * not to browse from inside a dialog. The selection is handed back through
 * `onPick`, and the caller closes this as well so it cannot be left open behind
 * the results.
 */
export default function AuditLogDayPickerModal({ open, onClose, onPick }) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchDates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await auditService.getDates()
      if (!response.success) {
        setError(response.message || 'Failed to load the audit log history')
        return
      }

      const next = {}
      for (const entry of response.data.dates) next[entry.date] = entry.count
      setCounts(next)
      setTotal(response.data.total || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the audit log history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setError('')
    fetchDates()
  }, [open, fetchDates])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="View logs by date"
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="bad">{error}</Alert>}

        <p className="text-sm text-ink-muted">
          {total === 0
            ? 'There are no audit log entries yet.'
            : 'Pick a day to see everything recorded on it. Days with entries are marked with a count.'}
        </p>

        <AuditLogCalendar
          month={month}
          onMonthChange={setMonth}
          counts={counts}
          // The calendar's own selection is a set, which is what the cleanup
          // dialog needs and what this one does not. `onPickDay` is used instead
          // so a click arrives as the one day key rather than a one-element array.
          selected={[]}
          onSelect={() => {}}
          onPickDay={(day) => {
            onClose()
            onPick(day)
          }}
          loading={loading}
        />

        <Alert tone="info" icon={biSearch}>
          Without a date, this page shows the most recent 100 entries. Picking a day fetches every
          entry from that day, however far back it is.
        </Alert>
      </div>
    </Modal>
  )
}
