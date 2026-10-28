import AppShell from './AppShell'
import {
  biArrowClockwise,
  biArrowCounterclockwise,
  biCalendar,
  biCameraFill,
  biClockHistory,
  biExclamation,
  biHouse,
} from '../utils/icons'

/**
 * Special student navigation. Six tabs share the mobile bar, so the submission
 * steps carry a `short` label for the tab while the sidebar keeps the
 * descriptive "Submit Before" / "Submit After".
 *
 * Before and After are the whole point of this role, so both are flagged
 * `primary` and render as raised accent actions in the middle of the bar —
 * deliberately bigger than the four informational tabs around them.
 */
const navItems = [
  { path: 'dashboard', label: 'Home', icon: biHouse },
  { path: 'schedule', label: 'Schedule', icon: biCalendar },
  { path: 'before', label: 'Submit Before', icon: biArrowCounterclockwise, short: 'Before', primary: true },
  { path: 'rotational', label: 'Rotational', icon: biCameraFill, primary: true },
  { path: 'after', label: 'Submit After', icon: biArrowClockwise, short: 'After', primary: true },
  { path: 'reports', label: 'Reports', icon: biExclamation },
  { path: 'history', label: 'History', icon: biClockHistory },
]

export default function SpecialStudentLayout() {
  return (
    <AppShell
      items={navItems}
      bottomItems={navItems}
      basePath="/special"
      roleLabel="Special Student"
    />
  )
}
