import { useEffect, useState } from 'react'
import { submissionService } from '../../services/submissionService'
import { formatDate, formatDateTime, formatTime } from '../../lib/format'
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
  Modal,
  PageHeader,
  ScrollX,
  SUBMISSION_STATUS,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
} from '../../components/ui'

function recordStatus(record) {
  if (record.before && record.after) return 'completed'
  if (record.before || record.after) return 'incomplete'
  return 'none'
}

function SubmissionCell({ submission }) {
  if (!submission) {
    return (
      <Badge tone="bad" icon="bi bi-x-lg">
        Missing
      </Badge>
    )
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <span className="tabular text-xs text-ink-muted">
        {formatTime(new Date(submission.submitted_at).toTimeString().slice(0, 5))}
      </span>
      <StatusBadge map={CONDITION} value={submission.condition} />
    </span>
  )
}

function PhotoPanel({ title, submission }) {
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
                { label: 'Submitted at', value: formatDateTime(submission.submitted_at) },
                {
                  label: 'Condition',
                  value: <StatusBadge map={CONDITION} value={submission.condition} />,
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

/** Shared submission history, used by both student roles. */
export default function HistoryPage() {
  const [submissions, setSubmissions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchHistory() {
      try {
        const response = await submissionService.getMySubmissions()
        if (cancelled) return

        if (response.success) {
          setSubmissions(response.data || [])
        } else {
          setError(response.message || 'Failed to load history')
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchHistory()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader title="Submission history" subtitle="Your past room condition submissions" />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <TableCard
        title="All submissions"
        subtitle={`${submissions.length} record${submissions.length === 1 ? '' : 's'}`}
        loading={loading}
        isEmpty={submissions.length === 0}
        empty={
          <EmptyState
            icon="bi bi-calendar3"
            title="No submissions yet"
            description="Your before and after submissions will appear here."
          />
        }
      >
        <ScrollX minW="52rem">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Room</TH>
                <TH>Subject</TH>
                <TH>Before</TH>
                <TH>After</TH>
                <TH>Status</TH>
                <TH align="right">Details</TH>
              </tr>
            </THead>
            <TBody>
              {submissions.map((record, index) => (
                <TR key={record.id ?? `${record.date}-${index}`}>
                  <TD className="whitespace-nowrap">{formatDate(record.date)}</TD>
                  <TD className="tabular font-medium">{record.room?.room_code || '—'}</TD>
                  <TD>{record.subject || '—'}</TD>
                  <TD>
                    <SubmissionCell submission={record.before} />
                  </TD>
                  <TD>
                    <SubmissionCell submission={record.after} />
                  </TD>
                  <TD>
                    <StatusBadge map={SUBMISSION_STATUS} value={recordStatus(record)} />
                  </TD>
                  <TD align="right">
                    <div className="flex justify-end">
                      <ActionButton
                        text="View"
                        label="View submission"
                        tone="accent"
                        onClick={() => setSelected(record)}
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
        title={selected ? `Submission · ${selected.room?.room_code ?? ''}` : 'Submission'}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <DetailList
              items={[
                { label: 'Date', value: formatDate(selected.date) },
                { label: 'Subject', value: selected.subject || '—' },
                {
                  label: 'Status',
                  value: <StatusBadge map={SUBMISSION_STATUS} value={recordStatus(selected)} />,
                },
                { label: 'Room', value: selected.room?.room_code || '—' },
              ]}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PhotoPanel title="Before class" submission={selected.before} />
              <PhotoPanel title="After class" submission={selected.after} />
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
