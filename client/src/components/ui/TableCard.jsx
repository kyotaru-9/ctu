import { cx } from '../../lib/cx'
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from './Card'
import { EmptyState } from './EmptyState'
import { Input } from './Field'
import { SkeletonTable } from './Skeleton'

/** Search box that keeps a full-width tap target on phones. */
export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search', className }) {
  return (
    <div className={cx('relative w-full sm:max-w-xs', className)}>
      <i
        className="bi bi-search pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-sm text-ink-subtle"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="ps-9"
      />
    </div>
  )
}

/**
 * Standard data-view container: title bar, optional search + actions, and a
 * horizontally scrollable body. Handles loading and empty states so pages
 * don't repeat that boilerplate.
 */
export function TableCard({
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder,
  actions,
  loading = false,
  isEmpty = false,
  empty,
  bodyClassName,
  className,
  children,
}) {
  const showToolbar = title || search !== undefined || actions

  return (
    <Card className={cx('overflow-hidden', className)}>
      {showToolbar && (
        <CardHeader>
          <div className="min-w-0 flex-1">
            {title && <CardTitle>{title}</CardTitle>}
            {subtitle && <CardSubtitle>{subtitle}</CardSubtitle>}
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            {search !== undefined && (
              <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
            )}
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </CardHeader>
      )}

      {loading ? (
        <SkeletonTable />
      ) : isEmpty ? (
        empty ?? <EmptyState icon="bi-inbox" title="Nothing to show" />
      ) : (
        <CardBody className={cx('px-0 py-0', bodyClassName)}>{children}</CardBody>
      )}
    </Card>
  )
}
