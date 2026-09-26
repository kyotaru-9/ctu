const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const DAY_NAMES_LIST = DAY_NAMES

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * "BSIT 3A" from a section record; tolerates partial data. Empty when absent.
 * Year level and section name are joined without a space so this matches the
 * canonical section name the server builds (see routes/admin.js).
 */
function joinSection(section) {
  if (!section) return ''
  if (typeof section === 'string') return section
  const name = [section.year_level, section.section_name].filter(Boolean).join('')
  return [section.program, name].filter(Boolean).join(' ')
}

/** "BSIT 3A" for table cells, with an em-dash placeholder when there is none. */
export function sectionLabel(section) {
  return joinSection(section) || '—'
}

/**
 * "Welcome, BSIT 3A · Special" for page subtitles. Unlike sectionLabel this
 * omits a missing section instead of printing the placeholder, and falls back
 * to the account name so a greeting never reads "Welcome, —".
 */
export function welcomeText(user, suffix) {
  const parts = [joinSection(user?.section) || user?.full_name, suffix].filter(Boolean)
  return parts.length ? `Welcome, ${parts.join(' · ')}` : 'Welcome'
}

export function dayName(dayOfWeek) {
  return DAY_NAMES[Number(dayOfWeek)] ?? '—'
}

export function dayShort(dayOfWeek) {
  return DAY_SHORT[Number(dayOfWeek)] ?? '—'
}

/** "07:30" → "7:30 AM". Passes through anything unparseable. */
export function formatTime(value) {
  if (!value) return '—'

  const [hours, minutes] = String(value).split(':')
  const hour = Number(hours)
  if (Number.isNaN(hour)) return value

  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${minutes ?? '00'} ${suffix}`
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${formatDate(value)}, ${formatTime(date.toTimeString().slice(0, 5))}`
}

export function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function currentDayIndex() {
  return new Date().getDay()
}
