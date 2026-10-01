import { useCallback, useEffect, useMemo, useState } from 'react'
import { auditService } from '../../services/auditService'
import { formatDate, formatDateTime } from '../../lib/format'
import { biCalendar, biTrash } from '../../utils/icons'
import AuditLogCleanupModal from '../../features/audit/AuditLogCleanupModal'
import AuditLogDayPickerModal from '../../features/audit/AuditLogDayPickerModal'
import {
  ActionButton,
  Alert,
  Badge,
  Button,
  DetailList,
  EmptyState,
  Modal,
  PageHeader,
  ScrollX,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableCard,
} from '../../components/ui'

export default function AdminAuditLogs() {
  const [auditLogs, setAuditLogs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState(null)
  const [showCleanup, setShowCleanup] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [viewDate, setViewDate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true)
    try {
      // A chosen day is a different query, not a filter over the latest 100 —
      // otherwise a day older than that page would come back empty.
      const response = await auditService.getAll(viewDate ? { date: viewDate } : {})
      if (response.success) {
        setAuditLogs(response.data)
      } else {
        setError(response.message || 'Failed to load audit logs')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [viewDate])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return auditLogs

    return auditLogs.filter((log) =>
      [log.user?.full_name, log.action, log.entity_type, log.description, log.ip_address]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    )
  }, [auditLogs, searchTerm])

  return (
    <>
      <PageHeader
        title="Audit logs"
        subtitle="Track system activity and administrative actions"
        actions={
          <>
            <Button variant="secondary" icon={biCalendar} onClick={() => setShowDayPicker(true)}>
              View logs by date
            </Button>
            <Button variant="secondary" icon={biTrash} onClick={() => setShowCleanup(true)}>
              Clean up old logs
            </Button>
          </>
        }
      />

      {error && (
        <Alert tone="bad" onDismiss={() => setError('')} className="mb-5">
          {error}
        </Alert>
      )}

      {/*
        The day the table is showing. Without it the table is the latest 100
        entries, so the table title has to say which of the two the reader is
        looking at — an empty table under "System activity" would otherwise read
        as "nothing happened" when it may only mean "not on this page".
      */}
      {viewDate && (
        <Alert
          tone="info"
          className="mb-5"
          onDismiss={() => setViewDate(null)}
          title={`Showing ${formatDate(viewDate)} only`}
        >
          Everything recorded on this day, not just the most recent entries.
        </Alert>
      )}

      <TableCard
        title={viewDate ? `Activity on ${formatDate(viewDate)}` : 'System activity'}
        subtitle={
          viewDate
            ? `${filteredLogs.length} ${filteredLogs.length === 1 ? 'entry' : 'entries'}`
            : `${filteredLogs.length} of ${auditLogs.length} entries`
        }
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search user, action, entity…"
        loading={loading}
        isEmpty={filteredLogs.length === 0}
        empty={
          <EmptyState
            icon="bi-journal-text"
            title="No activity found"
            description={
              searchTerm
                ? 'No entries match your search.'
                : viewDate
                  ? 'Nothing was recorded on this day.'
                  : 'Administrative actions will appear here.'
            }
          />
        }
      >
        <ScrollX minW="54rem">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>User</TH>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>Description</TH>
                <TH>IP address</TH>
                <TH align="right">Details</TH>
              </tr>
            </THead>
            <TBody>
              {filteredLogs.map((log) => (
                <TR key={log.id}>
                  <TD className="whitespace-nowrap">{formatDate(log.created_at)}</TD>
                  <TD className="font-medium">{log.user?.full_name || 'System'}</TD>
                  <TD>
                    <Badge tone="accent">{log.action}</Badge>
                  </TD>
                  <TD>{log.entity_type || '—'}</TD>
                  <TD className="max-w-80">
                    <span className="line-clamp-2-safe">{log.description}</span>
                  </TD>
                  <TD className="tabular text-ink-muted">{log.ip_address || '—'}</TD>
                  <TD align="right">
                    <div className="flex justify-end">
                      <ActionButton
                        text="View"
                        label="View log entry"
                        tone="accent"
                        onClick={() => setSelected(log)}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ScrollX>
      </TableCard>

      <AuditLogDayPickerModal
        open={showDayPicker}
        onClose={() => setShowDayPicker(false)}
        onPick={(day) => {
          setViewDate(day)
          setSearchTerm('')
        }}
      />

      <AuditLogCleanupModal
        open={showCleanup}
        onClose={() => setShowCleanup(false)}
        onDeleted={fetchAuditLogs}
      />

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Audit entry"
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <DetailList
            columns={1}
            items={[
              { label: 'Date', value: formatDateTime(selected.created_at) },
              { label: 'User', value: selected.user?.full_name || 'System' },
              { label: 'Action', value: <Badge tone="accent">{selected.action}</Badge> },
              { label: 'Entity', value: selected.entity_type || '—' },
              { label: 'Entity ID', value: selected.entity_id || '—', className: 'font-mono text-xs' },
              { label: 'IP address', value: selected.ip_address || '—' },
              { label: 'Description', value: selected.description },
            ]}
          />
        )}
      </Modal>
    </>
  )
}
