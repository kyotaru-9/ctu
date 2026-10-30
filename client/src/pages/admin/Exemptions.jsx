import { useCallback, useEffect, useMemo, useState } from 'react'
import { exemptionService } from '../../services/exemptionService'
import { formatDate, sectionLabel } from '../../lib/format'
import {
  ActionButton,
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  RowActions,
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
} from '../../components/ui'

const EXEMPTION_TYPES = [
  { value: 'all_day', label: 'All Day' },
  { value: 'room_schedule', label: 'Room Schedule' },
  { value: 'area_assignment', label: 'Area Assignment' },
]

const EXEMPTION_STATUS = {
  active: { text: 'Active', tone: 'ok' },
  inactive: { text: 'Inactive', tone: 'muted' },
}

export default function AdminExemptions() {
  const [exemptions, setExemptions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    exemption_date: '',
    exemption_type: 'all_day',
    section_id: '',
    room_id: '',
    area_id: '',
    schedule_id: '',
    reason: '',
  })

  const fetchExemptions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await exemptionService.getAll()
      if (response.success) {
        setExemptions(response.data)
      } else {
        setError(response.message || 'Failed to load exemptions')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exemptions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExemptions()
  }, [fetchExemptions])

  const filteredExemptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return exemptions

    return exemptions.filter((exemption) =>
      [exemption.reason, exemption.section?.section_name, exemption.room?.room_code]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [exemptions, searchTerm])

  const openModal = useCallback(() => {
    setFormData({
      exemption_date: new Date().toISOString().split('T')[0],
      exemption_type: 'all_day',
      section_id: '',
      room_id: '',
      area_id: '',
      schedule_id: '',
      reason: '',
    })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setSelected(null)
    setFormData({
      exemption_date: '',
      exemption_type: 'all_day',
      section_id: '',
      room_id: '',
      area_id: '',
      schedule_id: '',
      reason: '',
    })
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = selected
        ? await exemptionService.update(selected.id, formData)
        : await exemptionService.create(formData)

      if (response.success) {
        await fetchExemptions()
        closeModal()
      } else {
        setError(response.message || 'Failed to save exemption')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save exemption')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(exemption) {
    setSaving(true)
    setError('')
    try {
      const response = await exemptionService.delete(exemption.id)
      if (response.success) {
        await fetchExemptions()
        setDeleteConfirm(null)
      } else {
        setError(response.message || 'Failed to delete exemption')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete exemption')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Exemption Days"
        subtitle="Manage days where submissions are not required"
        actions={
          <Button variant="primary" onClick={openModal}>
            + Add Exemption
          </Button>
        }
      />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <TableCard
        title="All exemptions"
        subtitle={`${filteredExemptions.length} of ${exemptions.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search reason, section, room…"
        loading={loading}
        isEmpty={filteredExemptions.length === 0}
        empty={
          <EmptyState
            icon="bi-calendar-x"
            title="No exemptions found"
            description={
              searchTerm ? 'No exemptions match your search.' : 'No exemption days have been created.'
            }
          />
        }
      >
        <ScrollX minW="54rem">
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
              {filteredExemptions.map((exemption) => (
                <TR key={exemption.id}>
                  <TD className="whitespace-nowrap">{formatDate(exemption.exemption_date)}</TD>
                  <TD>
                    {EXEMPTION_TYPES.find((t) => t.value === exemption.exemption_type)?.label || '—'}
                  </TD>
                  <TD className="font-medium">{sectionLabel(exemption.section) || 'All'}</TD>
                  <TD>
                    {exemption.room?.room_code || exemption.area?.area_name || exemption.schedule?.subject_name || '—'}
                  </TD>
                  <TD className="max-w-xs truncate">{exemption.reason}</TD>
                  <TD>
                    <StatusBadge map={EXEMPTION_STATUS} value={exemption.is_active ? 'active' : 'inactive'} />
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for exemption ${exemption.id}`}>
                      <ActionButton
                        text="Edit"
                        label="Edit exemption"
                        tone="accent"
                        onClick={() => {
                          setSelected(exemption)
                          setFormData({
                            exemption_date: exemption.exemption_date,
                            exemption_type: exemption.exemption_type,
                            section_id: exemption.section_id || '',
                            room_id: exemption.room_id || '',
                            area_id: exemption.area_id || '',
                            schedule_id: exemption.schedule_id || '',
                            reason: exemption.reason,
                          })
                          setModalOpen(true)
                        }}
                      />
                      <ActionButton
                        text="Delete"
                        label="Delete exemption"
                        tone="bad"
                        onClick={() => setDeleteConfirm(exemption)}
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
        open={modalOpen}
        onClose={closeModal}
        title={selected ? 'Edit Exemption' : 'Add Exemption'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={saving}>
              {selected ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Exemption Date"
            type="date"
            value={formData.exemption_date}
            onChange={(event) => setFormData({ ...formData, exemption_date: event.target.value })}
            required
          />

          <Field
            label="Exemption Type"
            component={Select}
            options={EXEMPTION_TYPES}
            value={formData.exemption_type}
            onChange={(value) => setFormData({ ...formData, exemption_type: value })}
            required
          />

          <Field
            label="Reason"
            type="textarea"
            value={formData.reason}
            onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
            placeholder="Explain why this day is exempted…"
            rows={3}
            required
          />

          <p className="text-xs text-ink-muted">
            Section, room, area, and schedule can be left blank to apply the exemption to all.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        title="Delete exemption"
        message={`Are you sure you want to delete the exemption for ${formatDate(deleteConfirm?.exemption_date)}? This action cannot be undone.`}
        onConfirm={() => handleDelete(deleteConfirm)}
        loading={saving}
      />
    </>
  )
}
