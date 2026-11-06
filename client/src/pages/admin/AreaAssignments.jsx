import { useCallback, useEffect, useMemo, useState } from 'react'
import { areaAssignmentService } from '../../services/areaAssignmentService'
import { areaService } from '../../services/areaService'
import { sectionService } from '../../services/sectionService'
import AreaAssignmentsBatchUploadModal from '../../features/assignments/AreaAssignmentsBatchUploadModal'
import {
  biCheckSquare,
  biCloudUpload,
  biPlus,
  biTrash,
} from '../../utils/icons'
import {
  ACTIVE_STATUS,
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Input,
  Modal,
  PageHeader,
  ScrollX,
  Select,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
  EmptyState,
} from '../../components/ui'

const BLANK_FORM = {
  section_id: '',
  area_id: '',
  day_of_week: '',
}

const DAY_LABELS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

export default function AdminAreaAssignments() {
  const [assignments, setAssignments] = useState([])
  const [sections, setSections] = useState([])
  const [areas, setAreas] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formData, setFormData] = useState(BLANK_FORM)

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    try {
      const response = await areaAssignmentService.getAll()
      if (response.success) {
        setAssignments(response.data)
      } else {
        setError(response.message || 'Failed to load assignments')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSections = useCallback(async () => {
    try {
      const response = await sectionService.getAll()
      if (response.success) {
        setSections(response.data.filter(s => s.is_active))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sections')
    }
  }, [])

  const fetchAreas = useCallback(async () => {
    try {
      const response = await areaService.getAll()
      if (response.success) {
        setAreas(response.data.filter(a => a.is_active))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load areas')
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
    fetchSections()
    fetchAreas()
  }, [fetchAssignments, fetchSections, fetchAreas])

  const getSectionLabel = useCallback((sectionId) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return 'Unknown'
    return `${section.program} ${section.year_level}${section.section_name}`
  }, [sections])

  const getAreaLabel = useCallback((areaId) => {
    const area = areas.find(a => a.id === areaId)
    if (!area) return 'Unknown'
    return area.name
  }, [areas])

  const filteredAssignments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return assignments

    return assignments.filter((assignment) => {
      const sectionLabel = getSectionLabel(assignment.section_id)
      const areaLabel = getAreaLabel(assignment.area_id)
      const dayLabel = DAY_LABELS[assignment.day_of_week] || assignment.day_of_week
      return (
        sectionLabel.toLowerCase().includes(term) ||
        areaLabel.toLowerCase().includes(term) ||
        dayLabel.toLowerCase().includes(term)
      )
    })
  }, [assignments, searchTerm, getSectionLabel, getAreaLabel])

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
    setEditingAssignment(null)
    setFormData(BLANK_FORM)
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function handleOpenEdit(assignment) {
    setEditingAssignment(assignment)
    setFormData({
      section_id: assignment.section_id || '',
      area_id: assignment.area_id || '',
      day_of_week: assignment.day_of_week || '',
    })
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function validate() {
    const errors = {}
    if (!formData.section_id) errors.section_id = 'Select a section.'
    if (!formData.area_id) errors.area_id = 'Select an area.'
    if (!formData.day_of_week) errors.day_of_week = 'Select a day.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setError('')

    try {
      const response = editingAssignment
        ? await areaAssignmentService.update(editingAssignment.id, formData)
        : await areaAssignmentService.create(formData)

      if (!response.success) {
        setError(response.message || 'Failed to save assignment')
        return
      }

      setShowForm(false)
      await fetchAssignments()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save assignment')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSelectMode() {
    setSelectMode((on) => {
      if (on) setSelectedIds(new Set())
      return !on
    })
  }

  function toggleAssignmentSelection(id) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedAssignments = assignments.filter((assignment) => selectedIds.has(assignment.id))

  const allVisibleSelected =
    filteredAssignments.length > 0 &&
    filteredAssignments.every((assignment) => selectedIds.has(assignment.id))

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        filteredAssignments.forEach((assignment) => next.delete(assignment.id))
      } else {
        filteredAssignments.forEach((assignment) => next.add(assignment.id))
      }
      return next
    })
  }

  /** Bulk delete — same per-assignment endpoint, run in parallel. */
  async function handleBulkDelete() {
    setBulkSaving(true)
    setError('')
    try {
      const results = await Promise.allSettled(
        selectedAssignments.map((assignment) => areaAssignmentService.delete(assignment.id))
      )
      const failed = results.filter(
        (result) => result.status === 'rejected' || result.value?.success === false
      ).length
      if (failed > 0) {
        setError(`${failed} of ${selectedAssignments.length} assignments could not be deleted.`)
      }
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
      await fetchAssignments()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete assignments')
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Area Assignments"
        subtitle="Assign sections to cleaning areas on specific days. Sections will see their assigned area for the day."
        actions={
          <>
            <Button
              variant={selectMode ? 'primary' : 'secondary'}
              icon={biCheckSquare}
              onClick={toggleSelectMode}
            >
              {selectMode ? 'Done' : 'Select'}
            </Button>
            <Button variant="secondary" icon={biCloudUpload} onClick={() => setShowBatchUpload(true)}>
              Batch upload
            </Button>
            <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
              Add assignment
            </Button>
          </>
        }
      />

      {error && !showForm && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      {selectMode && selectedAssignments.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
          <span className="text-sm font-medium text-ink">{selectedAssignments.length} selected</span>
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
        title="All assignments"
        subtitle={`${filteredAssignments.length} of ${assignments.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search section, area, day…"
        loading={loading}
        isEmpty={filteredAssignments.length === 0}
        empty={
          <EmptyState
            icon="bi-calendar"
            title="No assignments found"
            description={
              searchTerm
                ? 'No assignments match your search.'
                : 'Assign sections to areas to get started with rotational cleaning.'
            }
          />
        }
      >
        <ScrollX minW="50rem">
          <Table>
            <THead>
              <tr>
                {selectMode && (
                  <TH className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all assignments"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                    />
                  </TH>
                )}
                <TH>Section</TH>
                <TH>Area</TH>
                <TH>Day</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {filteredAssignments.map((assignment) => (
                <TR
                  key={assignment.id}
                  className={selectMode ? undefined : 'cursor-pointer'}
                  title={selectMode ? undefined : 'Edit assignment'}
                  onClick={() =>
                    selectMode ? toggleAssignmentSelection(assignment.id) : handleOpenEdit(assignment)
                  }
                >
                  {selectMode && (
                    <TD onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select assignment ${assignment.id}`}
                        checked={selectedIds.has(assignment.id)}
                        onChange={() => toggleAssignmentSelection(assignment.id)}
                        className="h-4 w-4 rounded-xs border-line-strong accent-accent"
                      />
                    </TD>
                  )}
                  <TD className="font-medium">{getSectionLabel(assignment.section_id)}</TD>
                  <TD>{getAreaLabel(assignment.area_id)}</TD>
                  <TD>
                    <Badge tone="info">{DAY_LABELS[assignment.day_of_week] || assignment.day_of_week}</Badge>
                  </TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(assignment.is_active))} />
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
        title={editingAssignment ? 'Edit assignment' : 'Add assignment'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="assignment-form" loading={submitting}>
              {editingAssignment ? 'Update assignment' : 'Create assignment'}
            </Button>
          </>
        }
      >
        <form id="assignment-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {error && <Alert tone="bad">{error}</Alert>}

          <div className="form-grid">
            <Select
              label="Section"
              required
              value={formData.section_id}
              onChange={(event) => update('section_id', event.target.value)}
              error={fieldErrors.section_id}
            >
              <option value="">Select section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.program} {section.year_level}{section.section_name}
                </option>
              ))}
            </Select>

            <Select
              label="Area"
              required
              value={formData.area_id}
              onChange={(event) => update('area_id', event.target.value)}
              error={fieldErrors.area_id}
            >
              <option value="">Select area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} ({area.floor})
                </option>
              ))}
            </Select>

            <Select
              label="Day of Week"
              required
              value={formData.day_of_week}
              onChange={(event) => update('day_of_week', event.target.value)}
              error={fieldErrors.day_of_week}
              className="col-span-2"
            >
              <option value="">Select day</option>
              {Object.entries(DAY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </form>
      </Modal>

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedAssignments.length} assignment${selectedAssignments.length === 1 ? '' : 's'}`}
        description="Permanently delete the selected assignments? Sections will stop seeing these areas on those days. This cannot be undone."
        confirmLabel="Delete"
        tone="bad"
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkSaving}
      />

      {/* Batch upload */}
      <AreaAssignmentsBatchUploadModal
        open={showBatchUpload}
        onClose={() => setShowBatchUpload(false)}
        onImported={fetchAssignments}
        sections={sections}
        areas={areas}
      />
    </>
  )
}
