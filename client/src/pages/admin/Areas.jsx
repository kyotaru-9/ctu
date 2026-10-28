import { useCallback, useEffect, useMemo, useState } from 'react'
import { areaService } from '../../services/areaService'
import {
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
  Textarea,
  EmptyState,
} from '../../components/ui'

const BLANK_FORM = {
  name: '',
  floor: '',
  description: '',
}

export default function AdminAreas() {
  const [areas, setAreas] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [formData, setFormData] = useState(BLANK_FORM)

  const fetchAreas = useCallback(async () => {
    setLoading(true)
    try {
      const response = await areaService.getAll()
      if (response.success) {
        setAreas(response.data)
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

  function update(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
  }

  function handleOpenAdd() {
    setEditingArea(null)
    setFormData(BLANK_FORM)
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
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
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

  function handleToggleStatus(area) {
    applyStatus(area, !area.is_active)
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

  return (
    <>
      <PageHeader
        title="Areas"
        subtitle="Manage cleaning areas with their floor and description. Areas are assigned to sections for rotational cleaning."
        actions={
          <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
            Add area
          </Button>
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
                <TH>Name</TH>
                <TH>Floor</TH>
                <TH>Description</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredAreas.map((area) => (
                <TR key={area.id}>
                  <TD className="font-medium">{area.name}</TD>
                  <TD>{area.floor}</TD>
                  <TD>{area.description}</TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(area.is_active))} />
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for ${area.name}`}>
                      <ActionButton
                        icon={biPencil}
                        label="Edit area"
                        tone="accent"
                        onClick={() => handleOpenEdit(area)}
                      />
                      <ActionButton
                        icon={area.is_active ? biToggleOff : biToggleOn}
                        label={
                          area.is_active
                            ? 'Deactivate area'
                            : 'Activate area'
                        }
                        tone={area.is_active ? 'bad' : 'ok'}
                        disabled={togglingId === area.id}
                        onClick={() => handleToggleStatus(area)}
                      />
                      <ActionButton
                        icon={biTrash}
                        label="Delete area"
                        tone="bad"
                        onClick={() => openDeleteDialog(area)}
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
            />
            <Input
              label="Floor"
              value={formData.floor}
              onChange={(event) => update('floor', event.target.value)}
            />
          </div>

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete area"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        tone="bad"
        onCancel={closeDeleteDialog}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
