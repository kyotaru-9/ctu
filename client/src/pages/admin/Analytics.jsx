import { useEffect, useState } from 'react'
import { analyticsService } from '../../services/analyticsService'
import {
  Alert,
  BarList,
  BentoGrid,
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

  useEffect(() => {
    let cancelled = false

    async function fetchAnalytics() {
      try {
        const [overviewRes, complianceRes, issuesRes, reasonsRes, trendsRes] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getSectionCompliance(),
          analyticsService.getRoomIssues(),
          analyticsService.getReportReasons(),
          analyticsService.getTrends(),
        ])
        if (cancelled) return

        if (overviewRes.success) setOverview(overviewRes.data)
        if (complianceRes.success) setSectionCompliance(complianceRes.data)
        if (issuesRes.success) setRoomIssues(issuesRes.data)
        if (reasonsRes.success) setReportReasons(reasonsRes.data)
        if (trendsRes.success) setTimeTrends(trendsRes.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAnalytics()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader title="Analytics" subtitle="Monitor cleanliness trends and compliance" />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
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
                      <TH align="right">Expected</TH>
                      <TH align="right">Done</TH>
                      <TH align="right">Missing</TH>
                      <TH align="right">Late</TH>
                      <TH>Compliance</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {sectionCompliance.map((row) => {
                      const rate = row.compliance_rate ?? row.compliance ?? 0
                      return (
                        <TR key={row.section_id || row.section}>
                          <TD className="font-medium">{row.section_name || row.section}</TD>
                          <TD align="right" className="tabular">
                            {row.expected ?? row.total_expected ?? 0}
                          </TD>
                          <TD align="right" className="tabular">
                            {row.completed ?? row.total_completed ?? 0}
                          </TD>
                          <TD align="right" className="tabular">
                            {row.missing ?? row.total_missing ?? 0}
                          </TD>
                          <TD align="right" className="tabular">
                            {row.late ?? row.total_late ?? 0}
                          </TD>
                          <TD>
                            <div className="flex items-center gap-2.5">
                              <Progress
                                value={rate}
                                tone={complianceTone(rate)}
                                label={`Compliance for ${row.section_name || row.section}`}
                                className="min-w-16 flex-1"
                              />
                              <span className="tabular w-9 shrink-0 text-right text-sm font-medium text-ink">
                                {rate}%
                              </span>
                            </div>
                          </TD>
                        </TR>
                      )
                    })}
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
                      <TR key={row.room_id || row.room}>
                        <TD className="tabular font-medium">{row.room_code || row.room}</TD>
                        <TD align="right" className="tabular">
                          {row.total_reports ?? row.totalReports ?? 0}
                        </TD>
                        <TD>{row.most_common_issue || row.commonIssue || '—'}</TD>
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
                    label: row.reason_name || row.reason,
                    value: row.count || 0,
                  }))}
                />
              </CardBody>
            </Panel>

            <Panel
              title="Time trends"
              subtitle="Reports and submissions per period"
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
                          {row.reports || 0}
                        </TD>
                        <TD align="right" className="tabular">
                          {row.submissions || 0}
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
    </>
  )
}
