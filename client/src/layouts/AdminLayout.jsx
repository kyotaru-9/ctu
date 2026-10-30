import AppShell from './AppShell'
import {
  biCalendar,
  biCameraFill,
  biCheckSquare,
  biClipboard,
  biDoorOpen,
  biExclamation,
  biFileText,
  biGraph,
  biGraduationCap,
  biHouse,
  biJournal,
  biMap,
  biPeople,
  biSettings,
} from '../utils/icons'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: 'dashboard', label: 'Dashboard', icon: biHouse },
    ]
  },
  {
    label: 'Resources',
    items: [
      { path: 'students', label: 'Sections', icon: biPeople },
      { path: 'rooms', label: 'Rooms', icon: biDoorOpen },
      { path: 'educator', label: 'Educators', icon: biGraduationCap },
      { path: 'areas', label: 'Areas', icon: biMap },
    ]
  },
  {
    label: 'Scheduling',
    items: [
      { path: 'schedules', label: 'Schedules', icon: biCalendar },
      { path: 'area-assignments', label: 'Assignments', icon: biCheckSquare },
    ]
  },
  {
    label: 'Operations',
    items: [
      { path: 'occupations', label: 'Occupations', icon: biClipboard },
      { path: 'clean-area', label: 'Clean Area', icon: biCameraFill },
    ]
  },
  {
    label: 'Monitoring',
    items: [
      { path: 'reports', label: 'Reports', icon: biExclamation },
      { path: 'analytics', label: 'Analytics', icon: biGraph },
      { path: 'excuse-requests', label: 'Excuse Requests', icon: biFileText },
      { path: 'audit-logs', label: 'Audit Logs', icon: biJournal },
    ]
  },
  {
    label: 'System',
    items: [
      { path: 'settings', label: 'Settings', icon: biSettings },
    ]
  },
]

// Flatten for AppShell compatibility
const navItems = navGroups.flatMap(group => group.items)

export default function AdminLayout() {
  return <AppShell items={navItems} basePath="/admin" roleLabel="Admin" groups={navGroups} />
}
