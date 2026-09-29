import Modal from '../Modal'
import ChillRunnerGame from './ChillRunnerGame'
import './ChillRunnerModal.css'

// Thin wrapper around the shared Modal so the "🎮 SideQuest" topbar trigger
// in AppShell has somewhere to put the game. Kept separate from
// ChillRunnerGame on purpose — the game itself has no idea it lives in a
// modal, so it can be dropped into a different container later (e.g. a real
// AI loading state) without this file.
function ChillRunnerModal({ onClose }) {
  return (
    <Modal title="AI Runner" onClose={onClose} size="lg">
      <p className="chill-runner-modal-subtitle">Take a quick side quest while your agent works.</p>
      <ChillRunnerGame />
    </Modal>
  )
}

export default ChillRunnerModal
