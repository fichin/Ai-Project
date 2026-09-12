import Modal from './Modal'
import Button from './Button'
import './ConfirmDialog.css'

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  error,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel} closeOnOverlayClick={!isSubmitting}>
      <p className="confirm-dialog-message">{message}</p>
      {error && <p className="confirm-dialog-error">{error}</p>}
      <div className="confirm-dialog-actions">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Deleting...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
