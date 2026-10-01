import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { roomService } from '../../services/roomService'
import RoomsBatchUploadModal from '../../features/rooms/RoomsBatchUploadModal'
import {
  biArrowRepeat,
  biCloudUpload,
  biDownload,
  biPencil,
  biPlus,
  biPrinter,
  biQRCode,
  biToggleOff,
  biToggleOn,
  biTrash,
} from '../../utils/icons'
import {
  ACTIVE_STATUS,
  ActionButton,
  Alert,
  Button,
  ConfirmDialog,
  DetailList,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  RowActions,
  ScrollX,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
  Textarea,
} from '../../components/ui'

const BLANK_FORM = { room_code: '', room_name: '', building: '', floor: '', description: '' }

const CASCADE_LABELS = {
  schedules: 'schedule',
  occupations: 'occupation',
  submissions: 'room submission',
  reports: 'report',
}

/**
 * Names the rows a room delete takes with it. Everything here references
 * rooms(id) ON DELETE CASCADE, so the counts are exact rather than a warning
 * about "your data". Deactivating the room instead keeps all of this; that is
 * what the room's toggle does.
 */
function CascadeList({ impact }) {
  const destroying = Object.keys(CASCADE_LABELS)
    .map((key) => [key, impact?.[key] ?? 0])
    .filter(([, count]) => count > 0)

  if (destroying.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink-muted">
        This room has no schedules, occupations, submissions or reports, so deleting it takes
        nothing else with it.
      </p>
    )
  }

  return (
    <div className="mt-4 rounded-md border border-bad/30 bg-bad-soft p-3">
      <p className="text-xs font-semibold tracking-wide text-bad uppercase">Also deleted</p>
      <ul className="mt-2 flex flex-col gap-1">
        {destroying.map(([key, count]) => (
          <li key={key} className="text-sm text-ink">
            {count} {CASCADE_LABELS[key]}
            {count === 1 ? '' : 's'}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AdminRooms() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteImpact, setDeleteImpact] = useState(null)
  const [impactLoading, setImpactLoading] = useState(false)
  const [qrRoom, setQrRoom] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(BLANK_FORM)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const response = await roomService.getAll()
      if (response.success) {
        setRooms(response.data)
      } else {
        setError(response.message || 'Failed to load rooms')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    if (!qrRoom) {
      setQrDataUrl('')
      return
    }

    let cancelled = false
    QRCode.toDataURL(`${window.location.origin}/scan/${qrRoom.qr_token}`, { width: 512, margin: 2 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [qrRoom])

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return rooms

    return rooms.filter((room) =>
      [room.room_code, room.room_name, room.building, room.floor]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [rooms, searchTerm])

  function update(field, value) {
    setFormData((previous) => ({ ...previous, [field]: value }))
  }

  function handleOpenAdd() {
    setEditingRoom(null)
    setFormData(BLANK_FORM)
    setError('')
    setShowForm(true)
  }

  function handleOpenEdit(room) {
    setEditingRoom(room)
    setFormData({
      room_code: room.room_code || '',
      room_name: room.room_name || '',
      building: room.building || '',
      floor: room.floor || '',
      description: room.description || '',
    })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = editingRoom
        ? await roomService.update(editingRoom.id, formData)
        : await roomService.create(formData)

      if (!response.success) {
        setError(response.message || 'Failed to save room')
        return
      }

      setShowForm(false)
      await fetchRooms()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save room')
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Opens or closes a room. Deactivating stops students scanning its QR code and
   * removes it from their pickers, but keeps its history.
   *
   * The row updates from the response straight away so the button and the status
   * badge reflect the click immediately, then the list re-syncs. A failure is
   * surfaced rather than swallowed, since a silently unchanged row looks like a
   * dead button.
   */
  async function handleToggleStatus(room) {
    setTogglingId(room.id)
    setError('')

    try {
      const nextActive = !room.is_active
      const response = await roomService.update(room.id, { is_active: nextActive })

      if (!response.success) {
        setError(response.message || 'Failed to update the room')
        return
      }

      setRooms((current) =>
        current.map((item) => (item.id === room.id ? { ...item, ...response.data } : item))
      )
      await fetchRooms()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update the room')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleRegenerateQR(room) {
    try {
      const response = await roomService.regenerateQR(room.id)
      if (response.success) await fetchRooms()
    } catch {
      // Non-critical: the existing QR stays valid.
    }
  }

  /**
   * Opens the confirmation with the cascade cost already counted, so the dialog
   * can name the rows that are about to go rather than gesturing at them.
   */
  async function openDeleteDialog(room) {
    setDeleteTarget(room)
    setDeleteImpact(null)
    setError('')
    setImpactLoading(true)
    try {
      const response = await roomService.getDeleteImpact(room.id)
      if (response.success) {
        setDeleteImpact(response.data)
      } else {
        setError(response.message || 'Could not check what this room owns')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not check what this room owns')
    } finally {
      setImpactLoading(false)
    }
  }

  function closeDeleteDialog() {
    setDeleteTarget(null)
    setDeleteImpact(null)
    setImpactLoading(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      const response = await roomService.delete(deleteTarget.id)
      if (!response.success) {
        setError(response.message || 'Failed to delete room')
        return
      }
      closeDeleteDialog()
      await fetchRooms()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete room')
    } finally {
      setDeleting(false)
    }
  }

  function handleDownloadQR() {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `QR_${qrRoom.room_code}.png`
    link.click()
  }

  return (
    <>
      <PageHeader
        title="Rooms"
        subtitle="Manage classrooms and their QR codes"
        actions={
          <>
            <Button variant="secondary" icon={biCloudUpload} onClick={() => setShowBatchUpload(true)}>
              Batch upload
            </Button>
            <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
              Add room
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
        title="Classrooms"
        subtitle={`${filteredRooms.length} of ${rooms.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search code, name, building…"
        loading={loading}
        isEmpty={filteredRooms.length === 0}
        empty={
          <EmptyState
            icon="bi-door-open"
            title="No rooms found"
            description={
              searchTerm
                ? 'No rooms match your search.'
                : 'Add a classroom to generate its QR code.'
            }
          />
        }
      >
        <ScrollX minW="52rem">
          <Table>
            <THead>
              <tr>
                <TH>Code</TH>
                <TH>Room</TH>
                <TH>Building</TH>
                <TH>Floor</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredRooms.map((room) => (
                <TR key={room.id}>
                  <TD className="tabular font-medium">{room.room_code}</TD>
                  <TD>{room.room_name}</TD>
                  <TD>{room.building || '—'}</TD>
                  <TD className="tabular">{room.floor || '—'}</TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(room.is_active))} />
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for room ${room.room_code}`}>
                      <ActionButton
                        icon={biPencil}
                        label="Edit room"
                        tone="accent"
                        onClick={() => handleOpenEdit(room)}
                      />
                      <ActionButton
                        icon={biQRCode}
                        label="View QR code"
                        onClick={() => setQrRoom(room)}
                      />
                      <ActionButton
                        icon={biArrowRepeat}
                        label="Regenerate QR code"
                        tone="accent"
                        onClick={() => handleRegenerateQR(room)}
                      />
                      <ActionButton
                        icon={room.is_active ? biToggleOff : biToggleOn}
                        label={room.is_active ? 'Deactivate room' : 'Activate room'}
                        tone={room.is_active ? 'bad' : 'ok'}
                        disabled={togglingId === room.id}
                        onClick={() => handleToggleStatus(room)}
                      />
                      <ActionButton
                        icon={biTrash}
                        label="Delete room"
                        tone="bad"
                        onClick={() => openDeleteDialog(room)}
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
        title={editingRoom ? 'Edit room' : 'Add room'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="room-form" loading={submitting}>
              {editingRoom ? 'Update room' : 'Create room'}
            </Button>
          </>
        }
      >
        <form id="room-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {error && <Alert tone="bad">{error}</Alert>}

          <div className="form-grid">
            <Input
              label="Room code"
              required
              value={formData.room_code}
              onChange={(event) => update('room_code', event.target.value)}
              disabled={Boolean(editingRoom)}
              hint={editingRoom ? 'Room code cannot be changed' : undefined}
            />
            <Input
              label="Room name"
              required
              value={formData.room_name}
              onChange={(event) => update('room_name', event.target.value)}
            />
            <Input
              label="Building"
              value={formData.building}
              onChange={(event) => update('building', event.target.value)}
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

      {/* Batch import */}
      <RoomsBatchUploadModal
        open={showBatchUpload}
        onClose={() => setShowBatchUpload(false)}
        onImported={fetchRooms}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete room"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.room_name} (${deleteTarget.room_code})? Its QR code stops working immediately. To close a room without losing its history, use the toggle instead.`
            : ''
        }
        confirmLabel="Delete permanently"
      >
        {impactLoading ? (
          <p className="mt-3 text-sm text-ink-muted">Checking what this room owns…</p>
        ) : (
          deleteImpact && <CascadeList impact={deleteImpact} />
        )}
      </ConfirmDialog>

      {/* QR preview */}
      <Modal
        open={Boolean(qrRoom)}
        onClose={() => setQrRoom(null)}
        title="Room QR code"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setQrRoom(null)}>
              Close
            </Button>
            <Button
              variant="accent-outline"
              icon={biPrinter}
              onClick={() => navigate(`/admin/qr-print/${qrRoom?.id}`)}
            >
              Print sheet
            </Button>
            <Button
              variant="primary"
              icon={biDownload}
              onClick={handleDownloadQR}
              disabled={!qrDataUrl}
            >
              Download
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center">
          <div className="qr-frame mb-5 w-full">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for room ${qrRoom?.room_code}`}
                className="h-auto w-full max-w-64"
              />
            ) : (
              <div className="grid aspect-square w-full max-w-64 place-items-center rounded-md bg-surface-sunken text-sm text-ink-muted">
                Generating…
              </div>
            )}
          </div>

          <DetailList
            columns={1}
            className="w-full text-start"
            items={[
              { label: 'Room', value: qrRoom?.room_name },
              { label: 'Code', value: qrRoom?.room_code },
              { label: 'Location', value: [qrRoom?.building, qrRoom?.floor && `Floor ${qrRoom.floor}`].filter(Boolean).join(', ') },
            ]}
          />
        </div>
      </Modal>
    </>
  )
}

