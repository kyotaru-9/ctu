import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { biBoxArrowRight, biPersonBadge } from '../utils/icons'
import { BottomNav, Button, Drawer, IconTile, Logo, Menu, MenuDivider, MenuItem } from '../components/ui'
import { cx } from '../lib/cx'

function NavItems({ items, basePath, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 p-3">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={`${basePath}/${item.path}`}
          onClick={onNavigate}
          className="app-nav-link"
        >
          <i className={cx('bi', item.icon)} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function UserCard({ user, roleLabel, onSignOut, compact = false }) {
  const name =
    user?.full_name ||
    [user?.section?.program, user?.section?.year_level, user?.section?.section_name]
      .filter(Boolean)
      .join(' ') ||
    'Signed in'

  return (
    <div className={cx('border-t border-line p-3', compact && 'border-t-0 p-0')}>
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <IconTile icon={biPersonBadge} size="sm" tone="accent" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{name}</p>
          <p className="truncate text-xs text-ink-muted">{roleLabel}</p>
        </div>
      </div>
      <Button variant="secondary" icon={biBoxArrowRight} block onClick={onSignOut}>
        Sign Out
      </Button>
    </div>
  )
}

/**
 * Single application shell for every authenticated role.
 *
 * Desktop (lg+): fixed sidebar, offset main column.
 * Mobile: sidebar removed entirely. Roles that pass `bottomItems` get a sticky
 * bottom tab bar and no drawer; the rest fall back to a slide-in Drawer, so
 * the content column is never squeezed either way.
 */
export default function AppShell({ items, basePath, roleLabel, bottomItems }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Only admins have a settings route, so the dropdown entry is driven by the
  // nav itself rather than hardcoded per role — it can never point at a route
  // that does not exist.
  const hasSettings = items.some((item) => item.path === 'settings')

  // Close the drawer on navigation and reset scroll for the new page.
  useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  async function handleSignOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="app-sidebar no-print">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-4">
          <NavLink to={`${basePath}/dashboard`} className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">CTU</span>
              <span className="block truncate text-xs text-ink-muted">{roleLabel}</span>
            </span>
          </NavLink>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavItems items={items} basePath={basePath} />
        </div>

        <UserCard user={user} roleLabel={roleLabel} onSignOut={handleSignOut} />
      </aside>

      <div className="app-main">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
            {!bottomItems && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                aria-expanded={drawerOpen}
                className="-ms-2 grid h-10 w-10 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink lg:hidden"
              >
                <i className="bi bi-list text-xl" aria-hidden="true" />
              </button>
            )}

            <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <Logo />
              <span className="truncate text-sm font-semibold text-ink">CTU</span>
            </div>

            <div className="ms-auto flex items-center gap-2">
              <Menu
                label="Account menu"
                trigger={
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="flex items-center gap-2 rounded-md py-1.5 ps-1.5 pe-2 transition-colors hover:bg-surface-sunken"
                  >
                    <IconTile icon={biPersonBadge} size="sm" tone="accent" />
                    <span className="hidden max-w-32 truncate text-sm font-medium text-ink sm:block lg:hidden">
                      {user?.full_name || user?.section?.section_name || 'Account'}
                    </span>
                    <i className="bi bi-chevron-down hidden text-xs text-ink-subtle sm:block lg:hidden" aria-hidden="true" />
                  </button>
                }
              >
                <div className="border-b border-line px-3 py-2 sm:hidden">
                  <p className="truncate text-sm font-medium text-ink">
                    {user?.full_name || user?.section?.section_name || 'Account'}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{roleLabel}</p>
                </div>
                {hasSettings && (
                  <>
                    <MenuItem icon="bi bi-gear" onClick={() => navigate(`${basePath}/settings`)}>
                      Settings
                    </MenuItem>
                    <MenuDivider />
                  </>
                )}
                <MenuItem icon="bi bi-box-arrow-right" onClick={handleSignOut}>
                  Sign Out
                </MenuItem>
              </Menu>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="app-container app-content"
          data-bottom-nav={bottomItems ? 'true' : undefined}
        >
          <Outlet />
        </main>
      </div>

      {bottomItems ? (
        <BottomNav items={bottomItems} basePath={basePath} label={`${roleLabel} sections`} />
      ) : (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={roleLabel}>
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavItems items={items} basePath={basePath} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <UserCard user={user} roleLabel={roleLabel} onSignOut={handleSignOut} />
          </div>
        </Drawer>
      )}
    </div>
  )
}
