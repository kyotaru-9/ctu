import { useCallback, useEffect, useMemo, useState } from 'react'
import { occupationService } from '../../services/occupationService'
import { formatDate, formatDateTime, formatTime, sectionLabel } from '../../lib/format'
import {
  ActionButton,
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  CONDITION,
  DetailList,
  EmptyState,
  Modal,
  OCCUPATION_STATUS,
  PageHeader,
  ScrollX,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
} from '../../components/ui'

function SubmissionFlag({ submitted, label }) {
  return submitted ? (
    <Badge tone="ok" icon="bi bi-check-lg">
      {label}
    </Badge>
  ) : (
    <Badge tone="bad" icon="bi bi-x-lg">
      Missing
    </Badge>
  )
}

function SubmissionPanel({ title, submitted, submittedAt, condition }) {
  return (
    <Card className="h-full">
      <CardBody>
        <CardTitle className="mb-4">{title}</CardTitle>

        {submitted ? (
          <DetailList
            columns={1}
            items={[
              { label: 'Status', value: <Badge tone="ok">Submitted</Badge> },
              { label: 'Submitted at', value: formatDateTime(submittedAt) },
              {
                label: 'Condition',
                value: <StatusBadge map={CONDITION} value={condition} />,
              },
            ]}
          />
        ) : (
          <p className="text-sm text-ink-muted">Not submitted.</p>
        )}
      </CardBody>
    </Card>
  )
}

export default function AdminOccupations() {
  const [occupations, setOccupations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOccupations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await occupationService.getAll()
      if (response.success) {
        setOccupations(response.data)
      } else {
        setError(response.message || 'Failed to load occupations')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load occupations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOccupations()
  }, [fetchOccupations])

  const filteredOccupations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return occupations

    return occupations.filter((occupation) =>
      [
        occupation.section?.section_name,
        occupation.section?.program,
        occupation.room?.room_code,
        occupation.schedule?.subject_name,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [occupations, searchTerm])

  return (
    <>
      <PageHeader title="Occupations" subtitle="View classroom occupation records" />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <TableCard
        title="Occupation records"
        subtitle={`${filteredOccupations.length} of ${occupations.length} shown`}
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search section, room, subject…"
        loading={loading}
        isEmpty={filteredOccupations.length === 0}
        empty={
          <EmptyState
            icon="bi-clipboard-check"
            title="No occupations found"
            description="Occupations are created when a section submits a before condition."
          />
        }
      >
        <ScrollX minW="60rem">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Section</TH>
                <TH>Room</TH>
                <TH>Subject</TH>
                <TH>Start</TH>
                <TH>End</TH>
                <TH>Before</TH>
                <TH>After</TH>
                <TH>Status</TH>
                <TH align="right">Details</TH>
              </tr>
            </THead>
            <TBody>
              {filteredOccupations.map((occupation) => (
                <TR key={occupation.id}>
                  <TD className="whitespace-nowrap">{formatDate(occupation.occupation_date)}</TD>
                  <TD className="font-medium">{sectionLabel(occupation.section)}</TD>
                  <TD className="tabular">{occupation.room?.room_code || '—'}</TD>
                  <TD>{occupation.schedule?.subject_name || '—'}</TD>
                  <TD className="tabular whitespace-nowrap">
                    {occupation.started_at
                      ? formatTime(new Date(occupation.started_at).toTimeString().slice(0, 5))
                      : '—'}
                  </TD>
                  <TD className="tabular whitespace-nowrap">
                    {occupation.ended_at
                      ? formatTime(new Date(occupation.ended_at).toTimeString().slice(0, 5))
                      : '—'}
                  </TD>
                  <TD>
                    <SubmissionFlag submitted={occupation.before_submitted} label="Done" />
                  </TD>
                  <TD>
                    <SubmissionFlag submitted={occupation.after_submitted} label="Done" />
                  </TD>
                  <TD>
                    <StatusBadge map={OCCUPATION_STATUS} value={occupation.status} />
                  </TD>
                  <TD align="right">
                    <div className="flex justify-end">
                      <ActionButton
                        text="View"
                        label="View occupation details"
                        tone="accent"
                        onClick={() => setSelected(occupation)}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ScrollX>
      </TableCard>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Occupation details"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <DetailList
              items={[
                { label: 'Date', value: formatDate(selected.occupation_date) },
                { label: 'Status', value: <StatusBadge map={OCCUPATION_STATUS} value={selected.status} /> },
                { label: 'Section', value: sectionLabel(selected.section) },
                { label: 'Room', value: selected.room?.room_code || '—' },
                { label: 'Subject', value: selected.schedule?.subject_name || '—' },
                { label: 'Instructor', value: selected.schedule?.instructor_name || '—' },
                { label: 'Started', value: formatDateTime(selected.started_at) },
                { label: 'Ended', value: formatDateTime(selected.ended_at) },
              ]}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SubmissionPanel
                title="Before class"
                submitted={selected.before_submitted}
                submittedAt={selected.before_submitted_at}
                condition={selected.before_condition}
              />
              <SubmissionPanel
                title="After class"
                submitted={selected.after_submitted}
                submittedAt={selected.after_submitted_at}
                condition={selected.after_condition}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
