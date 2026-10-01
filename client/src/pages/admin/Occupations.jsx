import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

// Matches the w-48 / max-h-56 classes on the preview below, and is needed here
// because the rect maths runs before that element has been measured.
const PREVIEW_W = 192
const PREVIEW_MAX_H = 224
const GAP = 8
const OPEN_DELAY = 250

/**
 * The photo behind a Done badge, floating above it while the pointer rests
 * there.
 *
 * Portalled to the body instead of positioned against the badge: the table sits
 * inside `.scroll-x` and a Card with `overflow-hidden`, and a box that clips one
 * axis clips both, so a preview rendered in the cell is cut off by the very row
 * it is trying to float over. Fixed positioning is outside that clip.
 *
 * The bottom edge is pinned to the badge rather than the top edge of the image,
 * so a photo of any height grows upward toward a fixed gap instead of having to
 * be measured first. Rows too close to the top of the viewport flip below, since
 * there is no room above them to grow into.
 */
function SubmissionPhotoPreview({ submission, label, rect, id }) {
  const centered = rect.left + rect.width / 2 - PREVIEW_W / 2
  const left = Math.min(Math.max(centered, GAP), window.innerWidth - PREVIEW_W - GAP)
  const flipBelow = rect.top < PREVIEW_MAX_H + GAP

  return createPortal(
    <div
      id={id}
      role="tooltip"
      style={{
        position: 'fixed',
        left,
        // Above the page chrome but level with a modal's portal, since the
        // preview only exists while the table itself is being hovered.
        zIndex: 50,
        ...(flipBelow
          ? { top: rect.bottom + GAP }
          : { bottom: window.innerHeight - rect.top + GAP }),
      }}
    >
      <img
        src={submission.image_url}
        alt={`${label} photo`}
        // The sunken fill is the loading state: the box is bordered before the
        // photo arrives, and it should read as a placeholder rather than a hole.
        className="max-h-56 w-48 rounded-md border border-line bg-surface-sunken object-contain shadow-md"
      />
    </div>,
    document.body
  )
}

function SubmissionFlag({ submission, label }) {
  const triggerRef = useRef(null)
  const timerRef = useRef(null)
  const [rect, setRect] = useState(null)
  const previewId = useId()

  // Nothing to preview unless a submission exists and a photo came with it, so a
  // Missing badge — and a Done badge for a photo-less record — never opens an
  // empty bordered box over the table.
  const previewable = Boolean(submission?.image_url)

  const hide = useCallback(() => {
    clearTimeout(timerRef.current)
    setRect(null)
  }, [])

  // Measured once on open, so the preview has to be dismissed when the page
  // moves under it: scrolling would otherwise leave it hovering over a row that
  // is no longer there. Capture phase, since `.scroll-x` scrolls, not window.
  useEffect(() => {
    if (!rect) return undefined

    const onScroll = () => hide()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [rect, hide])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function show() {
    if (!previewable) return

    // Held back briefly: Before and After are columns of hover targets, and
    // opening instantly means a sweep down either one flashes a preview per row
    // rather than reading as a deliberate look at one record.
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const trigger = triggerRef.current
      if (trigger) setRect(trigger.getBoundingClientRect())
    }, OPEN_DELAY)
  }

  const badge = submission ? (
    <Badge tone="ok" icon="bi bi-check-lg">
      Done
    </Badge>
  ) : (
    <Badge tone="bad" icon="bi bi-x-lg">
      Missing
    </Badge>
  )

  if (!previewable) return badge

  // The focus handlers are the keyboard equivalent of the hover: a Done badge
  // that only responds to a mouse is a control a keyboard cannot reach. The
  // wrapper carries the ref and the handlers because Badge is a function
  // component and cannot take a ref.
  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex cursor-zoom-in rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        tabIndex={0}
        aria-describedby={previewId}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {badge}
      </span>
      {rect && <SubmissionPhotoPreview submission={submission} label={label} rect={rect} id={previewId} />}
    </>
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
                    <SubmissionFlag submission={occupation.before} label="Before class" />
                  </TD>
                  <TD>
                    <SubmissionFlag submission={occupation.after} label="After class" />
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
