import { useEffect, useState } from 'react'
import { submissionService } from '../../services/submissionService'
import { rotationalService } from '../../services/rotationalService'
import { formatDate, formatDateTime, formatTime } from '../../lib/format'
import {
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
  SUBMISSION_STATUS,
  StatusBadge,
  SegmentedControl,
  Input,
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

const ROTATIONAL_STATUS = {
  pending: { label: 'Pending', tone: 'warn' },
  completed: { label: 'Completed', tone: 'ok' },
}

function RotationalPhotoCell({ imageUrl, capturedAt }) {
  if (!imageUrl) {
    return (
      <Badge tone="bad" icon="bi bi-x-lg">
        Missing
      </Badge>
    )
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-start gap-1 text-accent hover:underline"
    >
      <span className="text-xs">View photo</span>
      {capturedAt && (
        <span className="tabular text-[0.6875rem] text-ink-muted">
          {formatDateTime(capturedAt)}
        </span>
      )}
    </a>
  )
}

export default function StudentHistory() {
  const [tab, setTab] = useState('room')
  const [roomSubmissions, setRoomSubmissions] = useState([])
  const [rotationalHistory, setRotationalHistory] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedRotational, setSelectedRotational] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      try {
        const [roomRes, rotationalRes] = await Promise.all([
          submissionService.getMySubmissions(),
          rotationalService.getHistory(),
        ])
        if (cancelled) return

        if (roomRes.success) {
          setRoomSubmissions(roomRes.data || [])
        }

        if (rotationalRes.success) {
          setRotationalHistory(rotationalRes.data || [])
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader title="History" subtitle="Your submission history" />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      <div className="mb-5">
        <SegmentedControl
          name="history-tab"
          columns={2}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'room', label: 'Room Submissions', icon: 'bi bi-building' },
            { value: 'rotational', label: 'Rotational Cleaning', icon: 'bi bi-arrow-repeat' },
          ]}
        />
      </div>

      <div className="mb-5">
        <Input
          type="search"
          placeholder={tab === 'room' ? 'Search by room, subject, or date...' : 'Search by area or date...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {tab === 'room' && (
        <Card>
          <CardHeader>
            <CardTitle>Room submissions</CardTitle>
            <p className="mt-0.5 text-xs text-ink-muted">{roomSubmissions.length} record{roomSubmissions.length === 1 ? '' : 's'}</p>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-md border border-line bg-surface-sunken p-4">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-line" />
                    <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-line" />
                  </div>
                ))}
              </div>
            ) : roomSubmissions.length === 0 ? (
              <EmptyState
                icon="bi bi-calendar3"
                title="No submissions yet"
                description="Your before and after submissions will appear here."
              />
            ) : (
              <div className="space-y-3">
                {roomSubmissions
                  .filter((record) => {
                    if (!searchQuery) return true
                    const query = searchQuery.toLowerCase()
                    return (
                      (record.room?.room_code || '').toLowerCase().includes(query) ||
                      (record.subject || '').toLowerCase().includes(query) ||
                      formatDate(record.date).toLowerCase().includes(query)
                    )
                  })
                  .map((record, index) => (
                    <Card key={record.id ?? `${record.date}-${index}`} className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-ink">{record.room?.room_code || '—'}</p>
                            <Badge tone={SUBMISSION_STATUS[recordStatus(record)]?.tone || 'neutral'}>
                              {SUBMISSION_STATUS[recordStatus(record)]?.label || recordStatus(record)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">{formatDate(record.date)}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">{record.subject || '—'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRoom(record)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="rounded-md border border-line bg-surface-sunken p-3">
                          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Before</p>
                          <div className="mt-2">
                            <SubmissionCell submission={record.before} />
                          </div>
                        </div>
                        <div className="rounded-md border border-line bg-surface-sunken p-3">
                          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">After</p>
                          <div className="mt-2">
                            <SubmissionCell submission={record.after} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                {roomSubmissions.filter((record) => {
                  if (!searchQuery) return true
                  const query = searchQuery.toLowerCase()
                  return (
                    (record.room?.room_code || '').toLowerCase().includes(query) ||
                    (record.subject || '').toLowerCase().includes(query) ||
                    formatDate(record.date).toLowerCase().includes(query)
                  )
                }).length === 0 && (
                  <EmptyState
                    icon="bi bi-search"
                    title="No results found"
                    description="Try adjusting your search query."
                  />
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'rotational' && (
        <Card>
          <CardHeader>
            <CardTitle>Rotational cleaning</CardTitle>
            <p className="mt-0.5 text-xs text-ink-muted">{rotationalHistory.length} record{rotationalHistory.length === 1 ? '' : 's'}</p>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-md border border-line bg-surface-sunken p-4">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-line" />
                    <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-line" />
                  </div>
                ))}
              </div>
            ) : rotationalHistory.length === 0 ? (
              <EmptyState
                icon="bi bi-arrow-repeat"
                title="No cleaning records yet"
                description="Your rotational cleaning submissions will appear here."
              />
            ) : (
              <div className="space-y-3">
                {rotationalHistory
                  .filter((record) => {
                    if (!searchQuery) return true
                    const query = searchQuery.toLowerCase()
                    return (
                      (record.area?.name || '').toLowerCase().includes(query) ||
                      (record.area?.floor || '').toLowerCase().includes(query) ||
                      formatDate(record.submitted_at).toLowerCase().includes(query)
                    )
                  })
                  .map((record) => (
                    <Card key={record.id} className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-ink">{record.area?.name || '—'}</p>
                            <Badge tone={ROTATIONAL_STATUS[record.status]?.tone || 'neutral'}>
                              {ROTATIONAL_STATUS[record.status]?.label || record.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">{formatDate(record.submitted_at)}</p>
                          <p className="mt-0.5 text-xs text-ink-muted">Floor: {record.area?.floor || '—'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRotational(record)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-md border border-line bg-surface-sunken p-3">
                          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Before 1</p>
                          <div className="mt-2">
                            <RotationalPhotoCell
                              imageUrl={record.before_image_url}
                              capturedAt={record.before_captured_at}
                            />
                          </div>
                        </div>
                        <div className="rounded-md border border-line bg-surface-sunken p-3">
                          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">Before 2</p>
                          <div className="mt-2">
                            <RotationalPhotoCell
                              imageUrl={record.before_image_url_2}
                              capturedAt={record.before_captured_at_2}
                            />
                          </div>
                        </div>
                        <div className="rounded-md border border-line bg-surface-sunken p-3">
                          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">After 1</p>
                          <div className="mt-2">
                            <RotationalPhotoCell
                              imageUrl={record.after_image_url}
                              capturedAt={record.after_captured_at}
                            />
                          </div>
                        </div>
                        <div className="rounded-md border border-line bg-surface-sunken p-3">
                          <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">After 2</p>
                          <div className="mt-2">
                            <RotationalPhotoCell
                              imageUrl={record.after_image_url_2}
                              capturedAt={record.after_captured_at_2}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                {rotationalHistory.filter((record) => {
                  if (!searchQuery) return true
                  const query = searchQuery.toLowerCase()
                  return (
                    (record.area?.name || '').toLowerCase().includes(query) ||
                    (record.area?.floor || '').toLowerCase().includes(query) ||
                    formatDate(record.submitted_at).toLowerCase().includes(query)
                  )
                }).length === 0 && (
                  <EmptyState
                    icon="bi bi-search"
                    title="No results found"
                    description="Try adjusting your search query."
                  />
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Room Submission Modal */}
      <Modal
        open={Boolean(selectedRoom)}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom ? `Submission · ${selectedRoom.room?.room_code ?? ''}` : 'Submission'}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedRoom(null)}>
            Close
          </Button>
        }
      >
        {selectedRoom && (
          <div className="flex flex-col gap-5">
            <DetailList
              items={[
                { label: 'Date', value: formatDate(selectedRoom.date) },
                { label: 'Subject', value: selectedRoom.subject || '—' },
                {
                  label: 'Status',
                  value: <StatusBadge map={SUBMISSION_STATUS} value={recordStatus(selectedRoom)} />,
                },
                { label: 'Room', value: selectedRoom.room?.room_code || '—' },
              ]}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PhotoPanel title="Before class" submission={selectedRoom.before} />
              <PhotoPanel title="After class" submission={selectedRoom.after} />
            </div>
          </div>
        )}
      </Modal>

      {/* Rotational Cleaning Modal */}
      <Modal
        open={Boolean(selectedRotational)}
        onClose={() => setSelectedRotational(null)}
        title={selectedRotational ? `Cleaning · ${selectedRotational.area?.name ?? ''}` : 'Cleaning'}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedRotational(null)}>
            Close
          </Button>
        }
      >
        {selectedRotational && (
          <div className="flex flex-col gap-5">
            <DetailList
              items={[
                { label: 'Date', value: formatDate(selectedRotational.submitted_at) },
                { label: 'Area', value: selectedRotational.area?.name || '—' },
                { label: 'Floor', value: selectedRotational.area?.floor || '—' },
                {
                  label: 'Status',
                  value: (
                    <Badge tone={ROTATIONAL_STATUS[selectedRotational.status]?.tone || 'neutral'}>
                      {ROTATIONAL_STATUS[selectedRotational.status]?.label || selectedRotational.status}
                    </Badge>
                  ),
                },
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Before Photo 1</CardTitle>
                </CardHeader>
                <CardBody>
                  {selectedRotational.before_image_url ? (
                    <div className="space-y-2">
                      <img
                        src={selectedRotational.before_image_url}
                        alt="Before photo 1"
                        className="max-h-32 w-full rounded-md border border-line object-contain"
                      />
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(selectedRotational.before_captured_at)}
                      </p>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-ink-muted">Not submitted</p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Before Photo 2</CardTitle>
                </CardHeader>
                <CardBody>
                  {selectedRotational.before_image_url_2 ? (
                    <div className="space-y-2">
                      <img
                        src={selectedRotational.before_image_url_2}
                        alt="Before photo 2"
                        className="max-h-32 w-full rounded-md border border-line object-contain"
                      />
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(selectedRotational.before_captured_at_2)}
                      </p>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-ink-muted">Not submitted</p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>After Photo 1</CardTitle>
                </CardHeader>
                <CardBody>
                  {selectedRotational.after_image_url ? (
                    <div className="space-y-2">
                      <img
                        src={selectedRotational.after_image_url}
                        alt="After photo 1"
                        className="max-h-32 w-full rounded-md border border-line object-contain"
                      />
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(selectedRotational.after_captured_at)}
                      </p>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-ink-muted">Not submitted</p>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>After Photo 2</CardTitle>
                </CardHeader>
                <CardBody>
                  {selectedRotational.after_image_url_2 ? (
                    <div className="space-y-2">
                      <img
                        src={selectedRotational.after_image_url_2}
                        alt="After photo 2"
                        className="max-h-32 w-full rounded-md border border-line object-contain"
                      />
                      <p className="text-xs text-ink-muted">
                        {formatDateTime(selectedRotational.after_captured_at_2)}
                      </p>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-ink-muted">Not submitted</p>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
