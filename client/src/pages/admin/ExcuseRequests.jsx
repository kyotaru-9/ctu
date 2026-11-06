import { useCallback, useEffect, useMemo, useState } from 'react'
import { excuseService } from '../../services/excuseService'
import { sectionService } from '../../services/sectionService'
import { scheduleService } from '../../services/scheduleService'
import { areaAssignmentService } from '../../services/areaAssignmentService'
import DayPickerModal from '../../components/DayPickerModal'
import { dayKey, dayName, formatDate, formatDateTime, sectionLabel } from '../../lib/format'
import { biCalendar, biCheckSquare, biTrash } from '../../utils/icons'
import {
  Alert,
  Badge,
  BentoGrid,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DetailList,
  EmptyState,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  ScrollX,
  SegmentedControl,
  Select,
  StatCard,
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

/**
 * Searchable checkbox list for picking any number of options — the same
 * pattern the section picker uses, shared by the section, schedule and area
 * pickers in the admin create form.
 */
function MultiPickList({
  options,
  selectedIds,
  onChange,
  loading = false,
  searchPlaceholder = 'Search…',
  emptyText = 'Nothing to pick.',
  getLabel,
  getMeta,
}) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const visible = term
    ? options.filter((option) =>
        `${getLabel(option)} ${getMeta?.(option) ?? ''}`.toLowerCase().includes(term)
      )
    : options

  function toggle(id) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id]
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="border-b border-line p-2">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          icon="bi-search"
          aria-label={searchPlaceholder}
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-sunken px-3 py-2">
        <span className="text-xs font-medium text-ink-muted">
          {selectedIds.length === 0
            ? 'No selections'
            : `${selectedIds.length} of ${options.length} selected`}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent-soft"
            onClick={() =>
              onChange([...new Set([...selectedIds, ...visible.map((option) => option.id)])])
            }
          >
            Select all
          </button>
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="rounded px-2 py-0.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken"
              onClick={() => {
                const visibleIds = new Set(visible.map((option) => option.id))
                const kept = selectedIds.filter((id) => !visibleIds.has(id))
                const added = visible
                  .filter((option) => !selectedIds.includes(option.id))
                  .map((option) => option.id)
                onChange([...kept, ...added])
              }}
            >
              Invert
            </button>
          )}
          <button
            type="button"
            className="rounded px-2 py-0.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="max-h-44 overflow-y-auto">
        {visible.map((option) => {
          const checked = selectedIds.includes(option.id)
          return (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2.5 border-b border-line/60 px-3 py-2 text-sm text-ink last:border-b-0 hover:bg-surface-sunken"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option.id)}
                className="h-4 w-4 shrink-0 rounded-xs border-line-strong accent-accent"
              />
              <span className="min-w-0 flex-1 truncate">
                {getLabel(option)}
                {getMeta?.(option) && (
                  <span className="text-ink-muted"> · {getMeta(option)}</span>
                )}
              </span>
            </label>
          )
        })}
        {loading && (
          <p className="px-3 py-3 text-center text-xs text-ink-muted">Loading…</p>
        )}
        {!loading && visible.length === 0 && (
          <p className="px-3 py-3 text-center text-xs text-ink-muted">
            {term ? 'No matches.' : emptyText}
          </p>
        )}
      </div>
    </div>
  )
}

const EXCUSE_TYPES = [
  { value: 'all_day', label: 'All Day' },
  { value: 'room_schedule', label: 'Room Schedule' },
  { value: 'area_assignment', label: 'Area Assignment' },
]

const EXCUSE_STATUS = {
  pending: { label: 'Pending', tone: 'warn' },
  approved: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'bad' },
}

/** Admin-created excuses skip review, so they read as accepted, not approved. */
function isAdminCreated(excuse) {
  return excuse?.admin_note === 'Created by admin'
}

