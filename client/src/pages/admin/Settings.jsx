import { useCallback, useEffect, useState } from 'react'
import { reportService } from '../../services/reportService'
import AuditLogCleanupModal from '../../features/audit/AuditLogCleanupModal'
import { biCheck, biPencil, biPlus, biToggleOff, biToggleOn, biTrash, biX } from '../../utils/icons'
import {
  ActionButton,
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  PageHeader,
  SkeletonText,
  Switch,
} from '../../components/ui'

const SECURITY_DEFAULTS = {
  requireQr: true,
  allowManualTime: true,
  preventDuplicates: true,
  requireImageProof: true,
  enableNotifications: true,
}

export default function AdminSettings() {
  const [reportReasons, setReportReasons] = useState([])
  const [loadingReasons, setLoadingReasons] = useState(true)
  const [newReason, setNewReason] = useState('')
  const [editingReason, setEditingReason] = useState(null)
  const [editReasonName, setEditReasonName] = useState('')
  const [editReasonDescription, setEditReasonDescription] = useState('')
  const [togglingReasonId, setTogglingReasonId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showAuditCleanup, setShowAuditCleanup] = useState(false)

  const [security, setSecurity] = useState(SECURITY_DEFAULTS)

  const fetchReasons = useCallback(async () => {
    setLoadingReasons(true)
    try {
      const response = await reportService.getReasons()
      if (response.success) setReportReasons(response.data)
    } catch {
      // Leave the list empty; the empty state explains it.
    } finally {
      setLoadingReasons(false)
    }
  }, [])

  useEffect(() => {
    fetchReasons()
  }, [fetchReasons])

  function updateSecurity(field, value) {
    setSecurity((previous) => ({ ...previous, [field]: value }))
  }

  async function handleAddReason() {
    const name = newReason.trim()
    if (!name) return

    setError('')
    setBusy(true)
    try {
      const response = await reportService.createReason({ name })
      if (response.success) {
        setReportReasons((previous) => [...previous, response.data])
        setNewReason('')
      } else {
        setError(response.message || 'Failed to add reason')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add reason')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit() {
    const name = editReasonName.trim()
    if (!editingReason || !name) return

    setError('')
    setBusy(true)
    try {
      const response = await reportService.updateReason(editingReason.id, {
        name,
        description: editReasonDescription.trim() || null,
      })
      if (response.success) {
        setReportReasons((previous) =>
          previous.map((reason) => (reason.id === editingReason.id ? response.data : reason))
        )
        setEditingReason(null)
        setEditReasonName('')
        setEditReasonDescription('')
      } else {
        setError(response.message || 'Failed to update reason')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update reason')
    } finally {
      setBusy(false)
    }
  }

  /**
   * Shows or hides a reason in the student report form. Deactivating keeps the
   * row so reports that already point at it still resolve a name; the delete
   * dialog is what removes it entirely when nothing references it.
   */
  async function handleToggleReason(reason) {
    setError('')
    setTogglingReasonId(reason.id)
    try {
      const response = await reportService.updateReason(reason.id, {
        is_active: !reason.is_active,
      })
      if (response.success) {
        setReportReasons((previous) =>
          previous.map((item) => (item.id === reason.id ? response.data : item))
        )
      } else {
        setError(response.message || 'Failed to update reason')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update reason')
    } finally {
      setTogglingReasonId(null)
    }
  }

  async function handleDeleteReason() {
    if (!deleteTarget) return

    setError('')
    setBusy(true)
    try {
      const response = await reportService.deleteReason(deleteTarget.id)
      if (response.success) {
        setReportReasons((previous) => previous.filter((reason) => reason.id !== deleteTarget.id))
      } else {
        setError(response.message || 'Failed to delete reason')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete reason')
    } finally {
      setBusy(false)
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure system preferences and options" />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-line">
            <Switch
              label="Require QR scan for submissions"
              checked={security.requireQr}
              onChange={(event) => updateSecurity('requireQr', event.target.checked)}
            />
            <Switch
              label="Allow manual time entry"
              description="Applies to Student Special accounts"
              checked={security.allowManualTime}
              onChange={(event) => updateSecurity('allowManualTime', event.target.checked)}
            />
            <Switch
              label="Prevent duplicate submissions"
              checked={security.preventDuplicates}
              onChange={(event) => updateSecurity('preventDuplicates', event.target.checked)}
            />
            <Switch
              label="Require image proof for reports"
              checked={security.requireImageProof}
              onChange={(event) => updateSecurity('requireImageProof', event.target.checked)}
            />
            <Switch
              label="Enable in-app notifications"
              checked={security.enableNotifications}
              onChange={(event) => updateSecurity('enableNotifications', event.target.checked)}
            />
          </CardBody>
        </Card>

        {/* Report reasons */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Report reasons</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">
                Predefined reasons students can pick when filing a report
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleAddReason()
              }}
              className="mb-4 flex gap-2"
            >
              <Input
                aria-label="New reason"
                placeholder="Reason name"
                value={newReason}
                onChange={(event) => setNewReason(event.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                icon={biPlus}
                loading={busy}
                disabled={!newReason.trim()}
                className="shrink-0"
              >
                Add
              </Button>
            </form>

            {loadingReasons ? (
              <SkeletonText lines={4} />
            ) : reportReasons.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                No reasons configured yet.
              </p>
            ) : (
              <ul className="-mx-4 flex flex-col sm:-mx-5">
                {reportReasons.map((reason) => (
                  <li
                    key={reason.id}
                    className="flex min-w-0 items-center gap-2 border-b border-line px-4 py-2.5 last:border-b-0 sm:px-5"
                  >
                    {editingReason?.id === reason.id ? (
                      <>
                        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                          <Input
                            aria-label={`Edit ${reason.name}`}
                            placeholder="Reason name"
                            value={editReasonName}
                            onChange={(event) => setEditReasonName(event.target.value)}
                            className="h-9"
                          />
                          <Input
                            aria-label={`Edit description for ${reason.name}`}
                            placeholder="Description (optional)"
                            value={editReasonDescription}
                            onChange={(event) => setEditReasonDescription(event.target.value)}
                            className="h-9"
                          />
                        </div>
                        <ActionButton
                          icon={biCheck}
                          label="Save reason"
                          tone="ok"
                          disabled={busy || !editReasonName.trim()}
                          onClick={handleSaveEdit}
                        />
                        <ActionButton
                          icon={biX}
                          label="Cancel edit"
                          onClick={() => {
                            setEditingReason(null)
                            setEditReasonName('')
                            setEditReasonDescription('')
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm text-ink">{reason.name}</span>
                            {!reason.is_active && <Badge tone="neutral">Inactive</Badge>}
                          </span>
                          {reason.description && (
                            <span className="block truncate text-xs text-ink-muted">
                              {reason.description}
                            </span>
                          )}
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <ActionButton
                            icon={biPencil}
                            label={`Edit ${reason.name}`}
                            tone="accent"
                            onClick={() => {
                              setEditingReason(reason)
                              setEditReasonName(reason.name)
                              setEditReasonDescription(reason.description || '')
                            }}
                          />
                          <ActionButton
                            icon={reason.is_active ? biToggleOff : biToggleOn}
                            label={
                              reason.is_active
                                ? `Deactivate ${reason.name}`
                                : `Activate ${reason.name}`
                            }
                            tone={reason.is_active ? 'bad' : 'ok'}
                            disabled={togglingReasonId === reason.id}
                            onClick={() => handleToggleReason(reason)}
                          />
                          <ActionButton
                            icon={biTrash}
                            label={`Delete ${reason.name}`}
                            tone="bad"
                            onClick={() => setDeleteTarget(reason)}
                          />
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle>Database &amp; maintenance</CardTitle>
          </CardHeader>
          <CardBody>
            <Alert tone="warn" className="mb-4">
              Rebuilding and verifying are not wired up to the API yet. Audit log cleanup is.
            </Alert>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" icon="bi bi-arrow-repeat" disabled>
                Rebuild compliance records
              </Button>
              <Button variant="secondary" icon="bi bi-arrow-clockwise" disabled>
                Refresh materialized views
              </Button>
              <Button variant="secondary" icon="bi bi-shield-check" disabled>
                Verify RLS policies
              </Button>
              <Button variant="danger-outline" icon={biTrash} onClick={() => setShowAuditCleanup(true)}>
                Clean up old audit logs
              </Button>
            </div>
          </CardBody>
        </Card>

        <AuditLogCleanupModal
          open={showAuditCleanup}
          onClose={() => setShowAuditCleanup(false)}
        />

      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteReason}
        loading={busy}
        title="Delete reason"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? Existing reports keep their recorded reason.`
            : ''
        }
        confirmLabel="Delete reason"
      />
    </>
  )
}

