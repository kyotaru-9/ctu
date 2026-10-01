import { useMemo, useRef } from 'react'
import { biChevronDown, biChevronUp } from '../../utils/icons'
import { ActionButton, Button } from '../../components/ui'
import { cx } from '../../lib/cx'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Local-time YYYY-MM-DD. Never use toISOString() here — that shifts to UTC. */
function dayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/**
 * Month grid for picking days to clear, with the days that hold data marked.
 *
 * Built here because the kit has no date control, and the generic case — a date
 * field — is not what the audit cleanup needs: it needs to show at a glance which
 * days are worth deleting, and to let an admin sweep a whole month in one go.
 *
 * Selection is a set of day keys, so any number of days can be picked. Holding
 * shift extends the selection from the last plain-clicked day to the one clicked,
 * which is the gesture for "everything between these two"; a plain click toggles
 * one day. Days outside the month are rendered but not clickable, so a click
 * always means a day in view.
 *
 * `onSelect` therefore always receives an array. A consumer that only wants one
 * day — the log browser — should use `onPickDay`, which receives the plain key
 * for the day that was clicked, rather than reaching into the array.
 */
export default function AuditLogCalendar({
  month,
  onMonthChange,
  counts,
  selected,
  onSelect,
  onPickDay,
  today = dayKey(new Date()),
  loading = false,
}) {
  // The anchor a shift-click measures from. A ref, not state: it is only read
  // inside an event handler and must never trigger a render.
  const anchorRef = useRef(null)

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    // Sunday-first grid, padded out to whole weeks.
    const start = new Date(first)
    start.setDate(1 - first.getDay())

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const key = dayKey(date)
      return {
        key,
        date,
        inMonth: date.getMonth() === month.getMonth(),
        count: counts[key] ?? 0,
      }
    })
  }, [month, counts])

  const keysInRange = (from, to) => {
    // Keys are zero-padded, so lexical order is chronological order.
    const [lo, hi] = from <= to ? [from, to] : [to, from]
    return cells.filter((cell) => cell.key >= lo && cell.key <= hi).map((cell) => cell.key)
  }

  function handleDayClick(key, event) {
    // Reported before the selection is worked out, so a single-day consumer gets
    // the day actually clicked whether or not it was a range extension.
    onPickDay?.(key)

    if (event.shiftKey && anchorRef.current) {
      onSelect([...new Set([...selected, ...keysInRange(anchorRef.current, key)])])
      return
    }

    anchorRef.current = key
    onSelect(selected.includes(key) ? selected.filter((day) => day !== key) : [...selected, key])
  }

  const marked = cells.filter((cell) => cell.inMonth && cell.count > 0).length
  const monthTotal = cells
    .filter((cell) => cell.inMonth)
    .reduce((sum, cell) => sum + cell.count, 0)
  const selectedTotal = selected.reduce((sum, key) => sum + (counts[key] ?? 0), 0)

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{monthLabel(month)}</p>
        <div className="flex gap-1">
          <ActionButton
            icon={biChevronUp}
            label="Previous month"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          />
          <ActionButton
            icon={biChevronDown}
            label="Next month"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          />
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1 text-center text-[0.6875rem] font-medium text-ink-subtle">
            {day}
          </div>
        ))}
      </div>

      {/* The counts are what decide the delete, so the grid is withheld until
          they are in rather than drawn as a month of zeroes that reads as
          "nothing here" when it only means "not loaded yet". */}
      {loading ? (
        <p className="py-10 text-center text-sm text-ink-muted">Loading the calendar…</p>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const isSelected = selected.includes(cell.key)
            const isAnchor = anchorRef.current === cell.key
            const isToday = cell.key === today

            return (
              <button
                key={cell.key}
                type="button"
                disabled={!cell.inMonth}
                onClick={(event) => handleDayClick(cell.key, event)}
                aria-pressed={isSelected}
                aria-label={
                  cell.inMonth
                    ? `${cell.date.toDateString()}, ${cell.count} ${cell.count === 1 ? 'entry' : 'entries'}${isSelected ? ', selected' : ''}`
                    : undefined
                }
                className={cx(
                  'relative flex aspect-square flex-col items-center justify-center rounded-md text-sm transition-colors',
                  cell.inMonth
                    ? 'cursor-pointer hover:bg-surface-sunken'
                    : 'cursor-default text-ink-subtle/40',
                  isSelected && 'bg-accent text-white hover:bg-accent',
                  !isSelected && isAnchor && 'ring-1 ring-accent/50',
                  !isSelected && !isAnchor && isToday && 'ring-1 ring-accent/25'
                )}
              >
                <span className={cx(isSelected ? 'text-white' : cell.inMonth ? 'text-ink' : '')}>
                  {cell.date.getDate()}
                </span>

                {/*
                  The count is the point of the calendar: a dot alone says "there
                  is something", a number says whether it is worth opening.
                  Hidden when zero so an empty month reads as empty.
                */}
                {cell.inMonth && cell.count > 0 && (
                  <span
                    className={cx(
                      'mt-0.5 text-[0.625rem] leading-none font-medium tabular',
                      isSelected ? 'text-white/85' : 'text-ink-muted'
                    )}
                  >
                    {cell.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-xs text-ink-muted">
          {loading
            ? ' '
            : selected.length > 0
              ? `${selected.length} ${selected.length === 1 ? 'day' : 'days'} selected · ${selectedTotal} ${selectedTotal === 1 ? 'entry' : 'entries'}`
              : marked === 0
                ? 'No entries this month'
                : `${marked} ${marked === 1 ? 'day' : 'days'} · ${monthTotal} ${monthTotal === 1 ? 'entry' : 'entries'}`}
        </p>

        {selected.length > 0 && (
          <Button variant="ghost" size="xs" onClick={() => onSelect([])}>
            Clear
          </Button>
        )}
      </div>

      {selected.length > 1 && (
        <p className="mt-2 text-xs text-ink-subtle">
          Hold shift while clicking to select everything between two days.
        </p>
      )}
    </div>
  )
}
