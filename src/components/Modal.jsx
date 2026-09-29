import { useRef } from 'react'
import { useDismissableLayer } from '../hooks/useDismissableLayer'
import Icon from './icons/Icon'
import './Modal.css'

// `size="lg"` widens the panel for content that needs more room than the
// default form-sized 460px (e.g. ChillRunnerModal) — every other caller
// omits it and keeps today's width unchanged.
function Modal({ title, onClose, children, closeOnOverlayClick = true, size }) {
  const panelRef = useRef(null)

  // Escape-to-close and the focus trap/restore are shared with every other
  // dialog-shaped overlay via useDismissableLayer (see its own file for the
  // full rationale). Click-outside-to-close stays right here as the
  // overlay's own onClick below — it's one line, not worth centralizing,
  // and centralizing it too would double-fire alongside the overlay click.
  useDismissableLayer({ onDismiss: onClose, dialogRef: panelRef })

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (closeOnOverlayClick) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`modal-panel ${size === 'lg' ? 'modal-panel-lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="modal-close" aria-label="Close dialog" onClick={onClose}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default Modal
