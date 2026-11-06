import { useCallback, useEffect, useState } from 'react'
import { analyticsDayParams, analyticsService } from '../../services/analyticsService'
import DayPickerModal from '../../components/DayPickerModal'
import { formatDate, sectionLabel } from '../../lib/format'
import { biCalendar } from '../../utils/icons'
import {
  Alert,
  BarList,
  BentoGrid,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Progress,
  ScrollX,
  SkeletonBento,
  SkeletonPage,
  SkeletonPanel,
  StatCard,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '../../components/ui'

function complianceTone(rate) {
  if (rate >= 90) return 'ok'
  if (rate >= 75) return 'warn'
  return 'bad'
}

function Panel({ title, subtitle, isEmpty, emptyLabel, children, className }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </CardHeader>
      <CardBody className="px-0 py-0">
        {isEmpty ? <EmptyState compact title={emptyLabel} /> : children}
      </CardBody>
    </Card>
  )
}

export default function AdminAnalytics() {
  const [overview, setOverview] = useState(null)
  const [sectionCompliance, setSectionCompliance] = useState([])
  const [roomIssues, setRoomIssues] = useState([])
  const [reportReasons, setReportReasons] = useState([])
  const [timeTrends, setTimeTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewDates, setViewDates] = useState([])
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [dayCounts, setDayCounts] = useState({})

  // Counts per day for the picker calendar — fetched once, independent of the
  // date filter so the marked days do not disappear when one is picked.
  useEffect(() => {
    let cancelled = false
    analyticsService
      .getDates()
      .then((response) => {
        if (cancelled || !response.success) return
        const counts = {}
        for (const entry of response.data.dates) counts[entry.date] = entry.count
        setDayCounts(counts)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const params = analyticsDayParams(viewDates)
      const [overviewRes, complianceRes, issuesRes, reasonsRes, trendsRes] = await Promise.all([
        analyticsService.getOverview(params),
        analyticsService.getSectionCompliance(params),
        analyticsService.getRoomIssues(params),
        analyticsService.getReportReasons(params),
        analyticsService.getTrends(params),
      ])

      if (overviewRes.success) setOverview(overviewRes.data)
      if (complianceRes.success) setSectionCompliance(complianceRes.data)
      if (issuesRes.success) setRoomIssues(issuesRes.data)
      if (reasonsRes.success) setReportReasons(reasonsRes.data)
      if (trendsRes.success) setTimeTrends(trendsRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [viewDates])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Monitor cleanliness trends and compliance"
        actions={
          <Button
            variant="secondary"
            icon={biCalendar}
            onClick={() => setShowDayPicker(true)}
          >
            Filter by date
          </Button>
        }
      />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      {viewDates.length > 0 && (
        <Alert
          tone="info"
          className="mb-5"
          onDismiss={() => setViewDates([])}
          title={
            viewDates.length === 1
              ? `Showing ${formatDate(viewDates[0])} only`
              : `Showing ${viewDates.length} selected days`
          }
        >
          Reports and submissions from the selected days. Section compliance shows the periods
          containing them.
        </Alert>
      )}

      {loading ? (
        <SkeletonPage>
          <SkeletonBento
            cells={['col-span-2 row-span-2', '', '', 'col-span-2']}
            className="mb-6"
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonPanel lines={6} />
            <SkeletonPanel lines={6} />
            <SkeletonPanel lines={5} />
            <SkeletonPanel lines={5} />
          </div>
        </SkeletonPage>
      ) : (
        <>
          <BentoGrid className="mb-6">
            <StatCard
              variant="feature"
              className="col-span-2 row-span-2"
              label="Avg compliance"
              value={`${overview?.avgCompliance || 0}%`}
              hint="Across all scheduled sections"
              footer={
                <Progress
                  value={overview?.avgCompliance || 0}
                  tone={complianceTone(overview?.avgCompliance || 0)}
                  label="Average compliance across all sections"
                />
              }
            />
            <StatCard label="Active sections" value={overview?.totalSections || 0} />
            <StatCard label="Active rooms" value={overview?.totalRooms || 0} />
            <StatCard
              className="col-span-2"
              label="Total reports"
              value={overview?.totalReports || 0}
            />
          </BentoGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="Section compliance"
              subtitle="Expected vs completed submissions"
              isEmpty={sectionCompliance.length === 0}
              emptyLabel="No compliance data yet"
            >
              <ScrollX minW="42rem">
                <Table>
                  <THead>
                    <tr>
                      <TH>Section</TH>
                      <TH>Period</TH>
                      <TH align="right">Expected</TH>
                      <TH align="right">Done</TH>
                      <TH align="right">Missing</TH>
                      <TH align="right">Late</TH>
                      <TH>Compliance</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {sectionCompliance.map((row) => (
                      <TR key={row.id}>
                        <TD className="font-medium">{sectionLabel(row.section)}</TD>
                        <TD className="whitespace-nowrap text-ink-muted">
                          {formatDate(row.period_start)} – {formatDate(row.period_end)}
                        </TD>
                        <TD align="right" className="tabular">
                          {row.expected}
                        </TD>
                        <TD align="right" className="tabular">
                          {row.completed}
                        </TD>
                        <TD align="right" className="tabular">
                          {row.missing}
                        </TD>
                        <TD align="right" className="tabular">
                          {row.late}
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2.5">
                            <Progress
                              value={row.compliance_rate}
                              tone={complianceTone(row.compliance_rate)}
                              label={`Compliance for ${sectionLabel(row.section)}`}
                              className="min-w-16 flex-1"
                            />
                            <span className="tabular w-9 shrink-0 text-right text-sm font-medium text-ink">
                              {row.compliance_rate}%
                            </span>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </ScrollX>
            </Panel>

            <Panel
              title="Room issues"
              subtitle="Rooms ranked by report volume"
              isEmpty={roomIssues.length === 0}
              emptyLabel="No room issues recorded"
            >
              <ScrollX minW="30rem">
                <Table>
                  <THead>
                    <tr>
                      <TH>Room</TH>
                      <TH align="right">Reports</TH>
                      <TH>Most common issue</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {roomIssues.map((row) => (
                      <TR key={row.room_id}>
                        <TD className="tabular font-medium">
                          {row.room_code || '—'}

                        </TD>
                        <TD align="right" className="tabular">
                          {row.total_reports}
                        </TD>
                        <TD>{row.most_common_issue || '—'}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </ScrollX>
            </Panel>

            <Panel
              title="Report reasons"
              subtitle="Distribution of filed reports"
              isEmpty={reportReasons.length === 0}
              emptyLabel="No reports filed yet"
            >
              <CardBody>
                <BarList
                  items={reportReasons.map((row) => ({
                    id: row.id,
                    label: row.name,
                    value: row.count,
                  }))}
                />
              </CardBody>
            </Panel>

            <Panel
              title="Time trends"
              subtitle={
                viewDates.length > 0
                  ? 'Reports and submissions by hour'
                  : 'Reports and submissions per period'
              }
              isEmpty={timeTrends.length === 0}
              emptyLabel="No trend data yet"
            >
              <ScrollX minW="26rem">
                <Table>
                  <THead>
                    <tr>
                      <TH>Period</TH>
                      <TH align="right">Reports</TH>
                      <TH align="right">Submissions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {timeTrends.map((row) => (
                      <TR key={row.period}>
                        <TD className="font-medium">{row.period}</TD>
                        <TD align="right" className="tabular">
                          {row.reports}
                        </TD>
                        <TD align="right" className="tabular">
                          {row.submissions}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </ScrollX>
            </Panel>
          </div>
        </>
      )}

      <DayPickerModal
        open={showDayPicker}
        onClose={() => setShowDayPicker(false)}
        onDaysChange={setViewDates}
        selectedDays={viewDates}
        counts={dayCounts}
        description="Pick days to show only the reports and submissions from them. Click a day to toggle it; hold shift to select a range. Days with activity are marked with a count."
      />
    </>
  )
}
