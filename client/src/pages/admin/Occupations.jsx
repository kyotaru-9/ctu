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
  CardHeader,
  CardTitle,
  CONDITION,
  DetailList,
  EmptyState,
  LoadingBlock,
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

function SubmissionFlag({ submission }) {
  return submission ? (
    <Badge tone="ok" icon="bi bi-check-lg">
      Done
    </Badge>
  ) : (
    <Badge tone="bad" icon="bi bi-x-lg">
      Missing
    </Badge>
  )
}

function SubmissionPanel({ title, submission }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        {submission ? (
          <div className="flex flex-col gap-4">
            {submission.image_url ? (
              <img
                src={submission.image_url}
                alt={`${title} photo`}
                className="max-h-48 w-full rounded-md border border-line object-contain"
              />
            ) : (
              <div className="grid h-40 place-items-center rounded-md bg-surface-sunken text-sm text-ink-muted">
                No photo
              </div>
            )}

            <DetailList
              columns={1}
              items={[
                { label: 'Status', value: <Badge tone="ok">Submitted</Badge> },
                { label: 'Submitted at', value: formatDateTime(submission.submitted_at) },
                {
                  label: 'Condition',
                  value: <StatusBadge map={CONDITION} value={submission.condition} />,
                },
                submission.submitted_time && {
                  label: 'Recorded time',
                  value: formatTime(String(submission.submitted_time).slice(0, 5)),
                },
                submission.notes && { label: 'Notes', value: submission.notes },
              ]}
            />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-ink-muted">Not submitted</p>
        )}
      </CardBody>
    </Card>
  )
}

export default function AdminOccupations() {
  const [occupations, setOccupations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
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

  // The list row only carries the submission summary the Before/After columns
  // need, so the modal opens on it and then fills in the full records.
  const openDetails = useCallback(async (occupation) => {
    setSelected(occupation)
    setDetail(occupation)
    setDetailError('')
    setDetailLoading(true)
    try {
      const response = await occupationService.getById(occupation.id)
      if (response.success && response.data) {
        setDetail(response.data)
      } else {
        setDetailError(response.message || 'Failed to load occupation details')
      }
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Failed to load occupation details')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetails = useCallback(() => {
    setSelected(null)
    setDetail(null)
    setDetailError('')
    setDetailLoading(false)
  }, [])

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
                    <SubmissionFlag submission={occupation.before} />
                  </TD>
                  <TD>
                    <SubmissionFlag submission={occupation.after} />
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
                        onClick={() => openDetails(occupation)}
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
        onClose={closeDetails}
        title="Occupation details"
        size="lg"
        footer={
          <Button variant="secondary" onClick={closeDetails}>
            Close
          </Button>
        }
      >
        {selected && detail && (
          <div className="flex flex-col gap-6">
            {detailError && (
              <Alert tone="bad" onDismiss={() => setDetailError('')}>
                {detailError}
              </Alert>
            )}

            <DetailList
              items={[
                { label: 'Date', value: formatDate(detail.occupation_date) },
                { label: 'Status', value: <StatusBadge map={OCCUPATION_STATUS} value={detail.status} /> },
                { label: 'Section', value: sectionLabel(detail.section) },
                { label: 'Room', value: detail.room?.room_code || '—' },
                { label: 'Subject', value: detail.schedule?.subject_name || '—' },
                { label: 'Instructor', value: detail.schedule?.instructor_name || '—' },
                { label: 'Started', value: formatDateTime(detail.started_at) },
                { label: 'Ended', value: formatDateTime(detail.ended_at) },
              ]}
            />

            {detailLoading && <LoadingBlock label="Loading submissions…" compact />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SubmissionPanel title="Before class" submission={detail.before} />
              <SubmissionPanel title="After class" submission={detail.after} />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
