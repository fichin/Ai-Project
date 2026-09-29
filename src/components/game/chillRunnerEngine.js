// Framework-agnostic canvas game engine for SideQuest, displayed in-game as
// "AI Runner".
// Deliberately has zero React/router/app dependencies beyond a <canvas>
// element and a handful of CSS custom properties it reads for theming — so
// this whole file can be re-hosted anywhere later (e.g. inside a real AI
// loading state) without any changes. ChillRunnerGame.jsx is the only thing
// that knows this class exists.

// All physics/layout constants are expressed in a fixed virtual coordinate
// space, independent of the canvas's actual on-screen pixel size. Each
// resize() computes a single scale factor from virtual space to device
// pixels, so gameplay feel (jump arc, obstacle spacing, speed) is identical
// on a phone and a 4K monitor — only visual crispness changes.
const VIRTUAL_W = 960
const VIRTUAL_H = 320
const GROUND_Y = 256

const PLAYER_X = 96
const PLAYER_SIZE = 46
const GRAVITY = 2400
const JUMP_SPEED = 850

const BASE_SPEED = 380
const MAX_SPEED = 760
const SPEED_RAMP_PER_SEC = 7

// Obstacle spawn gap (seconds) shrinks as the run goes on but never below a
// floor derived from the jump's own airtime (~0.71s here), so two obstacles
// can never land close enough to force an unavoidable hit.
const MIN_GAP_FLOOR = 0.9
const MIN_GAP_START = 1.3
const MIN_GAP_RAMP_PER_SEC = 0.007
const GAP_JITTER = 0.55

const OBSTACLE_TYPES = [
  { id: 'bug', minTime: 0, weight: 3, w: 32, h: 32 },
  { id: 'block', minTime: 0, weight: 3, w: 44, h: 54 },
  { id: 'twin', minTime: 6, weight: 2, w: 104, h: 46 },
  { id: 'tower', minTime: 10, weight: 2, w: 34, h: 92 },
]

