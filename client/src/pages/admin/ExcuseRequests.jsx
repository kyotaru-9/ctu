import { useCallback, useEffect, useMemo, useState } from 'react'
import { excuseService } from '../../services/excuseService'
import { formatDate, formatDateTime, sectionLabel } from '../../lib/format'
import {
  ActionButton,
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  RowActions,
  ScrollX,
  Select,
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

const EXCUSE_TYPES = [
  { value: 'all_day', label: 'All Day' },
  { value: 'room_schedule', label: 'Room Schedule' },
  { value: 'area_assignment', label: 'Area Assignment' },
]

const EXCUSE_STATUS = {
  pending: { text: 'Pending', tone: 'warn' },
  approved: { text: 'Approved', tone: 'ok' },
  rejected: { text: 'Rejected', tone: 'bad' },
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function AdminExcuseRequests() {
  const [excuses, setExcuses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [adminCreateModalOpen, setAdminCreateModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [adminFormData, setAdminFormData] = useState({
    section_id: '',
    excuse_date: new Date().toISOString().split('T')[0],
    excuse_type: 'all_day',
    room_id: '',
    area_id: '',
    schedule_id: '',
    reason: '',
    image: null,
  })

  const fetchExcuses = useCallback(async () => {
    setLoading(true)
    try {
      const response = await excuseService.getAll(statusFilter)
      if (response.success) {
        setExcuses(response.data)
      } else {
        setError(response.message || 'Failed to load excuse requests')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load excuse requests')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchExcuses()
  }, [fetchExcuses])

  const filteredExcuses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return excuses

    return excuses.filter((excuse) =>
      [excuse.reason, excuse.section?.section_name, excuse.requested_by?.full_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [excuses, searchTerm])

  const pendingCount = excuses.filter((excuse) => excuse.status === 'pending').length

  async function handleApprove(excuseId) {
    setUpdating(true)
    setError('')
    try {
      const response = await excuseService.approve(excuseId, adminNote)
      if (response.success) {
        await fetchExcuses()
        setSelected(null)
        setAdminNote('')
      } else {
        setError(response.message || 'Failed to approve excuse')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve excuse')
    } finally {
      setUpdating(false)
    }
  }

  async function handleReject(excuseId) {
    setUpdating(true)
    setError('')
    try {
      const response = await excuseService.reject(excuseId, adminNote)
      if (response.success) {
        await fetchExcuses()
        setSelected(null)
        setAdminNote('')
      } else {
        setError(response.message || 'Failed to reject excuse')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject excuse')
    } finally {
      setUpdating(false)
    }
  }

  async function handleAdminCreate(event) {
    event.preventDefault()
    setUpdating(true)
    setError('')

    try {
      const formData = new FormData()
      Object.keys(adminFormData).forEach((key) => {
        if (key !== 'image' && adminFormData[key]) {
          formData.append(key, adminFormData[key])
        }
      })
      if (adminFormData.image) {
        formData.append('image', adminFormData.image)
      }

      const response = await excuseService.adminCreate(formData)
      if (response.success) {
        await fetchExcuses()
        setAdminCreateModalOpen(false)
        setAdminFormData({
          section_id: '',
          excuse_date: new Date().toISOString().split('T')[0],
          excuse_type: 'all_day',
          room_id: '',
          area_id: '',
          schedule_id: '',
          reason: '',
          image: null,
        })
      } else {
        setError(response.message || 'Failed to create excuse')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create excuse')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Excuse Requests"
        subtitle="Manage student excuse requests"
        actions={
          <>
            {pendingCount > 0 && (
              <span className="mr-4 text-sm text-ink-muted">
                <strong className="tabular text-ink">{pendingCount}</strong> pending
              </span>
            )}
            <Button variant="primary" onClick={() => setAdminCreateModalOpen(true)}>
              + Create Excuse
            </Button>
          </>
        }
      />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <TableCard
        title="All requests"
        subtitle={`${filteredExcuses.length} of ${excuses.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search reason, section, student…"
        filters={
          <Select
            options={STATUS_FILTERS}
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-40"
          />
        }
        loading={loading}
        isEmpty={filteredExcuses.length === 0}
        empty={
          <EmptyState
            icon="bi-file-earmark-text"
            title="No requests found"
            description={
              searchTerm ? 'No requests match your search.' : 'No excuse requests have been submitted.'
            }
          />
        }
      >
        <ScrollX minW="60rem">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Section</TH>
                <TH>Room/Area</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredExcuses.map((excuse) => (
                <TR key={excuse.id}>
                  <TD className="whitespace-nowrap">{formatDate(excuse.excuse_date)}</TD>
                  <TD>
                    {EXCUSE_TYPES.find((t) => t.value === excuse.excuse_type)?.label || '—'}
                  </TD>
                  <TD className="font-medium">{sectionLabel(excuse.section)}</TD>
                  <TD>
                    {excuse.room?.room_code || excuse.area?.area_name || excuse.schedule?.subject_name || '—'}
                  </TD>
                  <TD className="max-w-xs truncate">{excuse.reason}</TD>
                  <TD>
                    <StatusBadge map={EXCUSE_STATUS} value={excuse.status} />
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for request ${excuse.id}`}>
                      <ActionButton
                        text="View"
                        label="View request details"
                        tone="accent"
                        onClick={() => {
                          setSelected(excuse)
                          setAdminNote(excuse.admin_note || '')
                        }}
                      />
                      {excuse.status === 'pending' && (
                        <>
                          <ActionButton
                            text="Approve"
                            label="Approve request"
                            tone="ok"
                            onClick={() => {
                              setSelected(excuse)
                              setAdminNote('')
                              handleApprove(excuse.id)
                            }}
                          />
                          <ActionButton
                            text="Reject"
                            label="Reject request"
                            tone="bad"
                            onClick={() => {
                              setSelected(excuse)
                              setAdminNote('')
                              handleReject(excuse.id)
                            }}
                          />
                        </>
                      )}
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
        onClose={() => {
          setSelected(null)
          setAdminNote('')
        }}
        title="Excuse Request Details"
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(null)
                setAdminNote('')
              }}
              disabled={updating}
            >
              Close
            </Button>
            {selected?.status === 'pending' && (
              <>
                <Button
                  variant="primary"
                  onClick={() => handleApprove(selected.id)}
                  loading={updating}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleReject(selected.id)}
                  loading={updating}
                >
                  Reject
                </Button>
              </>
            )}
          </>
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Excuse Date
                </p>
                <p className="text-sm text-ink">{formatDate(selected.excuse_date)}</p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Type
                </p>
                <p className="text-sm text-ink">
                  {EXCUSE_TYPES.find((t) => t.value === selected.excuse_type)?.label || '—'}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Section
                </p>
                <p className="text-sm text-ink">{sectionLabel(selected.section)}</p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Room/Area
                </p>
                <p className="text-sm text-ink">
                  {selected.room?.room_code || selected.area?.area_name || selected.schedule?.subject_name || '—'}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Requested By
                </p>
                <p className="text-sm text-ink">{selected.requested_by?.full_name || '—'}</p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Status
                </p>
                <StatusBadge map={EXCUSE_STATUS} value={selected.status} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                Reason
              </p>
              <p className="text-sm whitespace-pre-wrap text-ink">{selected.reason}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
                Proof Image
              </p>
              {selected.proof_image_url ? (
                <img
                  src={selected.proof_image_url}
                  alt="Proof"
                  className="max-h-80 w-full rounded-md border border-line object-contain"
                />
              ) : (
                <p className="text-sm text-ink-muted">No image attached.</p>
              )}
            </div>

            {selected.admin_note && (
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Admin Note
                </p>
                <p className="text-sm whitespace-pre-wrap text-ink">{selected.admin_note}</p>
              </div>
            )}

            {selected.status === 'pending' && (
              <Textarea
                label="Admin Note (optional)"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Add a note when approving or rejecting…"
                rows={3}
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={adminCreateModalOpen}
        onClose={() => setAdminCreateModalOpen(false)}
        title="Create Excuse (Admin)"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAdminCreateModalOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdminCreate} loading={updating}>
              Create & Approve
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdminCreate} className="flex flex-col gap-4">
          <Field
            label="Section"
            type="text"
            value={adminFormData.section_id}
            onChange={(event) => setAdminFormData({ ...adminFormData, section_id: event.target.value })}
            placeholder="Enter section ID"
            required
          />

          <Field
            label="Excuse Date"
            type="date"
            value={adminFormData.excuse_date}
            onChange={(event) => setAdminFormData({ ...adminFormData, excuse_date: event.target.value })}
            required
          />

          <Field
            label="Excuse Type"
            component={Select}
            options={EXCUSE_TYPES}
            value={adminFormData.excuse_type}
            onChange={(value) => setAdminFormData({ ...adminFormData, excuse_type: value })}
            required
          />

          <Field
            label="Reason"
            type="textarea"
            value={adminFormData.reason}
            onChange={(event) => setAdminFormData({ ...adminFormData, reason: event.target.value })}
            placeholder="Explain the reason for this excuse…"
            rows={3}
            required
          />

          <Field
            label="Proof Image"
            type="file"
            accept="image/*"
            onChange={(event) => setAdminFormData({ ...adminFormData, image: event.target.files[0] })}
            required
          />

          <p className="text-xs text-ink-muted">
            Room, area, and schedule can be left blank to apply the excuse to all. Admin-created excuses are auto-approved.
          </p>
        </form>
      </Modal>
    </>
  )
}
