import { useCallback, useEffect, useMemo, useState } from 'react'
import { auditService } from '../../services/auditService'
import { formatDate } from '../../lib/format'
import { biTrash } from '../../utils/icons'
import { Alert, Button, ConfirmDialog, DetailList, Modal } from '../../components/ui'
import AuditLogCalendar from './AuditLogCalendar'

/**
 * Calendar for clearing old audit log entries.
 *
 * Any number of days can be selected, because the real job is "get this table
 * under control", not "remove that one Tuesday". Two actions are offered because
 * they are different intentions: the selected days alone, or everything on and
 * before the earliest of them. Both are permanent, so each states its exact
 * count before anything is sent.
 */
export default function AuditLogCleanupModal({ open, onClose, onDeleted }) {  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [counts, setCounts] = useState({})
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [done, setDone] = useState(null)

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
    setSelected([])
    setDone(null)
    setError('')
    fetchDates()
  }, [open, fetchDates])

  // Sorted, so "earliest" and the delete range are both well defined no matter
  // what order the admin clicked the days in.
  const ordered = useMemo(() => [...selected].sort(), [selected])

  const selectedCount = ordered.reduce((sum, key) => sum + (counts[key] ?? 0), 0)
  const earliest = ordered[0] ?? null

  // Everything strictly older than the earliest selected day, plus that day
  // itself — the "and before" total the confirmation states.
  const upToCount = useMemo(() => {
    if (!earliest) return 0
    return Object.entries(counts)
      .filter(([day]) => day <= earliest)
      .reduce((sum, [, count]) => sum + count, 0)
  }, [counts, earliest])

  const daysLabel =
    ordered.length === 1
      ? formatDate(ordered[0])
      : `${formatDate(ordered[0])} to ${formatDate(ordered[ordered.length - 1])}`

  function close() {
    setConfirm(null)
    setSelected([])
    setDone(null)
    onClose()
  }

  async function handleDelete({ before }) {
    if (!ordered.length) return
    setDeleting(true)
    setError('')

    try {
      const response = await auditService.deleteByDate(ordered, { before })

      if (!response.success) {
        setError(response.message || 'Failed to delete audit log entries')
        return
      }

      setDone({ deleted: response.data.deleted, before, label: daysLabel })
      setConfirm(null)
      setSelected([])
      await fetchDates()
      // Optional: the audit log page wants its table refreshed, the settings page
      // has no table behind this. Calling it unconditionally would throw on a
      // missing prop and be reported as a failed delete — after the rows are
      // already gone.
      onDeleted?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete audit log entries')
    } finally {
      setDeleting(false)
    }
  }

  const nothingSelected = ordered.length === 0

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        title="Clean up audit logs"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={deleting}>
              Close
            </Button>
            <Button
              variant="danger"
              icon={biTrash}
              onClick={() => setConfirm({ before: false })}
              disabled={nothingSelected}
              loading={deleting}
            >
              Delete selected {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="bad">{error}</Alert>}

          {done && (
            <Alert tone="ok">
              Deleted {done.deleted} {done.deleted === 1 ? 'entry' : 'entries'}
              {done.before ? ' on and before' : ' from'} {done.label}.
            </Alert>
          )}

          <p className="text-sm text-ink-muted">
            {total === 0
              ? 'There is nothing to clean up yet.'
              : `${total} ${total === 1 ? 'entry' : 'entries'} in total. Pick the days to clear — click to add one, or hold shift to sweep a range.`}
          </p>

          <AuditLogCalendar
            month={month}
            onMonthChange={setMonth}
            counts={counts}
            selected={ordered}
            onSelect={setSelected}
            loading={loading}
          />

          {earliest && (
            <DetailList
              columns={1}
              items={[
                { label: ordered.length === 1 ? 'Selected day' : 'Selected range', value: daysLabel },
                { label: 'Days selected', value: String(ordered.length) },
                {
                  label: 'On those days',
                  value: `${selectedCount} ${selectedCount === 1 ? 'entry' : 'entries'}`,
                },
                {
                  label: 'On and before the first',
                  value: `${upToCount} ${upToCount === 1 ? 'entry' : 'entries'}`,
                },
              ]}
            />
          )}

          {!nothingSelected && (
            <Button
              variant="danger-outline"
              icon={biTrash}
              block
              onClick={() => setConfirm({ before: true })}
              disabled={deleting}
            >
              Delete everything on and before {formatDate(ordered[0])} ({upToCount}{' '}
              {upToCount === 1 ? 'entry' : 'entries'})
            </Button>
          )}

          <Alert tone="info">
            Deleted entries cannot be recovered. Keeping a copy of anything you might need before
            removing it.
          </Alert>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleDelete(confirm)}
        loading={deleting}
        title="Delete audit log entries"
        description={
          confirm?.before
            ? `Permanently delete ${upToCount} ${upToCount === 1 ? 'entry' : 'entries'} — everything on and before ${formatDate(ordered[0])}? This cannot be undone.`
            : `Permanently delete ${selectedCount} ${selectedCount === 1 ? 'entry' : 'entries'} across ${ordered.length} ${ordered.length === 1 ? 'day' : 'days'} (${daysLabel})? This cannot be undone.`
        }
        confirmLabel="Delete permanently"
      />
    </>
  )
}