const THEME_VARS = {
  bgBase: '--bg-base',
  bgElevated: '--bg-elevated',
  borderSubtle: '--border-subtle',
  textSecondary: '--text-secondary',
  textTertiary: '--text-tertiary',
  accentCurrent: '--accent-current',
  accentBlue: '--accent-blue',
  accentPurple: '--accent-purple',
  accentCyan: '--accent-cyan',
  statusDanger: '--status-danger',
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export class ChillRunnerEngine {
  constructor(canvas, { reducedMotion = false, onScoreChange, onStateChange, onGameOver } = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.reducedMotion = reducedMotion
    this.onScoreChange = onScoreChange || (() => {})
    this.onStateChange = onStateChange || (() => {})
    this.onGameOver = onGameOver || (() => {})

    this.state = 'ready'
    this.rafId = null
    this.idleRafId = null
    this.lastTime = 0

    this.loop = this.loop.bind(this)
    this.idleTick = this.idleTick.bind(this)

    this.theme = {}
    this.resetState()
    this.refreshTheme()
    this.resize()
    this.startIdleLoop()
  }

  setReducedMotion(value) {
    this.reducedMotion = value
  }

  refreshTheme() {
    if (typeof window === 'undefined') return
    const styles = getComputedStyle(document.documentElement)
    for (const [key, cssVar] of Object.entries(THEME_VARS)) {
      const value = styles.getPropertyValue(cssVar).trim()
      if (value) this.theme[key] = value
    }
    this.draw()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const scale = rect.width / VIRTUAL_W

    this.canvas.width = Math.round(rect.width * dpr)
    this.canvas.height = Math.round(rect.height * dpr)
    this.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0)
    this.draw()
  }

  resetState() {
    this.elapsed = 0
    this.distance = 0
    this.scoreFloat = 0
    this.score = 0
    this.speed = BASE_SPEED
    this.obstacles = []
    this.spawnTimer = MIN_GAP_START
    this.player = { groundOffset: 0, vy: 0, onGround: true, squash: 0 }
    this.twinklePhase = 0
    this.idlePhase = 0
    this.bgDots = Array.from({ length: 36 }, () => this.spawnDot(Math.random() * VIRTUAL_W))
  }

  spawnDot(x) {
    return {
      x,
      y: 20 + Math.random() * (GROUND_Y - 60),
      r: 1 + Math.random() * 1.6,
      seed: Math.random() * Math.PI * 2,
    }
  }

  // --- state transitions --------------------------------------------------

  start() {
    this.stopIdleLoop()
    this.resetState()
    this.state = 'running'
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
    this.onStateChange(this.state)
    this.onScoreChange(0)
  }

  restart() {
    this.start()
  }

  pause() {
    if (this.state !== 'running') return
    this.state = 'paused'
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.onStateChange(this.state)
  }

  resume() {
    if (this.state !== 'paused') return
    this.state = 'running'
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
    this.onStateChange(this.state)
  }

  togglePause() {
    if (this.state === 'running') this.pause()
    else if (this.state === 'paused') this.resume()
  }

  jump() {
    if (this.state !== 'running' || !this.player.onGround) return
    this.player.vy = -JUMP_SPEED
    this.player.onGround = false
  }

  // Single entry point for "tap/click/space anywhere on the stage" — maps to
  // the right action for whatever state the game is currently in. Paused is
  // deliberately excluded so an accidental tap can't both resume and jump.
  handlePrimaryInput() {
    if (this.state === 'ready') this.start()
    else if (this.state === 'gameover') this.restart()
    else if (this.state === 'running') this.jump()
  }

  gameOver() {
    this.state = 'gameover'
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.onStateChange(this.state)
    this.onGameOver(this.score)
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.stopIdleLoop()
  }

  // --- idle animation (before the first run only) -------------------------

  startIdleLoop() {
    if (this.reducedMotion) return
    this.idleRafId = requestAnimationFrame(this.idleTick)
  }

  stopIdleLoop() {
    if (this.idleRafId) cancelAnimationFrame(this.idleRafId)
    this.idleRafId = null
  }

  idleTick(timestamp) {
    if (this.state !== 'ready') return
    this.idlePhase = timestamp / 1000
    this.draw()
    this.idleRafId = requestAnimationFrame(this.idleTick)
  }

  // --- main loop ------------------------------------------------------------

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 1 / 20)
    this.lastTime = timestamp
    this.update(dt)
    this.draw()
    if (this.state === 'running') {
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  update(dt) {
    this.elapsed += dt
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.elapsed * SPEED_RAMP_PER_SEC)
    this.distance += this.speed * dt

    this.scoreFloat += dt * (this.speed / BASE_SPEED) * 10
    const nextScore = Math.floor(this.scoreFloat)
    if (nextScore !== this.score) {
      this.score = nextScore
      this.onScoreChange(this.score)
    }

    const p = this.player
    if (!p.onGround) {
      p.vy += GRAVITY * dt
      p.groundOffset -= p.vy * dt
      if (p.groundOffset <= 0) {
        p.groundOffset = 0
        p.vy = 0
        p.onGround = true
        p.squash = 0.22
      }
    }
    if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 1.6)

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnObstacle()
      const minGap = clamp(MIN_GAP_START - this.elapsed * MIN_GAP_RAMP_PER_SEC, MIN_GAP_FLOOR, MIN_GAP_START)
      this.spawnTimer = minGap + Math.random() * GAP_JITTER
    }

    for (const obstacle of this.obstacles) obstacle.x -= this.speed * dt
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x + obstacle.w > -20)

    for (const obstacle of this.obstacles) {
      if (this.checkCollision(obstacle)) {
        this.gameOver()
        break
      }
    }

    if (!this.reducedMotion) this.twinklePhase += dt
    for (const dot of this.bgDots) {
      dot.x -= this.speed * 0.25 * dt
      if (dot.x < -4) Object.assign(dot, this.spawnDot(VIRTUAL_W + 4))
    }
  }

  spawnObstacle() {
    const candidates = OBSTACLE_TYPES.filter((type) => this.elapsed >= type.minTime)
    const totalWeight = candidates.reduce((sum, type) => sum + type.weight, 0)
    let roll = Math.random() * totalWeight
    let chosen = candidates[candidates.length - 1]
    for (const type of candidates) {
      if (roll < type.weight) {
        chosen = type
        break
      }
      roll -= type.weight
    }
    this.obstacles.push({ type: chosen.id, x: VIRTUAL_W + 10, w: chosen.w, h: chosen.h })
  }

  // Both rects get a small inset so hits feel fair — same convention as the
  // genre this is inspired by.
  checkCollision(obstacle) {
    const inset = 7
    const p = this.player
    const px = PLAYER_X + inset
    const pw = PLAYER_SIZE - inset * 2
    const py = GROUND_Y - PLAYER_SIZE - p.groundOffset + inset
    const ph = PLAYER_SIZE - inset * 2

    const ox = obstacle.x + inset * 0.6
    const ow = obstacle.w - inset * 1.2
    const oy = GROUND_Y - obstacle.h + inset * 0.6
    const oh = obstacle.h - inset * 1.2

    return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy
  }

  // --- drawing ---------------------------------------------------------------

  draw() {
    const ctx = this.ctx
    ctx.clearRect(0, 0, VIRTUAL_W, VIRTUAL_H)
    this.drawBackground(ctx)
    this.drawGround(ctx)
    for (const obstacle of this.obstacles) this.drawObstacle(ctx, obstacle)
    this.drawPlayer(ctx)
  }

  drawBackground(ctx) {
    const t = this.theme
    const sky = ctx.createLinearGradient(0, 0, 0, VIRTUAL_H)
    sky.addColorStop(0, t.bgBase || '#0a0a0a')
    sky.addColorStop(1, t.bgElevated || '#111318')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H)

    const glowA = ctx.createRadialGradient(180, 70, 10, 180, 70, 220)
    glowA.addColorStop(0, this.withAlpha(t.accentPurple, 0.12))
    glowA.addColorStop(1, this.withAlpha(t.accentPurple, 0))
    ctx.fillStyle = glowA
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H)

    const glowB = ctx.createRadialGradient(780, 110, 10, 780, 110, 260)
    glowB.addColorStop(0, this.withAlpha(t.accentCyan, 0.1))
    glowB.addColorStop(1, this.withAlpha(t.accentCyan, 0))
    ctx.fillStyle = glowB
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H)

    ctx.fillStyle = t.textSecondary || '#a1a5b0'
    for (const dot of this.bgDots) {
      const twinkle = this.reducedMotion ? 0.5 : 0.35 + 0.35 * Math.sin(this.twinklePhase * 2 + dot.seed)
      ctx.globalAlpha = clamp(twinkle, 0.08, 0.7) * 0.5
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  drawGround(ctx) {
    const t = this.theme

    ctx.strokeStyle = t.borderSubtle || '#1e2028'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.5
    const tickSpacing = 40
    const offset = this.distance % tickSpacing
    for (let x = -offset; x < VIRTUAL_W; x += tickSpacing) {
      ctx.beginPath()
      ctx.moveTo(x, GROUND_Y + 6)
      ctx.lineTo(x - 10, VIRTUAL_H)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    ctx.strokeStyle = t.accentCurrent || '#5b8cff'
    ctx.lineWidth = 2.5
    ctx.setLineDash([18, 14])
    ctx.lineDashOffset = -(this.distance % 32)
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(VIRTUAL_W, GROUND_Y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  drawObstacle(ctx, obstacle) {
    const t = this.theme
    const x = obstacle.x
    const y = GROUND_Y - obstacle.h

    if (obstacle.type === 'bug') {
      const cx = x + obstacle.w / 2
      const cy = y + obstacle.h / 2
      const r = obstacle.w / 2
      ctx.fillStyle = t.statusDanger || '#f87171'
      ctx.beginPath()
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx + r, cy)
      ctx.lineTo(cx, cy + r)
      ctx.lineTo(cx - r, cy)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = this.withAlpha(t.statusDanger, 0.5)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx - r * 0.6, cy - r * 0.6)
      ctx.lineTo(cx - r * 1.3, cy - r * 1.1)
      ctx.moveTo(cx + r * 0.6, cy - r * 0.6)
      ctx.lineTo(cx + r * 1.3, cy - r * 1.1)
      ctx.stroke()
      return
    }

    if (obstacle.type === 'tower') {
      const grad = ctx.createLinearGradient(0, y, 0, y + obstacle.h)
      grad.addColorStop(0, t.accentCyan || '#22d3ee')
      grad.addColorStop(1, this.withAlpha(t.accentCyan, 0.35))
      ctx.fillStyle = grad
      this.roundRect(ctx, x, y, obstacle.w, obstacle.h, 4)
      ctx.fill()
      ctx.fillStyle = t.accentCyan || '#22d3ee'
      ctx.beginPath()
      ctx.arc(x + obstacle.w / 2, y, 4, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    if (obstacle.type === 'twin') {
      const postW = 26
      ctx.fillStyle = t.accentPurple || '#8b5cf6'
      this.roundRect(ctx, x, y + (obstacle.h - 30), postW, 30, 3)
      ctx.fill()
      this.roundRect(ctx, x + obstacle.w - postW, y + (obstacle.h - 30), postW, 30, 3)
      ctx.fill()
      ctx.strokeStyle = this.withAlpha(t.accentPurple, 0.6)
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x + postW, y + (obstacle.h - 24))
      ctx.lineTo(x + obstacle.w - postW, y + (obstacle.h - 24))
      ctx.stroke()
      return
    }

    // block
    ctx.fillStyle = t.accentPurple || '#8b5cf6'
    this.roundRect(ctx, x, y, obstacle.w, obstacle.h, 6)
    ctx.fill()
    ctx.fillStyle = this.withAlpha(t.accentCyan, 0.8)
    ctx.beginPath()
    ctx.arc(x + obstacle.w / 2, y + obstacle.h / 2, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  drawPlayer(ctx) {
    const t = this.theme
    const p = this.player
    const idleBob = this.state === 'ready' && !this.reducedMotion ? Math.sin(this.idlePhase * 2.2) * 3 : 0
    const baseY = GROUND_Y - PLAYER_SIZE - p.groundOffset - idleBob

    const squash = p.squash
    const w = PLAYER_SIZE * (1 + squash * 0.4)
    const h = PLAYER_SIZE * (1 - squash)
    const x = PLAYER_X - (w - PLAYER_SIZE) / 2
    const y = baseY + (PLAYER_SIZE - h)

    if (!p.onGround) {
      ctx.fillStyle = this.withAlpha(t.accentCyan, 0.25)
      ctx.beginPath()
      ctx.ellipse(PLAYER_X + PLAYER_SIZE / 2, GROUND_Y + 4, 14, 5, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const grad = ctx.createLinearGradient(x, y, x, y + h)
    grad.addColorStop(0, t.accentBlue || '#5b8cff')
    grad.addColorStop(1, t.accentPurple || '#8b5cf6')
    ctx.fillStyle = grad
    this.roundRect(ctx, x, y, w, h, 10)
    ctx.fill()

    const eyePulse = this.reducedMotion ? 0.85 : 0.6 + 0.4 * Math.sin(this.elapsed * 4)
    ctx.fillStyle = this.withAlpha(t.accentCyan, eyePulse)
    ctx.beginPath()
    ctx.arc(x + w * 0.68, y + h * 0.36, 4.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = t.accentCyan || '#22d3ee'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + w * 0.5, y)
    ctx.lineTo(x + w * 0.62, y - 12)
    ctx.stroke()
    ctx.fillStyle = this.withAlpha(t.accentCyan, eyePulse)
    ctx.beginPath()
    ctx.arc(x + w * 0.62, y - 12, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  withAlpha(hexOrColor, alpha) {
    if (!hexOrColor) return `rgba(91, 140, 255, ${alpha})`
    if (hexOrColor.startsWith('#') && hexOrColor.length === 7) {
      const r = parseInt(hexOrColor.slice(1, 3), 16)
      const g = parseInt(hexOrColor.slice(3, 5), 16)
      const b = parseInt(hexOrColor.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    return hexOrColor
  }
}

export default ChillRunnerEngine
