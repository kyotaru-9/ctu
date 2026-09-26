/* Status → badge tone maps, shared so a "pending" badge looks the same everywhere. */

export const REPORT_STATUS = {
  pending: { label: 'Pending', tone: 'warn' },
  reviewed: { label: 'Reviewed', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'bad' },
}

export const OCCUPATION_STATUS = {
  active: { label: 'Active', tone: 'accent' },
  completed: { label: 'Completed', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
}

export const SUBMISSION_STATUS = {
  completed: { label: 'Completed', tone: 'ok' },
  incomplete: { label: 'Incomplete', tone: 'warn' },
  none: { label: 'No submissions', tone: 'neutral' },
}

export const ACTIVE_STATUS = {
  true: { label: 'Active', tone: 'ok' },
  false: { label: 'Inactive', tone: 'neutral' },
}

export const CONDITION = {
  clean: { label: 'Clean', tone: 'ok' },
  not_clean: { label: 'Not Clean', tone: 'bad' },
}
