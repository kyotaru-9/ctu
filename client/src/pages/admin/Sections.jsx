import { useCallback, useEffect, useMemo, useState } from 'react'
import { sectionService } from '../../services/sectionService'
import { biArrowRepeat, biPencil, biPlus, biToggleOff, biToggleOn, biTrash } from '../../utils/icons'
import {
  ACTIVE_STATUS,
  Alert,
  Badge,
  BentoGrid,
  Button,
  ConfirmDialog,
  DetailList,
  Input,
  Modal,
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
 */
function CredentialsModal({ open, onClose, title, intro, accounts, section, note }) {
  const list = accounts ?? []

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

export default function AdminSections() {
  const [sections, setSections] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState(null)
  const [regenerateTarget, setRegenerateTarget] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [regenerated, setRegenerated] = useState(null)
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
  }

  function handleOpenAdd() {
    setEditingSection(null)
    setFormData(BLANK_FORM)
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
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
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

      if (!editingSection && response.credentials) {
        setCredentials(response.credentials)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save section')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleStatus(section) {
    try {
      const response = await sectionService.toggleStatus(section.id)
      if (response.success) await fetchSections()
    } catch {
      // Non-critical: the list simply stays as-is until the next fetch.
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const response = await sectionService.delete(deleteTarget.id)
      if (response.success) await fetchSections()
    } catch {
      // Ignore — the confirm dialog closes either way.
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
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
        subtitle="Manage class sections and their student accounts"
        actions={
          <Button variant="primary" icon={biPlus} onClick={handleOpenAdd}>
            Add section
          </Button>
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
                        label={section.is_active ? 'Disable section' : 'Enable section'}
                        tone={section.is_active ? 'bad' : 'ok'}
                        onClick={() => handleToggleStatus(section)}
                      />
                      <ActionButton
                        icon={biTrash}
                        label="Delete section"
                        tone="bad"
                        onClick={() => setDeleteTarget(section)}
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
            />
            <Input
              label="Program"
              required
              value={formData.program}
              onChange={(event) => update('program', event.target.value)}
            />
          </div>

          <div className="form-grid-3">
            <Input
              label="Year level"
              required
              value={formData.year_level}
              onChange={(event) => update('year_level', event.target.value)}
            />
            <Input
              label="Section"
              required
              value={formData.section_name}
              onChange={(event) => update('section_name', event.target.value)}
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

          {/* No input for student_type on purpose. It stays in formData
              (seeded per row by handleOpenEdit) because the whole object is
              submitted — dropping the field would stop sending it and editing
              any section would leave its type unmanaged. */}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete section"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.program} ${deleteTarget.year_level}${deleteTarget.section_name}? Its schedule and history will no longer be accessible. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete section"
      />

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
        intro="The section was created and a student account was generated automatically."
        accounts={credentials ? [credentials] : []}
        section={sectionLabel}
        note="They must change their password on first login."
      />
    </>
  )
}
