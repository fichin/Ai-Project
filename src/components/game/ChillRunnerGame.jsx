import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../Button'
import { useAuth } from '../../context/useAuth'
import { usePreferences } from '../../context/usePreferences'
import { ChillRunnerEngine } from './chillRunnerEngine'
import './ChillRunnerGame.css'

function bestScoreKey(userId) {
  return `ai-project:chill-runner:best:${userId ?? 'guest'}`
}

function readBestScore(userId) {
  try {
    return Number(localStorage.getItem(bestScoreKey(userId))) || 0
  } catch {
    return 0
  }
}

function writeBestScore(userId, value) {
  try {
    localStorage.setItem(bestScoreKey(userId), String(value))
  } catch {
    // Best-effort only — a private window or full storage quota just means
    // the best score won't persist across sessions.
  }
}

// Self-contained mini-game meant to be playable while a user waits on
// something (see AppShell's "🎮 SideQuest" trigger). All game state/physics
// live in chillRunnerEngine.js, which knows nothing about React — this
// component only wires up the canvas, input, resize, and a thin HUD, so the
// engine can be re-hosted elsewhere later (e.g. a real AI loading overlay)
// without touching this file's sibling.
function ChillRunnerGame() {
  const { user } = useAuth()
  const { preferences } = usePreferences()

  const canvasRef = useRef(null)
  const engineRef = useRef(null)

  const [gameState, setGameState] = useState('ready')
  const [score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [best, setBest] = useState(() => readBestScore(user?.id))

  useEffect(() => {
    const engine = new ChillRunnerEngine(canvasRef.current, {
      reducedMotion: preferences.reducedMotion,
      onScoreChange: setScore,
      onStateChange: setGameState,
      onGameOver: (finalRunScore) => {
        setFinalScore(finalRunScore)
        setBest((previousBest) => {
          if (finalRunScore <= previousBest) return previousBest
          writeBestScore(user?.id, finalRunScore)
          return finalRunScore
        })
      },
    })
    engineRef.current = engine

    const resizeObserver = new ResizeObserver(() => engine.resize())
    resizeObserver.observe(canvasRef.current)

    function handleVisibilityChange() {
      if (document.hidden) engine.pause()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      engine.destroy()
    }
    // Engine is constructed once per mount; reduced-motion/theme changes are
    // pushed to the existing instance by the effects below instead of
    // recreating it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.setReducedMotion(preferences.reducedMotion)
  }, [preferences.reducedMotion])

  useEffect(() => {
    engineRef.current?.refreshTheme()
  }, [preferences.theme, preferences.accent])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault()
        engineRef.current?.handlePrimaryInput()
      } else if (event.key === 'p' || event.key === 'P') {
        engineRef.current?.togglePause()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleStagePointerDown = useCallback((event) => {
    event.preventDefault()
    engineRef.current?.handlePrimaryInput()
  }, [])

  function stopBubble(event) {
    event.stopPropagation()
  }

  return (
    <div className="chill-runner">
      <div className="chill-runner-hud">
        <div className="chill-runner-scores">
          <span className="chill-runner-score">
            <span className="chill-runner-score-label">Score</span>
            <span className="chill-runner-score-value">{score}</span>
          </span>
          <span className="chill-runner-best">Best {best}</span>
        </div>

        {(gameState === 'running' || gameState === 'paused') && (
          <Button variant="secondary" onPointerDown={stopBubble} onClick={() => engineRef.current?.togglePause()}>
            {gameState === 'running' ? 'Pause' : 'Resume'}
          </Button>
        )}
      </div>

      <div className="chill-runner-stage" onPointerDown={handleStagePointerDown}>
        <canvas ref={canvasRef} className="chill-runner-canvas" />

        {gameState === 'ready' && (
          <div className="chill-runner-overlay">
            <p className="chill-runner-overlay-title">AI Runner</p>
            <p className="chill-runner-overlay-hint">Space, click, or tap to run</p>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="chill-runner-overlay">
            <p className="chill-runner-overlay-title">Paused</p>
            <p className="chill-runner-overlay-hint">Press P or tap Resume</p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="chill-runner-overlay">
            <p className="chill-runner-overlay-title">Game Over</p>
            <p className="chill-runner-overlay-hint">
              Score {finalScore} · Best {best}
            </p>
            <Button
              variant="primary"
              onPointerDown={stopBubble}
              onClick={() => engineRef.current?.restart()}
            >
              Play Again
            </Button>
          </div>
        )}
      </div>

      <p className="chill-runner-controls-hint">Space / click / tap to jump · P to pause</p>
    </div>
  )
}

export default ChillRunnerGame