/** What the excuse is scoped to — "All" for all-day, else the picked target. */
function excuseTargetLabel(excuse) {
  if (excuse?.excuse_type === 'all_day') return 'All'
  if (excuse?.excuse_type === 'room_schedule') return excuse.schedule?.subject_name || '—'
  if (excuse?.excuse_type === 'area_assignment') {
    return excuse.area?.name || excuse.area?.area_name || '—'
  }
  return excuse?.room?.room_code || excuse?.schedule?.subject_name || excuse?.area?.name || '—'
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
  const [viewDates, setViewDates] = useState([])
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showExcuseDatePicker, setShowExcuseDatePicker] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [adminFieldErrors, setAdminFieldErrors] = useState({})
  const [adminNote, setAdminNote] = useState('')
  const [sectionOptions, setSectionOptions] = useState([])
  const [scheduleOptions, setScheduleOptions] = useState([])
  const [assignmentOptions, setAssignmentOptions] = useState([])
  const [formOptionsLoading, setFormOptionsLoading] = useState(false)
  const blankAdminForm = () => ({
    scope: 'all',
    section_ids: [],
    excuse_date: new Date().toISOString().split('T')[0],
    excuse_type: 'all_day',
    schedule_ids: [],
    area_ids: [],
    reason: '',
  })
  const [adminFormData, setAdminFormData] = useState(blankAdminForm)

  // Dropdown data for the admin create form — fetched when the modal opens so
  // the lists are fresh and the page itself stays light.
  const fetchFormOptions = useCallback(async () => {
    setFormOptionsLoading(true)
    try {
      const [sectionsRes, schedulesRes, assignmentsRes] = await Promise.all([
        sectionService.getAll(),
        scheduleService.getAll(),
        areaAssignmentService.getAll(),
      ])
      if (sectionsRes.success) setSectionOptions(sectionsRes.data || [])
      if (schedulesRes.success) setScheduleOptions(schedulesRes.data || [])
      if (assignmentsRes.success) setAssignmentOptions(assignmentsRes.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load form options')
    } finally {
      setFormOptionsLoading(false)
    }
  }, [])

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

  // Days with requests, counted from the list already loaded — the calendar
  // marks them the same way the audit log picker does, without a second query.
  const dayCounts = useMemo(() => {
    const counts = {}
    for (const excuse of excuses) {
      const key = dayKey(excuse.excuse_date)
      if (key) counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [excuses])

  const filteredExcuses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return excuses.filter((excuse) => {
      if (viewDates.length > 0 && !viewDates.includes(dayKey(excuse.excuse_date))) return false
      if (!term) return true

      return [excuse.reason, excuse.section?.section_name, excuse.requested_by?.full_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    })
  }, [excuses, searchTerm, viewDates])

  const pendingCount = excuses.filter((excuse) => excuse.status === 'pending').length

  // The sections the excuse applies to — every section for "all", the picked
  // ones otherwise. Schedule and area options are limited to what belongs to
  // these sections.
  const selectedSectionIds = useMemo(
    () =>
      adminFormData.scope === 'all'
        ? sectionOptions.map((section) => section.id)
        : adminFormData.section_ids,
    [adminFormData.scope, adminFormData.section_ids, sectionOptions]
  )
  const selectedSectionIdSet = useMemo(() => new Set(selectedSectionIds), [selectedSectionIds])

  const relatedSchedules = useMemo(
    () => scheduleOptions.filter((schedule) => selectedSectionIdSet.has(schedule.section_id)),
    [scheduleOptions, selectedSectionIdSet]
  )

  const relatedAreas = useMemo(() => {
    const seen = new Set()
    const areas = []
    for (const assignment of assignmentOptions) {
      if (
        assignment.section_id &&
        selectedSectionIdSet.has(assignment.section_id) &&
        assignment.area &&
        !seen.has(assignment.area.id)
      ) {
        seen.add(assignment.area.id)
        areas.push(assignment.area)
      }
    }
    return areas
  }, [assignmentOptions, selectedSectionIdSet])

  /** Drops scoped picks that no longer belong to the chosen sections. */
  function pruneScopedPicks(ids) {
    const allowed = new Set(ids)
    setAdminFormData((previous) => ({
      ...previous,
      section_ids: ids,
      schedule_ids: previous.schedule_ids.filter((scheduleId) =>
        scheduleOptions.some(
          (schedule) => schedule.id === scheduleId && allowed.has(schedule.section_id)
        )
      ),
      area_ids: previous.area_ids.filter((areaId) =>
        assignmentOptions.some(
          (assignment) => assignment.area_id === areaId && allowed.has(assignment.section_id)
        )
      ),
    }))
  }

  function openDetails(excuse) {
    setSelected(excuse)
    setAdminNote(excuse.admin_note || '')
  }

  function toggleSelectMode() {
    setSelectMode((on) => {
      if (on) setSelectedIds(new Set())
      return !on
    })
  }

  function toggleExcuseSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedExcuses = excuses.filter((excuse) => selectedIds.has(excuse.id))
  const pendingSelected = selectedExcuses.filter((excuse) => excuse.status === 'pending')

  const allVisibleSelected =
    filteredExcuses.length > 0 && filteredExcuses.every((excuse) => selectedIds.has(excuse.id))

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        filteredExcuses.forEach((excuse) => next.delete(excuse.id))
      } else {
        filteredExcuses.forEach((excuse) => next.add(excuse.id))
      }
      return next
    })
  }

  /** Bulk approve/reject — only pending requests can move, so the rest are skipped. */
  async function runBulkReview(action) {
    if (pendingSelected.length === 0) {
      setError('None of the selected requests are pending.')
      return
    }
    setBulkSaving(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        pendingSelected.map((excuse) =>
          action === 'approve' ? excuseService.approve(excuse.id) : excuseService.reject(excuse.id)
        )
      )
      const failed = results.filter(
        (result) => result.status === 'rejected' || result.value?.success === false
      ).length
      if (failed > 0) {
        setError(`${failed} of ${pendingSelected.length} requests could not be ${action}d.`)
      }
      setSelectedIds(new Set())
      await fetchExcuses()
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} requests`)
    } finally {
      setBulkSaving(false)
    }
  }

  /** Bulk delete — permanent, behind the same selection bar as approve/reject. */
  async function handleBulkDelete() {
    setBulkSaving(true)
    setError('')
    try {
      const response = await excuseService.deleteRequests([...selectedIds])
      if (response.success) {
        setSelectedIds(new Set())
        setBulkDeleteOpen(false)
        await fetchExcuses()
      } else {
        setError(response.message || 'Failed to delete requests')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete requests')
    } finally {
      setBulkSaving(false)
    }
  }

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

  function updateAdminField(field, value) {
    setAdminFormData((previous) => ({ ...previous, [field]: value }))
    setAdminFieldErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  function validateAdminForm() {
    const errors = {}
    const today = new Date().toISOString().split('T')[0]

    if (adminFormData.scope === 'pick' && adminFormData.section_ids.length === 0) {
      errors.section_ids = 'Select at least one section.'
    }
    if (!adminFormData.excuse_date) {
      errors.excuse_date = 'Excuse date is required.'
    } else if (adminFormData.excuse_date < today) {
      errors.excuse_date = 'Excuse date cannot be in the past.'
    }
    if (adminFormData.excuse_type === 'room_schedule' && adminFormData.schedule_ids.length === 0) {
      errors.schedule_ids = 'Select at least one schedule.'
    }
    if (adminFormData.excuse_type === 'area_assignment' && adminFormData.area_ids.length === 0) {
      errors.area_ids = 'Select at least one area.'
    }
    if (!adminFormData.reason.trim()) {
      errors.reason = 'Reason is required.'
    }

    setAdminFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleAdminCreate(event) {
    event.preventDefault()
    if (!validateAdminForm()) return
    setUpdating(true)
    setError('')

    try {
      const response = await excuseService.adminCreate({
        ...(adminFormData.scope === 'all'
          ? { all_sections: true }
          : { section_ids: adminFormData.section_ids }),
        excuse_date: adminFormData.excuse_date,
        excuse_type: adminFormData.excuse_type,
        reason: adminFormData.reason,
        schedule_ids: adminFormData.schedule_ids.length ? adminFormData.schedule_ids : undefined,
        area_ids: adminFormData.area_ids.length ? adminFormData.area_ids : undefined,
      })
      if (response.success) {
        await fetchExcuses()
        setAdminCreateModalOpen(false)
        setAdminFieldErrors({})
        setAdminFormData(blankAdminForm())
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
            <Button
              variant={selectMode ? 'primary' : 'secondary'}
              icon={biCheckSquare}
              onClick={toggleSelectMode}
            >
              {selectMode ? 'Done' : 'Select'}
            </Button>
            <Button
              variant="secondary"
              icon={biCalendar}
              onClick={() => setShowDayPicker(true)}
            >
              Filter by date
            </Button>
            {pendingCount > 0 && (
              <span className="mx-4 text-sm text-ink-muted">
                <strong className="tabular text-ink">{pendingCount}</strong> pending
              </span>
            )}
            <Button
              variant="primary"
              onClick={() => {
                setAdminFieldErrors({})
                setAdminCreateModalOpen(true)
                fetchFormOptions()
              }}
            >
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

      {viewDates.length > 0 && (
        <Alert
          tone="info"
          className="mb-5"
          onDismiss={() => setViewDates([])}
          title={
            viewDates.length === 1
              ? `Showing ${formatDate(viewDates[0])} only`
              : `Showing ${viewDates.length} selected days`
          }
        >
          Requests for the selected excuse dates.
        </Alert>
      )}

      {selectMode && selectedExcuses.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
          <span className="text-sm font-medium text-ink">
            {selectedExcuses.length} selected
            {selectedExcuses.length !== pendingSelected.length && (
              <span className="font-normal text-ink-muted">
                {' '}
                · {pendingSelected.length} pending
              </span>
            )}
          </span>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <Button
            size="sm"
            variant="primary"
            onClick={() => runBulkReview('approve')}
            loading={bulkSaving}
            disabled={pendingSelected.length === 0}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => runBulkReview('reject')}
            loading={bulkSaving}
            disabled={pendingSelected.length === 0}
          >
            Reject
          </Button>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <Button
            size="sm"
            variant="danger"
            icon={biTrash}
            onClick={() => setBulkDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      )}

      <TableCard
        title="All requests"
        subtitle={
          viewDates.length > 0
            ? `${filteredExcuses.length} request${filteredExcuses.length === 1 ? '' : 's'} on the selected day${viewDates.length === 1 ? '' : 's'}`
            : `${filteredExcuses.length} of ${excuses.length} shown`
        }
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
              searchTerm
                ? 'No requests match your search.'
                : viewDates.length > 0
                  ? 'No requests were filed for the selected days.'
                  : 'No excuse requests have been submitted.'
            }
          />
        }
      >
        <ScrollX minW="60rem">
          <Table>
            <THead>
              <tr>
                {selectMode && (
                  <TH className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all requests"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                    />
                  </TH>
                )}
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Section</TH>
                <TH>Room/Area</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {filteredExcuses.map((excuse) => (
                <TR
                  key={excuse.id}
                  className={selectMode ? undefined : 'cursor-pointer'}
                  title={selectMode ? undefined : 'View request details'}
                  onClick={() => (selectMode ? toggleExcuseSelection(excuse.id) : openDetails(excuse))}
                >
                  {selectMode && (
                    <TD onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select request ${excuse.id}`}
                        checked={selectedIds.has(excuse.id)}
                        onChange={() => toggleExcuseSelection(excuse.id)}
                        className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                      />
                    </TD>
                  )}
                  <TD className="whitespace-nowrap">{formatDate(excuse.excuse_date)}</TD>
                  <TD>
                    {EXCUSE_TYPES.find((t) => t.value === excuse.excuse_type)?.label || '—'}
                  </TD>
                  <TD className="font-medium">{sectionLabel(excuse.section)}</TD>
                  <TD>{excuseTargetLabel(excuse)}</TD>
                  <TD className="max-w-xs truncate">{excuse.reason}</TD>
                  <TD>
                    {isAdminCreated(excuse) ? (
                      <Badge tone="ok">Accepted</Badge>
                    ) : (
                      <StatusBadge map={EXCUSE_STATUS} value={excuse.status} />
                    )}
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
          selected?.status === 'pending' ? (
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
          ) : undefined
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            {/* Hero — same feature card the section overview leads with. */}
            <BentoGrid>
              <StatCard
                variant="feature"
                className="col-span-full row-span-2"
                label="Excuse request"
                value={sectionLabel(selected.section)}
                hint={`${EXCUSE_TYPES.find((t) => t.value === selected.excuse_type)?.label || '—'} · ${excuseTargetLabel(selected)}`}
                footer={
                  isAdminCreated(selected) ? (
                    <Badge tone="ok">Accepted</Badge>
                  ) : (
                    <StatusBadge map={EXCUSE_STATUS} value={selected.status} />
                  )
                }
              />
            </BentoGrid>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <StatCard label="Excuse Date" value={formatDate(selected.excuse_date)} />
              <StatCard
                label="Type"
                value={EXCUSE_TYPES.find((t) => t.value === selected.excuse_type)?.label || '—'}
              />
              <StatCard
                label="Requested By"
                value={selected.requested_by?.full_name || '—'}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Scope</CardTitle>
                </CardHeader>
                <CardBody>
                  <DetailList
                    columns={1}
                    items={[
                      { label: 'Room/Area', value: excuseTargetLabel(selected) },
                      selected.created_at && {
                        label: 'Submitted',
                        value: formatDateTime(selected.created_at),
                      },
                      selected.reviewed_at && {
                        label: 'Reviewed',
                        value: formatDateTime(selected.reviewed_at),
                      },
                    ]}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Proof Image</CardTitle>
                </CardHeader>
                <CardBody>
                  {selected.proof_image_url ? (
                    <img
                      src={selected.proof_image_url}
                      alt="Proof"
                      className="max-h-80 w-full rounded-md border border-line object-contain"
                    />
                  ) : (
                    <p className="text-sm text-ink-muted">No image attached.</p>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Reason</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm whitespace-pre-wrap text-ink">{selected.reason}</p>
              </CardBody>
            </Card>

            {selected.admin_note && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Note</CardTitle>
                </CardHeader>
                <CardBody>
                  <p className="text-sm whitespace-pre-wrap text-ink">{selected.admin_note}</p>
                </CardBody>
              </Card>
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
        title="Create Excuse"
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
          <div>
            <p className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
              Applies to <span className="text-bad">*</span>
            </p>
            <SegmentedControl
              name="excuse-scope"
              columns={2}
              value={adminFormData.scope}
              onChange={(value) => updateAdminField('scope', value)}
              options={[
                { value: 'all', label: 'All sections' },
                { value: 'pick', label: 'Pick sections' },
              ]}
            />
          </div>

          {adminFormData.scope === 'pick' && (
            <>
              <MultiPickList
                options={sectionOptions}
                selectedIds={adminFormData.section_ids}
                onChange={pruneScopedPicks}
                loading={formOptionsLoading}
                searchPlaceholder="Search sections…"
                emptyText="No sections available."
                getLabel={sectionLabel}
                getMeta={(section) => section.shift}
              />
              {adminFieldErrors.section_ids && (
                <p className="-mt-2 flex items-start gap-1 text-xs text-bad">
                  <i className="bi bi-exclamation-circle mt-px shrink-0" aria-hidden="true" />
                  {adminFieldErrors.section_ids}
                </p>
              )}
            </>
          )}

          <div>
            <p className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
              Excuse Date <span className="text-bad">*</span>
            </p>
            <button
              type="button"
              onClick={() => setShowExcuseDatePicker(true)}
              aria-invalid={Boolean(adminFieldErrors.excuse_date) || undefined}
              className={`field flex w-full items-center justify-between gap-2 text-left ${
                adminFieldErrors.excuse_date ? 'field-invalid' : ''
              }`}
            >
              <span className={adminFormData.excuse_date ? 'text-ink' : 'text-ink-subtle'}>
                {adminFormData.excuse_date ? formatDate(adminFormData.excuse_date) : 'Pick a date'}
              </span>
              <i className="bi bi-calendar3 shrink-0 text-ink-muted" aria-hidden="true" />
            </button>
            {adminFieldErrors.excuse_date ? (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-bad">
                <i className="bi bi-exclamation-circle mt-px shrink-0" aria-hidden="true" />
                {adminFieldErrors.excuse_date}
              </p>
            ) : null}
          </div>

          <div>
            <p className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
              Excuse Type <span className="text-bad">*</span>
            </p>
            <SegmentedControl
              name="excuse-type"
              columns={3}
              value={adminFormData.excuse_type}
              onChange={(value) => {
                updateAdminField('excuse_type', value)
                // The scoped picks belong to the previous type — stray ids on
                // an all-day excuse would still be submitted.
                setAdminFormData((previous) => ({
                  ...previous,
                  schedule_ids: [],
                  area_ids: [],
                }))
              }}
              options={EXCUSE_TYPES}
            />
            {adminFieldErrors.excuse_type && (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-bad">
                <i className="bi bi-exclamation-circle mt-px shrink-0" aria-hidden="true" />
                {adminFieldErrors.excuse_type}
              </p>
            )}
          </div>

          {adminFormData.excuse_type === 'room_schedule' && (
            <>
              <div>
                <p className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
                  Schedules <span className="text-bad">*</span>
                </p>
                <MultiPickList
                  options={relatedSchedules}
                  selectedIds={adminFormData.schedule_ids}
                  onChange={(ids) => updateAdminField('schedule_ids', ids)}
                  loading={formOptionsLoading}
                  searchPlaceholder="Search schedules…"
                  emptyText="No schedules for the selected sections."
                  getLabel={(schedule) =>
                    `${schedule.subject_name} — ${schedule.room?.room_code || 'No room'}`
                  }
                  getMeta={(schedule) =>
                    `${sectionLabel(schedule.section)} · ${dayName(schedule.day_of_week)}`
                  }
                />
              </div>
              {adminFieldErrors.schedule_ids && (
                <p className="-mt-2 flex items-start gap-1 text-xs text-bad">
                  <i className="bi bi-exclamation-circle mt-px shrink-0" aria-hidden="true" />
                  {adminFieldErrors.schedule_ids}
                </p>
              )}
            </>
          )}

          {adminFormData.excuse_type === 'area_assignment' && (
            <>
              <div>
                <p className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
                  Areas <span className="text-bad">*</span>
                </p>
                <MultiPickList
                  options={relatedAreas}
                  selectedIds={adminFormData.area_ids}
                  onChange={(ids) => updateAdminField('area_ids', ids)}
                  loading={formOptionsLoading}
                  searchPlaceholder="Search areas…"
                  emptyText="No areas assigned to the selected sections."
                  getLabel={(area) => area.name}
                  getMeta={(area) => area.floor}
                />
              </div>
              {adminFieldErrors.area_ids && (
                <p className="-mt-2 flex items-start gap-1 text-xs text-bad">
                  <i className="bi bi-exclamation-circle mt-px shrink-0" aria-hidden="true" />
                  {adminFieldErrors.area_ids}
                </p>
              )}
            </>
          )}

          <Textarea
            label="Reason"
            value={adminFormData.reason}
            onChange={(event) => updateAdminField('reason', event.target.value)}
            error={adminFieldErrors.reason}
            placeholder="Explain the reason for this excuse…"
            rows={3}
            required
          />

          <p className="text-xs text-ink-muted">
            Admin-created excuses are auto-approved and need no proof image. Room, area, and schedule
            can be left blank to apply the excuse to everything.
          </p>
        </form>
      </Modal>

      <DayPickerModal
        open={showDayPicker}
        onClose={() => setShowDayPicker(false)}
        onDaysChange={setViewDates}
        selectedDays={viewDates}
        counts={dayCounts}
        description="Pick days to show only the requests for those excuse dates. Click a day to toggle it; hold shift to select a range. Days with requests are marked with a count."
      />

      <DayPickerModal
        open={showExcuseDatePicker}
        onClose={() => setShowExcuseDatePicker(false)}
        onDaysChange={(days) => updateAdminField('excuse_date', days[0] || '')}
        selectedDays={adminFormData.excuse_date ? [adminFormData.excuse_date] : []}
        single
        title="Pick excuse date"
        description="Choose the day this excuse applies to."
        counts={{}}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedExcuses.length} request${selectedExcuses.length === 1 ? '' : 's'}`}
        description="Permanently delete the selected excuse requests? This cannot be undone."
        confirmLabel="Delete"
        tone="bad"
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkSaving}
      />
    </>
  )
}
