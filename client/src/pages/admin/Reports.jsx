import { useCallback, useEffect, useMemo, useState } from 'react'
import { reportService } from '../../services/reportService'
import { formatDate, formatDateTime, formatTime, sectionLabel } from '../../lib/format'
import {
  ActionButton,
  Alert,
  Button,
  DetailList,
  EmptyState,
  LoadingBlock,
  Modal,
  PageHeader,
  REPORT_STATUS,
  RowActions,
  ScrollX,
  StatusBadge,
  TBody,
  TD,
  Textarea,
  TH,
  THead,
  TR,
  Table,
  TableCard,
} from '../../components/ui'

const NEXT_ACTIONS = {
  pending: [
    { status: 'reviewed', text: 'Reviewed', label: 'Mark report as reviewed', tone: 'ok' },
    { status: 'rejected', text: 'Reject', label: 'Reject report', tone: 'bad' },
  ],
  reviewed: [
    { status: 'resolved', text: 'Resolve', label: 'Resolve report', tone: 'ok' },
    { status: 'pending', text: 'Reopen', label: 'Reopen report', tone: 'accent' },
  ],
}

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [adminNote, setAdminNote] = useState('')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const response = await reportService.getAll()
      if (response.success) {
        setReports(response.data)
      } else {
        setError(response.message || 'Failed to load reports')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const filteredReports = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return reports

    return reports.filter((report) =>
      [report.section?.section_name, report.section?.program, report.room?.room_code, report.reason?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [reports, searchTerm])

  const pendingCount = reports.filter((report) => report.status === 'pending').length

  // The list row carries everything the table needs, but the modal is the
  // place a report is actually reviewed, so it opens on the list row and then
  // reloads the full record by id.
  const openDetails = useCallback(async (report) => {
    setSelected(report)
    setAdminNote(report.admin_note || '')
    setDetailError('')
    setDetailLoading(true)
    try {
      const response = await reportService.getById(report.id)
      if (response.success && response.data) {
        setSelected(response.data)
        setAdminNote(response.data.admin_note || '')
      } else {
        setDetailError(response.message || 'Failed to load report details')
      }
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Failed to load report details')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  function closeDetails() {
    setSelected(null)
    setAdminNote('')
    setDetailError('')
    setDetailLoading(false)
  }

  async function handleStatusChange(reportId, newStatus) {
    setUpdating(true)
    setError('')
    try {
      const response = await reportService.updateStatus(reportId, newStatus, adminNote)
      if (response.success) {
        await fetchReports()
        setAdminNote('')
      } else {
        setError(response.message || 'Failed to update status')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  async function handleSaveNote() {
    if (!selected) return
    setUpdating(true)
    setError('')
    try {
      const response = await reportService.updateStatus(selected.id, selected.status, adminNote)
      if (response.success) {
        await fetchReports()
        closeDetails()
      } else {
        setError(response.message || 'Failed to save note')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save note')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Manage room cleanliness reports"
        actions={
          pendingCount > 0 ? (
            <span className="text-sm text-ink-muted">
              <strong className="tabular text-ink">{pendingCount}</strong> awaiting review
            </span>
          ) : null
        }
      />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <TableCard
        title="All reports"
        subtitle={`${filteredReports.length} of ${reports.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search section, room, reason…"
        loading={loading}
        isEmpty={filteredReports.length === 0}
        empty={
          <EmptyState
            icon="bi-exclamation-triangle"
            title="No reports found"
            description={
              searchTerm ? 'No reports match your search.' : 'No cleanliness reports have been filed.'
            }
          />
        }
      >
        <ScrollX minW="54rem">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Time</TH>
                <TH>Section</TH>
                <TH>Room</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredReports.map((report) => (
                <TR key={report.id}>
                  <TD className="whitespace-nowrap">{formatDate(report.reported_at)}</TD>
                  <TD className="tabular whitespace-nowrap">
                    {report.reported_at
                      ? formatTime(new Date(report.reported_at).toTimeString().slice(0, 5))
                      : '—'}
                  </TD>
                  <TD className="font-medium">{sectionLabel(report.section)}</TD>
                  <TD className="tabular">{report.room?.room_code || '—'}</TD>
                  <TD>{report.reason?.name || report.other_reason || '—'}</TD>
                  <TD>
                    <StatusBadge map={REPORT_STATUS} value={report.status} />
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for report ${report.id}`}>
                      {(NEXT_ACTIONS[report.status] ?? []).map((action) => (
                        <ActionButton
                          key={action.status}
                          text={action.text}
                          label={action.label}
                          tone={action.tone}
                          disabled={updating}
                          onClick={() => handleStatusChange(report.id, action.status)}
                        />
                      ))}
                      <ActionButton
                        text="View"
                        label="View report details"
                        tone="accent"
                        onClick={() => openDetails(report)}
                      />
                    </RowActions>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ScrollX>
      </TableCard>

      <Modal
        open={Boolean(selected)}
        onClose={closeDetails}
        title="Report details"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeDetails} disabled={updating}>
              Close
            </Button>
            <Button variant="primary" onClick={handleSaveNote} loading={updating}>
              Save note
            </Button>
          </>
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            {detailError && (
              <Alert tone="bad" onDismiss={() => setDetailError('')}>
                {detailError}
              </Alert>
            )}

            <DetailList
              items={[
                { label: 'Reported at', value: formatDateTime(selected.reported_at) },
                { label: 'Status', value: <StatusBadge map={REPORT_STATUS} value={selected.status} /> },
                { label: 'Section', value: sectionLabel(selected.section) },
                { label: 'Room', value: selected.room?.room_code || '—' },
                selected.room?.room_name && { label: 'Room name', value: selected.room.room_name },
                selected.room?.building && { label: 'Building', value: selected.room.building },
                selected.room?.floor && { label: 'Floor', value: selected.room.floor },
                { label: 'Reason', value: selected.reason?.name || '—' },
                { label: 'Other reason', value: selected.other_reason || '—' },
                { label: 'Reviewed at', value: formatDateTime(selected.reviewed_at) },
              ]}
            />

            {detailLoading && <LoadingBlock label="Loading report…" compact />}

            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                Description
              </p>
              <p className="text-sm whitespace-pre-wrap text-ink">
                {selected.description || 'No description provided.'}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
                Image proof
              </p>
              {selected.image_url ? (
                <img
                  src={selected.image_url}
                  alt={`Proof submitted for ${selected.reason?.name ?? 'report'}`}
                  className="max-h-80 w-full rounded-md border border-line object-contain"
                />
              ) : (
                <p className="text-sm text-ink-muted">No image attached.</p>
              )}
            </div>

            <Textarea
              label="Admin note"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Add a note for the record…"
              rows={3}
            />
          </div>
        )}
      </Modal>
    </>
  )
}
