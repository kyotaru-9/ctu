import { useCallback, useEffect, useMemo, useState } from 'react'
import { areaService } from '../../services/areaService'
import AreasBatchUploadModal from '../../features/areas/AreasBatchUploadModal'
import AuditLogCalendar from '../../features/audit/AuditLogCalendar'
import { formatDate } from '../../lib/format'
import {
  biCalendar,
  biCheckSquare,
  biCloudUpload,
  biPencil,
  biPlus,
  biToggleOff,
  biToggleOn,
  biTrash,
} from '../../utils/icons'
import {
  ACTIVE_STATUS,
  Alert,
  Badge,
  BentoGrid,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  ScrollX,
  Select,
  StatCard,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
  Textarea,
  EmptyState,
} from '../../components/ui'

const BLANK_FORM = {
  name: '',
  floor: '',
  description: '',
}

const FLOOR_OPTIONS = [
  { value: 'First Floor', label: 'First Floor' },
  { value: 'Second Floor', label: 'Second Floor' },
  { value: 'Third Floor', label: 'Third Floor' },
  { value: 'All Floor', label: 'All Floor' },
]

const DAY_LABELS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

const CLEANING_STATUS = {
  pending: { label: 'Pending', tone: 'warn' },
  completed: { label: 'Completed', tone: 'ok' },
}

