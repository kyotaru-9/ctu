import AppShell from './AppShell'
import {
  biCalendar,
  biClockHistory,
  biDashboard,
  biExclamation,
  biQRCode,
} from '../utils/icons'

/**
 * Student navigation. `primary` promotes Scan QR to the raised centre action
 * in the mobile bottom bar, so the most-used action sits under the thumb.
 * Submit Condition is intentionally absent — it is reached by scanning a room
 * QR, or from the dashboard quick actions.
 */
const navItems = [
  { path: 'dashboard', label: 'Home', icon: biDashboard },
  { path: 'schedule', label: 'Schedule', icon: biCalendar },
  { path: 'scan', label: 'Scan QR', icon: biQRCode, primary: true },
  { path: 'reports', label: 'Reports', icon: biExclamation },
  { path: 'history', label: 'History', icon: biClockHistory },
]

export default function StudentLayout() {
  return (
    <AppShell
      items={navItems}
      bottomItems={navItems}
      basePath="/student"
      roleLabel="Student"
    />
  )
}
