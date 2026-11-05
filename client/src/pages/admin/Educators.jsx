import { useCallback, useEffect, useMemo, useState } from 'react'
import { educatorService } from '../../services/educatorService'
import EducatorsBatchUploadModal from '../../features/educators/EducatorsBatchUploadModal'
import {
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
  ConfirmDialog,
  Input,
  Modal,
  PageHeader,
  RowActions,
  ActionButton,
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
  EmptyState,
} from '../../components/ui'

const BLANK_FORM = {
  name: '',
  department: '',
}

export default function AdminEducators() {
  const [educators, setEducators] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [editingEducator, setEditingEducator] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [togglingId, setTogglingId] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [formData, setFormData] = useState(BLANK_FORM)

  const fetchEducators = useCallback(async () => {
    setLoading(true)
    try {
      const response = await educatorService.getAll()
      if (response.success) {
        setEducators(response.data)
      } else {
        setError(response.message || 'Failed to load educators')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load educators')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEducators()
  }, [fetchEducators])

  const filteredEducators = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return educators

    return educators.filter((educator) =>
      [educator.name, educator.department].filter(Boolean).some((value) => value.toLowerCase().includes(term))
    )
  }, [educators, searchTerm])

  const activeCount = educators.filter((educator) => educator.is_active).length

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
    setEditingEducator(null)
    setFormData(BLANK_FORM)
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function handleOpenEdit(educator) {
    setEditingEducator(educator)
    setFormData({
      name: educator.name || '',
      department: educator.department || '',
    })
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function validate() {
    const errors = {}
    if (!formData.name.trim()) {
      errors.name = 'Name is required.'
    }
    if (!formData.department.trim()) {
      errors.department = 'Department is required.'
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
      const response = editingEducator
        ? await educatorService.update(editingEducator.id, formData)
        : await educatorService.create(formData)

      if (!response.success) {
        setError(response.message || 'Failed to save educator')
        return
      }

      setShowForm(false)
      await fetchEducators()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save educator')
    } finally {
      setSubmitting(false)
    }
  }

  async function applyStatus(educator, nextActive) {
    setTogglingId(educator.id)
    setError('')

    try {
      const response = await educatorService.update(educator.id, { is_active: nextActive })

      if (!response.success) {
        setError(response.message || 'Failed to update educator')
        return false
      }

      setEducators((current) =>
        current.map((item) => (item.id === educator.id ? { ...item, ...response.data } : item))
      )
      await fetchEducators()
      return true
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update educator')
      return false
    } finally {
      setTogglingId(null)
    }
  }

  /**
   * Deactivating asks first, the same as the delete dialog does: the trash
   * action and this toggle both end at is_active = false, so both confirm
   * before they touch the row. Enabling needs no explanation and goes
   * straight through.
   */
  function handleToggleStatus(educator) {
    if (educator.is_active) {
      setDeactivateTarget(educator)
      return
    }
    applyStatus(educator, true)
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget) return
    const ok = await applyStatus(deactivateTarget, false)
    if (ok) setDeactivateTarget(null)
  }

  function openDeleteDialog(educator) {
    setDeleteTarget(educator)
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
      const response = await educatorService.delete(deleteTarget.id)
      if (!response.success) {
        setError(response.message || 'Failed to delete educator')
        return
      }
      closeDeleteDialog()
      await fetchEducators()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete educator')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Educators"
        subtitle="Manage educators and their departments. Educators are assigned to schedules."
        actions={
          <>
            <Button variant="secondary" icon={biCloudUpload} onClick={() => setShowBatchUpload(true)}>
              Batch upload
            </Button>
            <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
              Add educator
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
          <StatCard className="col-span-2" label="Total educators" value="..." />
          <StatCard className="col-span-2" label="Active" value="..." />
          <StatCard className="col-span-2" label="Inactive" value="..." />
        </BentoGrid>
      ) : (
        <BentoGrid className="mb-6">
          <StatCard
            variant="feature"
            className="col-span-2 row-span-2"
            label="Total educators"
            value={educators.length}
            hint={`${activeCount} active · ${educators.length - activeCount} inactive`}
          />
          <StatCard className="col-span-2" label="Active" value={activeCount} />
          <StatCard className="col-span-2" label="Inactive" value={educators.length - activeCount} />
        </BentoGrid>
      )}

      <TableCard
        title="All educators"
        subtitle={`${filteredEducators.length} of ${educators.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search name, department…"
        loading={loading}
        isEmpty={filteredEducators.length === 0}
        empty={
          <EmptyState
            icon="bi-search"
            title="No educators found"
            description={
              searchTerm
                ? 'No educators match your search.'
                : 'Add your first educator to get started.'
            }
          />
        }
      >
        <ScrollX minW="40rem">
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Department</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredEducators.map((educator) => (
                <TR key={educator.id}>
                  <TD className="font-medium">{educator.name}</TD>
                  <TD>{educator.department}</TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(educator.is_active))} />
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for ${educator.name}`}>
                      <ActionButton
                        icon={biPencil}
                        label="Edit educator"
                        tone="accent"
                        onClick={() => handleOpenEdit(educator)}
                      />
                      <ActionButton
                        icon={educator.is_active ? biToggleOff : biToggleOn}
                        label={
                          educator.is_active
                            ? 'Deactivate educator'
                            : 'Activate educator'
                        }
                        tone={educator.is_active ? 'bad' : 'ok'}
                        disabled={togglingId === educator.id}
                        onClick={() => handleToggleStatus(educator)}
                      />
                      <ActionButton
                        icon={biTrash}
                        label="Delete educator"
                        tone="bad"
                        onClick={() => openDeleteDialog(educator)}
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
        title={editingEducator ? 'Edit educator' : 'Add educator'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="educator-form" loading={submitting}>
              {editingEducator ? 'Update educator' : 'Create educator'}
            </Button>
          </>
        }
      >
        <form id="educator-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {error && <Alert tone="bad">{error}</Alert>}

          <div className="form-grid">
            <Input
              label="Name"
              required
              value={formData.name}
              onChange={(event) => update('name', event.target.value)}
              error={fieldErrors.name}
            />
            <Input
              label="Department"
              required
              value={formData.department}
              onChange={(event) => update('department', event.target.value)}
              error={fieldErrors.department}
            />
          </div>
        </form>
      </Modal>

      {/* Deactivate confirmation — same gate the delete dialog uses, since
          both actions land on is_active = false. */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
        loading={Boolean(togglingId)}
        title="Deactivate educator"
        description={
          deactivateTarget
            ? `Deactivate ${deactivateTarget.name}? They will be removed from the active educator list and can't be assigned to new schedules.`
            : ''
        }
        confirmLabel="Deactivate"
        tone="bad"
      />

      {/* Delete confirmation — a real delete now, not the soft deactivate the
          toggle covers. */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete educator"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.name}? Schedules already assigned to them keep their records but lose the educator link. To only hide them, use the toggle instead.`
            : ''
        }
        confirmLabel="Delete permanently"
        tone="bad"
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Batch upload */}
      <EducatorsBatchUploadModal
        open={showBatchUpload}
        onClose={() => setShowBatchUpload(false)}
        onImported={fetchEducators}
      />
    </>
  )
}