export default function AdminAreas() {
  const [areas, setAreas] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [togglingId, setTogglingId] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [formData, setFormData] = useState(BLANK_FORM)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkFloorOpen, setBulkFloorOpen] = useState(false)
  const [bulkFloor, setBulkFloor] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkDisableOpen, setBulkDisableOpen] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState(null)
  const [viewStats, setViewStats] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const [statsDate, setStatsDate] = useState(null)
  const [showStatsDayPicker, setShowStatsDayPicker] = useState(false)
  const [statsCalendarMonth, setStatsCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const fetchAreas = useCallback(async () => {
    setLoading(true)
    try {
      const response = await areaService.getAll()
      if (response.success) {
        setAreas(response.data)
        setSelectedIds((current) => {
          const alive = new Set(response.data.map((area) => area.id))
          return new Set([...current].filter((id) => alive.has(id)))
        })
        return response.data
      } else {
        setError(response.message || 'Failed to load areas')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load areas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  const filteredAreas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return areas

    return areas.filter((area) =>
      [area.name, area.floor, area.description].filter(Boolean).some((value) => value.toLowerCase().includes(term))
    )
  }, [areas, searchTerm])

  const activeCount = areas.filter((area) => area.is_active).length

  function toggleSelectMode() {
    setSelectMode((on) => {
      if (on) setSelectedIds(new Set())
      return !on
    })
  }

  function toggleRowSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allVisibleSelected =
    filteredAreas.length > 0 && filteredAreas.every((area) => selectedIds.has(area.id))

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        filteredAreas.forEach((area) => next.delete(area.id))
      } else {
        filteredAreas.forEach((area) => next.add(area.id))
      }
      return next
    })
  }

  function update(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
    setFieldErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  function handleOpenAdd() {
    setEditingArea(null)
    setFormData(BLANK_FORM)
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function handleOpenEdit(area) {
    setEditingArea(area)
    setFormData({
      name: area.name || '',
      floor: area.floor || '',
      description: area.description || '',
    })
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function validate() {
    const errors = {}
    if (!formData.name.trim()) {
      errors.name = 'Area name is required.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setError('')

    try {
      const response = editingArea
        ? await areaService.update(editingArea.id, formData)
        : await areaService.create(formData)

      if (!response.success) {
        setError(response.message || 'Failed to save area')
        return
      }

      setShowForm(false)
      await fetchAreas()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save area')
    } finally {
      setSubmitting(false)
    }
  }

  async function applyStatus(area, nextActive) {
    setTogglingId(area.id)
    setError('')

    try {
      const response = await areaService.update(area.id, { is_active: nextActive })

      if (!response.success) {
        setError(response.message || 'Failed to update area')
        return false
      }

      setAreas((current) =>
        current.map((item) => (item.id === area.id ? { ...item, ...response.data } : item))
      )
      await fetchAreas()
      return true
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update area')
      return false
    } finally {
      setTogglingId(null)
    }
  }

  /**
   * Deactivating asks first, matching the delete dialog: both actions end at
   * is_active = false. Enabling goes straight through.
   */
  function handleToggleStatus(area) {
    if (area.is_active) {
      setDeactivateTarget(area)
      return
    }
    applyStatus(area, true)
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget) return
    const ok = await applyStatus(deactivateTarget, false)
    if (ok) setDeactivateTarget(null)
  }

  function openDeleteDialog(area) {
    setDeleteTarget(area)
    setError('')
  }

  function closeDeleteDialog() {
    setDeleteTarget(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      const response = await areaService.delete(deleteTarget.id)
      if (!response.success) {
        setError(response.message || 'Failed to delete area')
        return
      }
      closeDeleteDialog()
      await fetchAreas()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete area')
    } finally {
      setDeleting(false)
    }
  }

  /**
   * Opens the overview modal on the row it was clicked from, then fills in the
   * aggregated stats — the same open-then-load pattern the room and section
   * overviews use.
   */
  async function openView(area) {
    setViewTarget(area)
    setViewStats(null)
    setViewError('')
    setStatsDate(null)
    setViewLoading(true)
    try {
      const response = await areaService.getStats(area.id)
      if (response.success) {
        setViewStats(response.data)
      } else {
        setViewError(response.message || 'Failed to load area stats')
      }
    } catch (err) {
      setViewError(err.response?.data?.message || 'Failed to load area stats')
    } finally {
      setViewLoading(false)
    }
  }

  /**
   * Refetches the overview scoped to one day. Assignments are a weekly
   * schedule, so the server leaves them unfiltered — only cleaning records,
   * excuses and exemptions narrow to the picked date.
   */
  async function applyStatsDate(day) {
    if (!viewTarget) return
    setStatsDate(day)
    setViewStats(null)
    setViewError('')
    setViewLoading(true)
    try {
      const response = await areaService.getStats(viewTarget.id, { date: day })
      if (response.success) {
        setViewStats(response.data)
      } else {
        setViewError(response.message || 'Failed to load area stats')
      }
    } catch (err) {
      setViewError(err.response?.data?.message || 'Failed to load area stats')
    } finally {
      setViewLoading(false)
    }
  }

  function clearStatsDate() {
    setStatsDate(null)
    if (viewTarget) openView(viewTarget)
  }

  function closeView() {
    setViewTarget(null)
    setViewStats(null)
    setViewError('')
    setViewLoading(false)
    setStatsDate(null)
    setShowStatsDayPicker(false)
  }

  const selectedAreas = areas.filter((area) => selectedIds.has(area.id))

  /**
   * Runs one update against every selected area and reports how many failed.
   * Selection is cleared afterwards either way — a partial failure is surfaced
   * through the error alert and the list re-syncs from the server.
   */
  async function runBulkUpdate(patch, failureMessage) {
    setBulkSaving(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        selectedAreas.map((area) => areaService.update(area.id, patch))
      )
      const failed = results.filter(
        (result) => result.status === 'rejected' || result.value?.success === false
      ).length
      if (failed > 0) {
        setError(`${failed} of ${results.length} areas could not be updated. ${failureMessage}`)
      }
      setSelectedIds(new Set())
      await fetchAreas()
      return failed === 0
    } catch (err) {
      setError(err.response?.data?.message || failureMessage)
      return false
    } finally {
      setBulkSaving(false)
    }
  }

  async function handleBulkFloor() {
    const ok = await runBulkUpdate(
      { floor: bulkFloor || null },
      'Failed to update the floor'
    )
    if (ok) {
      setBulkFloorOpen(false)
      setBulkFloor('')
    }
  }

  async function handleBulkDisable() {
    const ok = await runBulkUpdate({ is_active: false }, 'Failed to disable areas')
    if (ok) setBulkDisableOpen(false)
  }

  async function handleBulkDelete() {
    setBulkSaving(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        selectedAreas.map((area) => areaService.delete(area.id))
      )
      const failed = results.filter(
        (result) => result.status === 'rejected' || result.value?.success === false
      ).length
      if (failed > 0) {
        setError(`${failed} of ${results.length} areas could not be deleted.`)
      }
      setSelectedIds(new Set())
      await fetchAreas()
      if (failed === 0) setBulkDeleteOpen(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete areas')
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Areas"
        subtitle="Manage cleaning areas with their floor and description. Areas are assigned to sections for rotational cleaning."
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
              icon={biCloudUpload}
              onClick={() => setShowBatchUpload(true)}
            >
              Batch upload
            </Button>
            <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
              Add area
            </Button>
          </>
        }
      />

      {error && !showForm && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      {loading ? (
        <BentoGrid className="mb-6">
          <StatCard className="col-span-2" label="Total areas" value="..." />
          <StatCard className="col-span-2" label="Active" value="..." />
          <StatCard className="col-span-2" label="Inactive" value="..." />
        </BentoGrid>
      ) : (
        <BentoGrid className="mb-6">
          <StatCard
            variant="feature"
            className="col-span-2 row-span-2"
            label="Total areas"
            value={areas.length}
            hint={`${activeCount} active · ${areas.length - activeCount} inactive`}
          />
          <StatCard className="col-span-2" label="Active" value={activeCount} />
          <StatCard className="col-span-2" label="Inactive" value={areas.length - activeCount} />
        </BentoGrid>
      )}

      {selectMode && selectedAreas.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
          <span className="text-sm font-medium text-ink">{selectedAreas.length} selected</span>
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              selectedAreas.length === 1
                ? handleOpenEdit(selectedAreas[0])
                : setBulkFloorOpen(true)
            }
          >
            {selectedAreas.length === 1 ? 'Edit area' : 'Edit floor'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={biToggleOff}
            onClick={() => setBulkDisableOpen(true)}
          >
            Disable
          </Button>
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
        title="All areas"
        subtitle={`${filteredAreas.length} of ${areas.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search name, floor, description…"
        loading={loading}
        isEmpty={filteredAreas.length === 0}
        empty={
          <EmptyState
            icon="bi-search"
            title="No areas found"
            description={
              searchTerm
                ? 'No areas match your search.'
                : 'Add your first cleaning area to get started.'
            }
          />
        }
      >
        <ScrollX minW="40rem">
          <Table>
            <THead>
              <tr>
                {selectMode && (
                  <TH className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all areas"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                    />
                  </TH>
                )}
                <TH>Name</TH>
                <TH>Floor</TH>
                <TH>Description</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {filteredAreas.map((area) => (
                <TR
                  key={area.id}
                  className="cursor-pointer"
                  title={selectMode ? undefined : 'View area overview'}
                  onClick={() => (selectMode ? toggleRowSelection(area.id) : openView(area))}
                >
                  {selectMode && (
                    <TD onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select area ${area.name}`}
                        checked={selectedIds.has(area.id)}
                        onChange={() => toggleRowSelection(area.id)}
                        className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                      />
                    </TD>
                  )}
                  <TD className="font-medium">{area.name}</TD>
                  <TD>{area.floor}</TD>
                  <TD>{area.description}</TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(area.is_active))} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ScrollX>
      </TableCard>

      {/* Add / edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingArea ? 'Edit area' : 'Add area'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="area-form" loading={submitting}>
              {editingArea ? 'Update area' : 'Create area'}
            </Button>
          </>
        }
      >
        <form id="area-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {error && <Alert tone="bad">{error}</Alert>}

          <div className="form-grid">
            <Input
              label="Name"
              required
              value={formData.name}
              onChange={(event) => update('name', event.target.value)}
              error={fieldErrors.name}
            />
            <Select
              label="Floor"
              value={formData.floor}
              onChange={(event) => update('floor', event.target.value)}
              placeholder="Select floor"
              options={FLOOR_OPTIONS}
            />
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </form>
      </Modal>

      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
        loading={Boolean(togglingId)}
        title="Deactivate area"
        description={
          deactivateTarget
            ? `Deactivate ${deactivateTarget.name}? It will be hidden from assignment pickers until reactivated.`
            : ''
        }
        confirmLabel="Deactivate"
        tone="bad"
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete area"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        tone="bad"
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Bulk edit floor */}
      <Modal
        open={bulkFloorOpen}
        onClose={() => setBulkFloorOpen(false)}
        title={`Edit floor — ${selectedAreas.length} area${selectedAreas.length === 1 ? '' : 's'}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBulkFloorOpen(false)}
              disabled={bulkSaving}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleBulkFloor} loading={bulkSaving}>
              Apply floor
            </Button>
          </>
        }
      >
        <div className="form-stack">
          <p className="text-sm text-ink-muted">
            Every selected area gets the same floor. Leave it empty to clear the floor.
          </p>
          <Select
            label="Floor"
            value={bulkFloor}
            onChange={(event) => setBulkFloor(event.target.value)}
            placeholder="Clear floor"
            options={FLOOR_OPTIONS}
          />
        </div>
      </Modal>

      {/* Bulk disable */}
      <ConfirmDialog
        open={bulkDisableOpen}
        onClose={() => setBulkDisableOpen(false)}
        onConfirm={handleBulkDisable}
        loading={bulkSaving}
        title="Disable areas"
        description={`Deactivate ${selectedAreas.length} area${selectedAreas.length === 1 ? '' : 's'}? They will be hidden from assignment pickers until reactivated.`}
        confirmLabel="Disable"
        tone="bad"
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkSaving}
        title={selectedAreas.length === 1 ? 'Delete area' : 'Delete areas'}
        description={
          selectedAreas.length === 1
            ? `Are you sure you want to delete ${selectedAreas[0]?.name}? This action cannot be undone.`
            : `Permanently delete ${selectedAreas.length} areas? This action cannot be undone.`
        }
        confirmLabel="Delete permanently"
        tone="bad"
      />

      {/* Batch import */}
      <AreasBatchUploadModal
        open={showBatchUpload}
        onClose={() => setShowBatchUpload(false)}
        onImported={fetchAreas}
      />

      {/* Day picker for the overview stats — same calendar the audit log
          browser uses. No per-day counts here: the stats endpoint only returns
          aggregates, so days are pickable but unmarked. */}
      <Modal
        open={showStatsDayPicker}
        onClose={() => setShowStatsDayPicker(false)}
        title="Filter overview by date"
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setShowStatsDayPicker(false)}>
            Cancel
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Pick a day to count only that day&apos;s cleaning records, excuses and exemptions.
          </p>

          <AuditLogCalendar
            month={statsCalendarMonth}
            onMonthChange={setStatsCalendarMonth}
            counts={{}}
            selected={[]}
            onSelect={() => {}}
            onPickDay={(day) => {
              setShowStatsDayPicker(false)
              applyStatsDate(day)
            }}
          />
        </div>
      </Modal>

      {/* Area overview */}
      <Modal
        open={Boolean(viewTarget)}
        onClose={closeView}
        title={viewTarget ? `Area overview — ${viewTarget.name}` : 'Area overview'}
        size="lg"
        bodyClassName="no-scrollbar"
        footer={
          viewTarget && (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={biTrash}
                onClick={() => {
                  const area = viewTarget
                  closeView()
                  openDeleteDialog(area)
                }}
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={viewTarget.is_active ? biToggleOff : biToggleOn}
                onClick={() => {
                  const area = viewTarget
                  closeView()
                  handleToggleStatus(area)
                }}
              >
                {viewTarget.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={biPencil}
                onClick={() => {
                  const area = viewTarget
                  closeView()
                  handleOpenEdit(area)
                }}
              >
                Edit
              </Button>
            </>
          )
        }
      >
        {viewTarget && (
          <div className="flex flex-col gap-4">
            {viewError && (
              <Alert tone="bad" onDismiss={() => setViewError('')}>
                {viewError}
              </Alert>
            )}

            {viewLoading && <LoadingBlock label="Loading area stats…" compact />}

            {viewStats && !viewLoading && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    icon={biCalendar}
                    onClick={() => setShowStatsDayPicker(true)}
                  >
                    {statsDate ? 'Change date' : 'Filter by date'}
                  </Button>
                  {statsDate && (
                    <Button variant="ghost" size="xs" onClick={clearStatsDate}>
                      Clear · {formatDate(statsDate)}
                    </Button>
                  )}
                </div>

                {statsDate && (
                  <Alert tone="info">
                    Cleaning records, excuses and exemptions are counted for{' '}
                    {formatDate(statsDate)} only. Assignments are a weekly schedule and stay
                    unfiltered.
                  </Alert>
                )}

                <div className="flex min-w-0 flex-col justify-between gap-5 rounded-lg border border-line bg-surface p-5 shadow-xs sm:p-6">
                  <p className="text-pretty text-xs leading-tight font-medium tracking-wide text-ink-muted uppercase">
                    Area
                  </p>
                  <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-[7fr_3fr]">
                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <p className="tabular text-3xl leading-tight font-semibold tracking-tight text-ink sm:text-4xl">
                        {viewTarget.name}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {[viewTarget.floor, viewTarget.description]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-center justify-center border-line sm:border-l sm:pl-6">
                      <div className="text-center">
                        {viewStats.cleanliness === 'clean' ? (
                          <>
                            <p className="text-2xl font-semibold text-ok sm:text-3xl">Clean</p>
                            <p className="mt-1 text-sm text-ink-muted">
                              {viewStats.lastCleanedAt
                                ? `Last cleaned ${formatDate(viewStats.lastCleanedAt)}`
                                : '—'}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-2xl font-semibold text-bad sm:text-3xl">Unclean</p>
                            <p className="mt-1 text-sm text-ink-muted">
                              No completed cleaning yet
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <BentoGrid cols={2}>
                  <StatCard
                    label="Assignments"
                    value={viewStats.assignments.total}
                    hint={
                      Object.keys(viewStats.assignments.byDay)
                        .sort((a, b) => a - b)
                        .map((day) => DAY_LABELS[day] ?? day)
                        .join(' · ') || 'none scheduled'
                    }
                  />
                  <StatCard
                    label="Cleaning records"
                    value={viewStats.cleaning.total}
                    hint={
                      Object.entries(viewStats.cleaning.byStatus)
                        .map(([status, count]) => `${count} ${status}`)
                        .join(' · ') || 'none yet'
                    }
                  />
                  <StatCard
                    label="Excuse requests"
                    value={viewStats.excuses.total}
                    hint={
                      Object.entries(viewStats.excuses.byStatus)
                        .map(([status, count]) => `${count} ${status}`)
                        .join(' · ') || 'none filed'
                    }
                  />
                  <StatCard
                    label="Exemption days"
                    value={viewStats.exemptions.total}
                    hint={
                      Object.entries(viewStats.exemptions.byType)
                        .map(([type, count]) => `${count} ${type}`)
                        .join(' · ') || 'none scheduled'
                    }
                  />
                </BentoGrid>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Assignments ({viewStats.assignments.total})
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      {viewStats.assignments.list.length === 0 ? (
                        <p className="py-4 text-center text-sm text-ink-muted">
                          No active assignments for this area.
                        </p>
                      ) : (
                        <ScrollX minW="24rem">
                          <Table>
                            <THead>
                              <tr>
                                <TH>Day</TH>
                                <TH>Section</TH>
                              </tr>
                            </THead>
                            <TBody>
                              {viewStats.assignments.list.map((assignment) => (
                                <TR key={assignment.id}>
                                  <TD>{DAY_LABELS[assignment.day_of_week] ?? assignment.day_of_week}</TD>
                                  <TD>
                                    {assignment.section
                                      ? `${assignment.section.program} ${assignment.section.year_level}${assignment.section.section_name}`
                                      : '—'}
                                  </TD>
                                </TR>
                              ))}
                            </TBody>
                          </Table>
                        </ScrollX>
                      )}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Cleaning records ({viewStats.cleaning.total})
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      {viewStats.cleaning.records.length === 0 ? (
                        <p className="py-4 text-center text-sm text-ink-muted">
                          No cleaning records for this area yet.
                        </p>
                      ) : (
                        <ScrollX minW="24rem">
                          <Table>
                            <THead>
                              <tr>
                                <TH>Date</TH>
                                <TH>Section</TH>
                                <TH>Status</TH>
                              </tr>
                            </THead>
                            <TBody>
                              {viewStats.cleaning.records.map((record) => (
                                <TR key={record.id}>
                                  <TD className="whitespace-nowrap">
                                    {formatDate(record.submitted_at)}
                                  </TD>
                                  <TD>
                                    {record.section
                                      ? `${record.section.program} ${record.section.year_level}${record.section.section_name}`
                                      : '—'}
                                  </TD>
                                  <TD>
                                    <StatusBadge
                                      map={CLEANING_STATUS}
                                      value={record.status}
                                    />
                                  </TD>
                                </TR>
                              ))}
                            </TBody>
                          </Table>
                        </ScrollX>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
