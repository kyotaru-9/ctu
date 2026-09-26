import { cx } from '../../lib/cx'

const TONES = {
  neutral: 'text-ink-muted bg-surface-sunken',
  accent: 'text-accent bg-accent-soft',
  ok: 'text-ok bg-ok-soft',
  warn: 'text-warn bg-warn-soft',
  bad: 'text-bad bg-bad-soft',
  info: 'text-info bg-info-soft',
}

const SIZES = {
  xs: 'h-4 w-4 rounded-xs text-[0.625rem]',
  sm: 'h-8 w-8 rounded-md text-sm',
  md: 'h-10 w-10 rounded-lg text-base',
  lg: 'h-12 w-12 rounded-lg text-xl',
  xl: 'h-16 w-16 rounded-xl text-2xl',
}

export function IconTile({ icon, tone = 'neutral', size = 'md', className, children }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center',
        TONES[tone] ?? TONES.neutral,
        SIZES[size] ?? SIZES.md,
        className
      )}
    >
      <i className={cx('bi', icon)} />
      {children}
    </span>
  )
}
