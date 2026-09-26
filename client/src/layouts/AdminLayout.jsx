import AppShell from './AppShell'
import {
  biCalendar,
  biClipboard,
  biDashboard,
  biDoorOpen,
  biExclamation,
  biGraph,
  biJournal,
  biPeople,
  biSettings,
} from '../utils/icons'

const navItems = [
  { path: 'dashboard', label: 'Dashboard', icon: biDashboard },
  { path: 'students', label: 'Sections', icon: biPeople },
  { path: 'rooms', label: 'Rooms', icon: biDoorOpen },
  { path: 'schedules', label: 'Schedules', icon: biCalendar },
  { path: 'occupations', label: 'Occupations', icon: biClipboard },
  { path: 'reports', label: 'Reports', icon: biExclamation },
  { path: 'analytics', label: 'Analytics', icon: biGraph },
  { path: 'audit-logs', label: 'Audit Logs', icon: biJournal },
  { path: 'settings', label: 'Settings', icon: biSettings },
]

export default function AdminLayout() {
  return <AppShell items={navItems} basePath="/admin" roleLabel="Admin" />
}
