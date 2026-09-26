import { cx } from '../../lib/cx'
import logo from '../../assets/logo.png'

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
}

/**
 * The CTU campus mark.
 *
 * Decorative in every current placement — the product name always sits beside
 * it — so it is hidden from assistive tech and the adjacent heading carries the
 * accessible name. Renders inline-block so a centred parent aligns it without
 * each caller reaching for `mx-auto`.
 */
export function Logo({ size = 'md', className }) {
  return (
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      className={cx('inline-block shrink-0 object-contain', SIZES[size] ?? SIZES.md, className)}
    />
  )
}
