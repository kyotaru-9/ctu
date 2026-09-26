import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  tone = 'danger',
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading} className="sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            onClick={onConfirm}
            loading={loading}
            className="sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p className="text-sm text-ink-muted">{description}</p>}
      {children}
    </Modal>
  )
}
