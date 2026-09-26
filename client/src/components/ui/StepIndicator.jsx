import { cx } from '../../lib/cx'

/**
 * Wizard progress. On phones it collapses to a compact "Step n of m" readout
 * plus a progress bar; the full labelled stepper is shown from `sm` up.
 */
export function StepIndicator({ steps, current }) {
  const total = steps.length
  const currentIndex = steps.findIndex((step) => step.key === current)
  const position = currentIndex === -1 ? 1 : currentIndex + 1
  const percent = (position / total) * 100

  return (
    <nav aria-label="Progress" className="mb-6">
      {/* Compact — phones */}
      <div className="sm:hidden">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{steps[currentIndex]?.label ?? steps[0]?.label}</p>
          <p className="tabular shrink-0 text-xs text-ink-muted">
            Step {position} of {total}
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Full stepper — sm and up */}
      <ol className="hidden items-center sm:flex">
        {steps.map((step, index) => {
          const state = index + 1 < position ? 'completed' : index + 1 === position ? 'active' : 'todo'

          return (
            <li key={step.key} className={cx('flex items-center', index < total - 1 && 'flex-1')}>
              <div className="flex items-center gap-2.5">
                <span className="step-dot" data-state={state}>
                  {state === 'completed' ? (
                    <i className="bi bi-check" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cx(
                    'text-sm whitespace-nowrap',
                    state === 'active'
                      ? 'font-semibold text-ink'
                      : state === 'completed'
                        ? 'text-ink-muted'
                        : 'text-ink-subtle'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < total - 1 && (
                <span
                  aria-hidden="true"
                  className={cx(
                    'mx-3 h-px flex-1',
                    state === 'completed' ? 'bg-ok/40' : 'bg-line'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
