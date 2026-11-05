import { useCallback, useEffect, useMemo, useState } from 'react'
import { sectionService } from '../../services/sectionService'
import SectionsBatchUploadModal from '../../features/sections/SectionsBatchUploadModal'
import AuditLogCalendar from '../../features/audit/AuditLogCalendar'
import { formatDate } from '../../lib/format'
import { biCalendar } from '../../utils/icons'
import {
  biArrowRepeat,
  biCloudUpload,
  biEyeFill,
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
  DetailList,
  Input,
  LoadingBlock,
  Modal,
  OCCUPATION_STATUS,
  PageHeader,
  Progress,
  RowActions,
  ActionButton,
  ScrollX,
  Select,
  SkeletonBento,
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
  mayor_name: '',
  program: '',
  year_level: '',
  section_name: '',
  shift: 'day',
  student_type: 'student',
}

const ROLE_LABELS = {
  student: 'Student',
  student_special: 'Special Student',
}

/**
 * Shows freshly generated logins. Takes a list because a section can own both a
 * regular and a special-student account, and regenerating resets every one of
 * them at once.
 *
 * A section is handed out as one set of credentials, so every account in the list
 * normally carries the same password. Showing it twice without saying so would read
 * as a mistake, so the shared password is called out explicitly.
 */
function CredentialsModal({ open, onClose, title, intro, accounts, section, note }) {
  const list = accounts ?? []
  const sharedPassword =
    list.length > 1 && list.every((account) => account.password === list[0].password)

  function handleCopy() {
    const text = list
      .map((account) =>
        [
          list.length > 1 ? `${ROLE_LABELS[account.role] ?? account.role}` : null,
          `Email: ${account.email}`,
          `Password: ${account.password}`,
        ]
          .filter(Boolean)
          .join('\n')
      )
      .join('\n\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <Alert tone="ok" className="mb-4">
        {intro}
      </Alert>

      <p className="mb-4 text-sm text-ink-muted">
        Share {list.length > 1 ? 'these credentials' : 'this credential'} for {section} with the
        section representative.
        {note ? ` ${note}` : ''}
      </p>

      {sharedPassword && (
        <Alert tone="info" className="mb-4">
          Both accounts use the same password. Whoever holds it can sign in as either one, and both
          see the same section data.
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {list.map((account) => (
          <div
            key={account.role ?? account.email}
            className="rounded-md border border-line bg-surface-sunken p-4"
          >
            {list.length > 1 && (
              <p className="mb-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                {ROLE_LABELS[account.role] ?? account.role}
              </p>
            )}
            <DetailList
              columns={1}
              items={[
                { label: 'Email', value: account.email, className: 'font-mono text-sm' },
                { label: 'Password', value: account.password, className: 'font-mono text-sm' },
              ]}
            />
          </div>
        ))}
      </div>

      <Button
        variant="accent-outline"
        icon="bi bi-clipboard"
        block
        className="mt-4"
        onClick={handleCopy}
      >
        Copy credentials
      </Button>
    </Modal>
  )
}

const CASCADE_LABELS = {
  schedules: 'schedule',
  occupations: 'occupation',
  submissions: 'room submission',
  reports: 'report',
  complianceRecords: 'compliance record',
}

/**
 * Names what a section delete takes with it. Everything in CASCADE_LABELS
 * references sections(id) ON DELETE CASCADE, so those counts are exact rather
 * than a warning about "your data". Accounts are listed separately because
 * profiles.section_id has no foreign key, so the delete route removes them
 * itself — and the count is what tells the admin their access is going too.
 */
function CascadeList({ impact }) {
  const destroying = Object.keys(CASCADE_LABELS)
    .map((key) => [key, impact?.[key] ?? 0])
    .filter(([, count]) => count > 0)

  const accounts = impact?.accounts ?? 0

  return (
    <div className="mt-4 flex flex-col gap-3">
      {destroying.length > 0 ? (
        <div className="rounded-md border border-bad/30 bg-bad-soft p-3">
          <p className="text-xs font-semibold tracking-wide text-bad uppercase">
            Also deleted
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {destroying.map(([key, count]) => (
              <li key={key} className="flex items-baseline justify-between gap-3 text-sm text-ink">
                <span>
                  {count} {CASCADE_LABELS[key]}
                  {count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          This section has no schedules, occupations, submissions or reports, so nothing else goes
          with it.
        </p>
      )}

      {accounts > 0 && (
        <p className="text-sm text-ink-muted">
          {accounts} login {accounts === 1 ? 'account' : 'accounts'} will be deleted too, so the
          {accounts === 1 ? ' student' : ' students'} lose their access immediately.
        </p>
      )}
    </div>
  )
}

export default function AdminSections() {
  const [sections, setSections] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteImpact, setDeleteImpact] = useState(null)
  const [impactLoading, setImpactLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [credentials, setCredentials] = useState(null)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [disableTarget, setDisableTarget] = useState(null)
  const [disableReason, setDisableReason] = useState('')
  const [disableReasonError, setDisableReasonError] = useState('')
  const [regenerateTarget, setRegenerateTarget] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [regenerated, setRegenerated] = useState(null)
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
  const [formData, setFormData] = useState(BLANK_FORM)

  const fetchSections = useCallback(async () => {
    setLoading(true)
    try {
      const response = await sectionService.getAll()
      if (response.success) {
        setSections(response.data)
      } else {
        setError(response.message || 'Failed to load sections')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sections')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  const filteredSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return sections

    return sections.filter((section) =>
      [section.mayor_name, section.program, section.section_name, section.year_level]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [sections, searchTerm])

  const activeCount = sections.filter((section) => section.is_active).length

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
    setEditingSection(null)
    setFormData(BLANK_FORM)
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function handleOpenEdit(section) {
    setEditingSection(section)
    setFormData({
      mayor_name: section.mayor_name || '',
      program: section.program || '',
      year_level: section.year_level || '',
      section_name: section.section_name || '',
      shift: section.shift || 'day',
      student_type: section.student_type || 'student',
    })
    setFieldErrors({})
    setError('')
    setShowForm(true)
  }

  function validate() {
    const errors = {}
    if (!formData.mayor_name.trim()) errors.mayor_name = 'Mayor name is required.'
    if (!formData.program.trim()) errors.program = 'Program is required.'
    if (!formData.year_level.trim()) errors.year_level = 'Year level is required.'
    if (!formData.section_name.trim()) errors.section_name = 'Section name is required.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setError('')

    try {
      const response = editingSection
        ? await sectionService.update(editingSection.id, formData)
        : await sectionService.create(formData)

      if (!response.success) {
        setError(response.message || 'Failed to save section')
        return
      }

      setShowForm(false)
      await fetchSections()

      // Only the student login comes back: creating a section never creates a
      // special-student account. That is added per section through the roles
      // endpoint, and it reuses this same password.
      if (!editingSection && response.credentials) {
        setCredentials({
          accounts: [response.credentials],
          section: sectionLabel,
        })
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save section')
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Disabling asks for a reason first. The reason is the only thing a locked-out
   * student is shown, so it is collected in a dialog rather than inferred.
   */
  function openDisableDialog(section) {
    setDisableTarget(section)
    setDisableReason('')
    setDisableReasonError('')
    setError('')
  }

  function closeDisableDialog() {
    setDisableTarget(null)
    setDisableReason('')
    setDisableReasonError('')
  }

  /**
   * Applies the status change the toggle asked for. The row updates from the
   * response straight away so the button and the status badge reflect the click
   * immediately, then the list re-syncs in the background. A failure is surfaced
   * rather than swallowed, since a silently unchanged row is indistinguishable
   * from a dead button.
   */
  async function applyStatus(section, nextActive, reason = '') {
    setTogglingId(section.id)
    setError('')

    try {
      const response = await sectionService.toggleStatus(section.id, nextActive, reason)

      if (!response.success) {
        setError(response.message || 'Failed to update the section')
        return false
      }

      setSections((current) =>
        current.map((item) => (item.id === section.id ? { ...item, ...response.data } : item))
      )
      await fetchSections()
      return true
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update the section')
      return false
    } finally {
      setTogglingId(null)
    }
  }

  async function handleConfirmDisable() {
    if (!disableTarget) return

    if (!disableReason.trim()) {
      setDisableReasonError('Give a reason so the students know what happened.')
      return
    }

    const ok = await applyStatus(disableTarget, false, disableReason.trim())
    if (ok) closeDisableDialog()
  }

  /** Enabling needs no explanation, so it goes straight through. */
  function handleToggleStatus(section) {
    if (section.is_active) {
      openDisableDialog(section)
      return
    }
    applyStatus(section, true)
  }

  /**
   * Opens the confirmation with the cascade cost already counted, so the dialog
   * can name the rows that are about to go rather than gesturing at them.
   */
  async function openDeleteDialog(section) {
    setDeleteTarget(section)
    setDeleteImpact(null)
    setError('')
    setImpactLoading(true)
    try {
      const response = await sectionService.getDeleteImpact(section.id)
      if (response.success) {
        setDeleteImpact(response.data)
      } else {
        setError(response.message || 'Could not check what this section owns')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not check what this section owns')
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
      const response = await sectionService.delete(deleteTarget.id)
      if (!response.success) {
        setError(response.message || 'Failed to delete section')
        return
      }
      closeDeleteDialog()
      await fetchSections()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete section')
    } finally {
      setDeleting(false)
    }
  }

  /**
   * Opens the overview modal on the row it was clicked from, then fills in the
   * aggregated stats — the same open-then-load pattern the occupation and
   * report detail modals use.
   */
  async function openView(section) {
    setViewTarget(section)
    setViewStats(null)
    setViewError('')
    setStatsDate(null)
    setViewLoading(true)
    try {
      const response = await sectionService.getStats(section.id)
      if (response.success) {
        setViewStats(response.data)
      } else {
        setViewError(response.message || 'Failed to load section stats')
      }
    } catch (err) {
      setViewError(err.response?.data?.message || 'Failed to load section stats')
    } finally {
      setViewLoading(false)
    }
  }

  /**
   * Refetches the overview scoped to one day. Schedules and the compliance
   * record are point-in-time totals, so the server leaves them unfiltered —
   * only occupations, submissions and reports narrow to the picked date.
   */
  async function applyStatsDate(day) {
    if (!viewTarget) return
    setStatsDate(day)
    setViewStats(null)
    setViewError('')
    setViewLoading(true)
    try {
      const response = await sectionService.getStats(viewTarget.id, { date: day })
      if (response.success) {
        setViewStats(response.data)
      } else {
        setViewError(response.message || 'Failed to load section stats')
      }
    } catch (err) {
      setViewError(err.response?.data?.message || 'Failed to load section stats')
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

  const sectionLabel = [formData.program, formData.year_level, formData.section_name]
    .filter(Boolean)
    .join(' ')

  /**
   * Resets the password on every account the section owns. Email addresses are
   * left alone by the server, so the modal pairs each new password with the
   * address that account already had.
   */
  async function handleRegenerateCredentials() {
    if (!regenerateTarget) return

    setRegenerating(true)
    try {
      const response = await sectionService.regenerateCredentials(regenerateTarget.id)

      if (!response.success) {
        setError(response.message || 'Failed to regenerate credentials')
        return
      }

      const label = [
        regenerateTarget.program,
        regenerateTarget.year_level,
        regenerateTarget.section_name,
      ]
        .filter(Boolean)
        .join(' ')

      setRegenerateTarget(null)
      setRegenerated({ ...response.data, section: label })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to regenerate credentials')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Sections"
        subtitle="Manage class sections and their student accounts. Disabling a section stops its student logins too."
        actions={
          <>
            <Button variant="secondary" icon={biCloudUpload} onClick={() => setShowBatchUpload(true)}>
              Batch upload
            </Button>
            <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
              Add section
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
        <SkeletonBento
          cells={['col-span-2 row-span-2', 'col-span-2', 'col-span-2']}
          className="mb-6"
        />
      ) : (
        <BentoGrid className="mb-6">
          <StatCard
            variant="feature"
            className="col-span-2 row-span-2"
            label="Total sections"
            value={sections.length}
            hint={`${activeCount} active · ${sections.length - activeCount} inactive`}
            footer={
              <Progress
                value={activeCount}
                max={sections.length || 1}
                tone="ok"
                label="Share of sections that are active"
              />
            }
          />
          <StatCard className="col-span-2" label="Active" value={activeCount} />
          <StatCard className="col-span-2" label="Inactive" value={sections.length - activeCount} />
        </BentoGrid>
      )}

      <TableCard
        title="All sections"
        subtitle={`${filteredSections.length} of ${sections.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search name, program, section…"
        loading={loading}
        isEmpty={filteredSections.length === 0}
        empty={
          <EmptyState
            icon="bi-search"
            title="No sections found"
            description={
              searchTerm
                ? 'No sections match your search.'
                : 'Add your first class section to get started.'
            }
          />
        }
      >
        <ScrollX minW="52rem">
          <Table>
            <THead>
              <tr>
                <TH>Mayor</TH>
                <TH>Program</TH>
                <TH>Year</TH>
                <TH>Section</TH>
                <TH>Shift</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filteredSections.map((section) => (
                <TR key={section.id}>
                  <TD className="font-medium">{section.mayor_name}</TD>
                  <TD>{section.program}</TD>
                  <TD className="tabular">{section.year_level}</TD>
                  <TD>{section.section_name}</TD>
                  <TD>
                    <Badge tone={section.shift === 'day' ? 'info' : 'warn'}>
                      {section.shift === 'day' ? 'Day' : 'Night'}
                    </Badge>
                  </TD>
                  <TD>
                    <StatusBadge map={ACTIVE_STATUS} value={String(Boolean(section.is_active))} />
                  </TD>
                  <TD align="right">
                    <RowActions label={`Actions for ${section.section_name}`}>
                      <ActionButton
                        icon={biEyeFill}
                        label="View section details"
                        tone="accent"
                        onClick={() => openView(section)}
                      />
                      <ActionButton
                        icon={biPencil}
                        label="Edit section"
                        tone="accent"
                        onClick={() => handleOpenEdit(section)}
                      />
                      <ActionButton
                        icon={biArrowRepeat}
                        label="Regenerate student password"
                        tone="accent"
                        onClick={() => setRegenerateTarget(section)}
                      />
                      <ActionButton
                        icon={section.is_active ? biToggleOff : biToggleOn}
                        label={
                          section.is_active
                            ? 'Disable section and its student logins'
                            : 'Enable section and its student logins'
                        }
                        tone={section.is_active ? 'bad' : 'ok'}
                        disabled={togglingId === section.id}
                        onClick={() => handleToggleStatus(section)}
                      />
                      <ActionButton
                        icon={biTrash}
                        label="Delete section"
                        tone="bad"
                        onClick={() => openDeleteDialog(section)}
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
        title={editingSection ? 'Edit section' : 'Add section'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="section-form" loading={submitting}>
              {editingSection ? 'Update section' : 'Create section'}
            </Button>
          </>
        }
      >
        <form id="section-form" onSubmit={handleSubmit} noValidate className="form-stack">
          {error && <Alert tone="bad">{error}</Alert>}

          <div className="form-grid">
            <Input
              label="Mayor name"
              required
              value={formData.mayor_name}
              onChange={(event) => update('mayor_name', event.target.value)}
              error={fieldErrors.mayor_name}
            />
            <Input
              label="Program"
              required
              value={formData.program}
              onChange={(event) => update('program', event.target.value)}
              error={fieldErrors.program}
            />
          </div>

          <div className="form-grid-3">
            <Input
              label="Year level"
              required
              value={formData.year_level}
              onChange={(event) => update('year_level', event.target.value)}
              error={fieldErrors.year_level}
            />
            <Input
              label="Section"
              required
              value={formData.section_name}
              onChange={(event) => update('section_name', event.target.value)}
              error={fieldErrors.section_name}
            />
            <Select
              label="Shift"
              value={formData.shift}
              onChange={(event) => update('shift', event.target.value)}
              options={[
                { value: 'day', label: 'Day' },
                { value: 'night', label: 'Night' },
              ]}
            />
          </div>

          {/* No input for student_type on purpose, on either form. It stays in
              formData (seeded per row by handleOpenEdit) because the whole object
              is submitted — dropping the field would stop sending it and editing
              any section would leave its type unmanaged. New sections fall back
              to the 'student' default in BLANK_FORM. */}
        </form>
      </Modal>

      {/*
        A Modal rather than a ConfirmDialog: the reason is a required text field,
        and ConfirmDialog has no slot for form controls. Shown before the status
        change, never after — the point is to make the admin write it down while
        they still have the section in front of them.
      */}
      <Modal
        open={Boolean(disableTarget)}
        onClose={closeDisableDialog}
        title="Disable section"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeDisableDialog}
              disabled={Boolean(togglingId)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={biToggleOff}
              onClick={handleConfirmDisable}
              loading={Boolean(togglingId)}
            >
              Disable section
            </Button>
          </>
        }
      >
        {disableTarget && (
          <form
            id="disable-section-form"
            onSubmit={handleConfirmDisable}
            noValidate
            className="form-stack"
          >
            {error && <Alert tone="bad">{error}</Alert>}

            <p className="text-sm text-ink-muted">
              Disabling {disableTarget.program} {disableTarget.year_level}
              {disableTarget.section_name} signs out its student accounts. Their data is kept and
              you can switch it back on at any time.
            </p>

            <Textarea
              label="Reason for deactivation"
              required
              rows={3}
              value={disableReason}
              onChange={(event) => {
                setDisableReason(event.target.value)
                if (disableReasonError) setDisableReasonError('')
              }}
              error={disableReasonError}
              placeholder="e.g. Class suspended for renovation until 15 March"
              hint="Students see this on the page they land on when they try to sign in."
            />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete section"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.program} ${deleteTarget.year_level}${deleteTarget.section_name}, along with its student login${deleteImpact?.accounts === 1 ? '' : 's'}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete permanently"
      >
        {impactLoading ? (
          <p className="mt-3 text-sm text-ink-muted">Checking what this section owns…</p>
        ) : (
          deleteImpact && <CascadeList impact={deleteImpact} />
        )}
      </ConfirmDialog>

      {/* Regenerate password */}
      <ConfirmDialog
        open={Boolean(regenerateTarget)}
        onClose={() => setRegenerateTarget(null)}
        onConfirm={handleRegenerateCredentials}
        loading={regenerating}
        title="Regenerate password"
        description={
          regenerateTarget
            ? `A new password will be generated for every student account in ${regenerateTarget.program} ${regenerateTarget.year_level}${regenerateTarget.section_name}. Email addresses stay the same, but the current password stops working immediately.`
            : ''
        }
        confirmLabel="Regenerate"
      />

      {/* Regenerated credentials */}
      <CredentialsModal
        open={Boolean(regenerated)}
        onClose={() => setRegenerated(null)}
        title="Password regenerated"
        intro="A new password was generated. The email addresses are unchanged."
        accounts={regenerated?.accounts}
        section={regenerated?.section}
        note="The previous password no longer works."
      />

      {/* Generated credentials */}
      <CredentialsModal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title="Student account created"
        intro="The section was created and its student login was generated automatically. A special-student login, if the section needs one, is added separately and uses this same password."
        accounts={credentials?.accounts ?? []}
        section={credentials?.section}
        note="We ask them to change their password on first login."
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
            Pick a day to count only that day&apos;s occupations, submissions and reports.
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

      {/* Batch import */}
      <SectionsBatchUploadModal
        open={showBatchUpload}
        onClose={() => setShowBatchUpload(false)}
        onImported={fetchSections}
      />

      {/* Section overview */}
      <Modal
        open={Boolean(viewTarget)}
        onClose={closeView}
        title={viewTarget ? `Section overview — ${viewTarget.section_name}` : 'Section overview'}
        size="lg"
        bodyClassName="no-scrollbar"
        footer={
          <Button variant="secondary" onClick={closeView}>
            Close
          </Button>
        }
      >
        {viewTarget && (
          <div className="flex flex-col gap-4">
            {viewError && (
              <Alert tone="bad" onDismiss={() => setViewError('')}>
                {viewError}
              </Alert>
            )}

            {viewLoading && <LoadingBlock label="Loading section stats…" compact />}

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
                    Occupations, submissions and reports are counted for {formatDate(statsDate)}
                    only. Schedules and compliance are totals and stay unfiltered.
                  </Alert>
                )}

                <BentoGrid>
                  <StatCard
                    variant="feature"
                    className="col-span-full row-span-2"
                    label="Class"
                    value={[viewTarget.program, `${viewTarget.year_level ?? ''}${viewTarget.section_name ?? ''}`]
                      .filter(Boolean)
                      .join(' ')}
                    hint={viewTarget.mayor_name ? `Mayor: ${viewTarget.mayor_name}` : undefined}
                    footer={
                      <StatusBadge
                        map={ACTIVE_STATUS}
                        value={String(Boolean(viewTarget.is_active))}
                      />
                    }
                  />
                </BentoGrid>

                <BentoGrid cols={3}>
                  <StatCard label="Schedules" value={viewStats.schedules} />
                  <StatCard
                    label="Occupations"
                    value={viewStats.occupations.total}
                    hint={
                      Object.entries(viewStats.occupations.byStatus)
                        .map(([status, count]) => `${count} ${status}`)
                        .join(' · ') || 'none yet'
                    }
                  />
                  <StatCard
                    label="Submissions"
                    value={viewStats.submissions.total}
                    hint={`${viewStats.submissions.before} before · ${viewStats.submissions.after} after`}
                  />
                  <StatCard
                    label="Reports"
                    value={viewStats.reports.total}
                    hint={
                      Object.entries(viewStats.reports.byStatus)
                        .map(([status, count]) => `${count} ${status}`)
                        .join(' · ') || 'none filed'
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
                </BentoGrid>

                {viewStats.compliance && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Latest compliance record</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <DetailList
                        columns={3}
                        items={[
                          {
                            label: 'Period',
                            value: `${formatDate(viewStats.compliance.period_start)} – ${formatDate(viewStats.compliance.period_end)}`,
                          },
                          { label: 'Compliance rate', value: `${viewStats.compliance.compliance_rate}%` },
                          {
                            label: 'Submissions',
                            value: `${viewStats.compliance.total_completed_submissions} of ${viewStats.compliance.total_expected_submissions}`,
                          },
                        ]}
                      />
                    </CardBody>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Reports by reason</CardTitle>
                  </CardHeader>
                  <CardBody>
                    {viewStats.reports.byReason.length === 0 ? (
                      <p className="py-4 text-center text-sm text-ink-muted">
                        No reports filed for this section.
                      </p>
                    ) : (
                      <ScrollX minW="24rem">
                        <Table>
                          <THead>
                            <tr>
                              <TH>Reason</TH>
                              <TH align="right">Count</TH>
                            </tr>
                          </THead>
                          <TBody>
                            {viewStats.reports.byReason.map((row) => (
                              <TR key={row.reason}>
                                <TD>{row.reason}</TD>
                                <TD align="right" className="tabular">
                                  {row.count}
                                </TD>
                              </TR>
                            ))}
                          </TBody>
                        </Table>
                      </ScrollX>
                    )}
                  </CardBody>
                </Card>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Occupations</CardTitle>
                  </CardHeader>
                  <CardBody>
                    {viewStats.occupations.list.length === 0 ? (
                      <p className="py-4 text-center text-sm text-ink-muted">
                        No occupation records for this section yet.
                      </p>
                    ) : (
                      <ScrollX minW="30rem">
                        <Table>
                          <THead>
                            <tr>
                              <TH>Date</TH>
                              <TH>Subject</TH>
                              <TH>Room</TH>
                              <TH>Status</TH>
                            </tr>
                          </THead>
                          <TBody>
                            {viewStats.occupations.list.map((occupation) => (
                              <TR key={occupation.id}>
                                <TD className="whitespace-nowrap">
                                  {formatDate(occupation.occupation_date)}
                                </TD>
                                <TD>{occupation.schedule?.subject_name || '—'}</TD>
                                <TD className="tabular">{occupation.room?.room_code || '—'}</TD>
                                <TD>
                                  <StatusBadge map={OCCUPATION_STATUS} value={occupation.status} />
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
                    <CardTitle>Cleaning records</CardTitle>
                  </CardHeader>
                  <CardBody>
                    {viewStats.cleaning.records.length === 0 ? (
                      <p className="py-4 text-center text-sm text-ink-muted">
                        No cleaning records for this section yet.
                      </p>
                    ) : (
                      <ScrollX minW="24rem">
                        <Table>
                          <THead>
                            <tr>
                              <TH>Date</TH>
                              <TH>Area</TH>
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
                                  {record.area?.name
                                    ? `${record.area.name}${record.area.floor ? ` (${record.area.floor})` : ''}`
                                    : '—'}
                                </TD>
                                <TD>
                                  <Badge
                                    tone={record.status === 'completed' ? 'ok' : 'warn'}
                                  >
                                    {record.status === 'completed' ? 'Completed' : 'Pending'}
                                  </Badge>
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
