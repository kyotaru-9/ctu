import { forwardRef, useId } from 'react'
import { cx } from '../../lib/cx'

export function Field({ label, hint, error, required, htmlFor, className, children }) {
  return (
    <div className={cx('min-w-0', className)}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-[0.8125rem] font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-bad" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-bad">
          <i className="bi bi-exclamation-circle mt-px shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  )
}

export const Input = forwardRef(function Input(
  { label, hint, error, required, className, wrapClassName, icon, type = 'text', id, ...rest },
  ref
) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const invalid = Boolean(error)
  const controlClass = cx('field', invalid && 'field-invalid', icon && 'ps-9', className)

  const control = (
    <input
      ref={ref}
      id={controlId}
      type={type}
      className={controlClass}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )

  const withIcon = icon ? (
    <div className="relative">
      <i
        className={cx(
          'bi pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-sm text-ink-subtle',
          icon
        )}
        aria-hidden="true"
      />
      {control}
    </div>
  ) : (
    control
  )

  if (!label && !hint && !error) return withIcon

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={controlId}
      className={wrapClassName}
    >
      {withIcon}
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, hint, error, required, className, wrapClassName, rows = 3, id, ...rest },
  ref
) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const invalid = Boolean(error)

  const control = (
    <textarea
      ref={ref}
      id={controlId}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx('field', invalid && 'field-invalid', className)}
      {...rest}
    />
  )

  if (!label && !hint && !error) return control

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={controlId}
      className={wrapClassName}
    >
      {control}
    </Field>
  )
})

export const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    required,
    className,
    wrapClassName,
    options = [],
    placeholder,
    id,
    children,
    ...rest
  },
  ref
) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const invalid = Boolean(error)

  const control = (
    <select
      ref={ref}
      id={controlId}
      aria-invalid={invalid || undefined}
      className={cx('field', invalid && 'field-invalid', className)}
      {...rest}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  )

  if (!label && !hint && !error) return control

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={controlId}
      className={wrapClassName}
    >
      {control}
    </Field>
  )
})

export function Switch({ label, description, checked, onChange, disabled, id, className }) {
  const generatedId = useId()
  const controlId = id ?? generatedId

  return (
    <label
      htmlFor={controlId}
      className={cx(
        'flex cursor-pointer items-start gap-3 py-2',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      <input
        id={controlId}
        type="checkbox"
        role="switch"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cx(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-150',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-line'
        )}
      >
        <span
          className={cx(
            'absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-xs transition-[left] duration-150',
            checked ? 'left-[1.125rem]' : 'left-0.5'
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>}
      </span>
    </label>
  )
}

export function Checkbox({ label, checked, onChange, disabled, className }) {
  return (
    <label
      className={cx(
        'inline-flex cursor-pointer items-center gap-2 text-sm text-ink',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 shrink-0 rounded-xs border-line-strong text-accent accent-accent"
      />
      {label}
    </label>
  )
}
