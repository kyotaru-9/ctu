import { useCallback, useEffect, useMemo, useState } from 'react'
import { areaAssignmentService } from '../../services/areaAssignmentService'
import { areaService } from '../../services/areaService'
import { sectionService } from '../../services/sectionService'
import AreaAssignmentsBatchUploadModal from '../../features/assignments/AreaAssignmentsBatchUploadModal'
import {
  biCloudUpload,
  biPencil,
  biPlus,
  biTrash,
} from '../../utils/icons'
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  Input,
  Modal,
  PageHeader,
  RowActions,
  ActionButton,
  ScrollX,
  Select,
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
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
      console.error('Failed to load sections:', err)
    }
  }, [])

  const fetchAreas = useCallback(async () => {
    try {
      const response = await areaService.getAll()
      if (response.success) {
        setAreas(response.data.filter(a => a.is_active))
      }
    } catch (err) {
      console.error('Failed to load areas:', err)
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
  }

  function handleOpenAdd() {
    setEditingAssignment(null)
    setFormData(BLANK_FORM)
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
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
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

  function openDeleteDialog(assignment) {
    setDeleteTarget(assignment)
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
      const response = await areaAssignmentService.delete(deleteTarget.id)
      if (!response.success) {
        setError(response.message || 'Failed to delete assignment')
        return
      }
      closeDeleteDialog()
      await fetchAssignments()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete assignment')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Area Assignments"
        subtitle="Assign sections to cleaning areas on specific days. Sections will see their assigned area for the day."
        actions={
          <>
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
                <TH>Section</TH>
                <TH>Area</TH>
                <TH>Day</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredAssignments.map((assignment) => (
                <TR key={assignment.id}>
                  <TD className="font-medium">{getSectionLabel(assignment.section_id)}</TD>
                  <TD>{getAreaLabel(assignment.area_id)}</TD>
                  <TD>
                    <Badge tone="info">{DAY_LABELS[assignment.day_of_week] || assignment.day_of_week}</Badge>
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for assignment`}>
                      <ActionButton
                        icon={biPencil}
                        label="Edit assignment"
                        tone="accent"
                        onClick={() => handleOpenEdit(assignment)}
                      />
                      <ActionButton
                        icon={biTrash}
                        label="Delete assignment"
                        tone="bad"
                        onClick={() => openDeleteDialog(assignment)}
                      />
                    </RowActions>
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

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete assignment"
        message={`Are you sure you want to delete this assignment? This action cannot be undone.`}
        confirmLabel="Delete"
        tone="bad"
        onCancel={closeDeleteDialog}
        onConfirm={handleDelete}
        loading={deleting}
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
