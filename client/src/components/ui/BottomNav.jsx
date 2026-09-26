import { NavLink } from 'react-router-dom'
import { cx } from '../../lib/cx'

/**
 * Sticky bottom tab bar for phones, where there is no room for a sidebar.
 * Hidden from `lg` up — the fixed sidebar takes over at that breakpoint, so the
 * two navigation surfaces are never visible at the same time.
 *
 * An item flagged `primary` is promoted to a raised, filled action button that
 * breaks the top edge of the bar. That is how the QR scan entry point gets the
 * thumb-reachable centre slot; bars without one drop the reserved space.
 *
 * Labels come from `item.short` when present, which lets the sidebar keep a
 * descriptive "Submit Before" while the tab stays short enough for six across
 * a 390px screen.
 */
export function BottomNav({ items, basePath, label = 'Primary' }) {
  const hasPrimary = items.some((item) => item.primary)

  return (
    <nav
      aria-label={label}
      className={cx('bottom-nav no-print lg:hidden', hasPrimary && 'bottom-nav-raised')}
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={`${basePath}/${item.path}`}
          className={cx('bottom-nav-link', item.primary && 'bottom-nav-link-primary')}
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            <i className={cx('bi', item.icon)} />
          </span>
          <span className="bottom-nav-label">{item.short ?? item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
