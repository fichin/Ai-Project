import { coreLabels } from './homeData'
import './HeroCore.css'

// The approved Pencil "AI Core" concept: layered hexagonal facets, orbit
// rings and an inner bright core — built entirely from SVG shapes and CSS,
// no 3D/WebGL. See the implementation notes in the Home build report for
// why: the approved design is fully achievable in 2D, so Three.js/R3F would
// be an unjustified dependency for this page.
function hexPoints(cx, cy, r, rotationDeg) {
  const points = []
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i + (rotationDeg * Math.PI) / 180
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`)
  }
  return points.join(' ')
}

const FACETS = [
  { r: 168, rotation: 12, opacity: 0.32 },
  { r: 128, rotation: -18, opacity: 0.48 },
  { r: 94, rotation: 28, opacity: 0.65 },
]

function HeroCore() {
  return (
    <div className="hero-core-stage" aria-hidden="true">
      <div className="hero-core-glow" />

      <svg className="hero-core-svg" viewBox="0 0 600 600" role="presentation">
        <defs>
          <linearGradient id="hc-facet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="hc-bright" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-cyan)" />
            <stop offset="55%" stopColor="var(--accent-blue)" />
            <stop offset="100%" stopColor="var(--accent-purple)" />
          </linearGradient>
          <filter id="hc-blur-sm" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <g className="hero-core-ring hero-core-ring-1">
          <ellipse cx="300" cy="300" rx="270" ry="270" />
        </g>
        <g className="hero-core-ring hero-core-ring-2">
          <ellipse cx="300" cy="300" rx="222" ry="222" />
        </g>
        <g className="hero-core-ring hero-core-ring-3">
          <ellipse cx="300" cy="300" rx="300" ry="168" />
        </g>

        {FACETS.map((facet) => (
          <polygon
            key={facet.r}
            className="hero-core-facet"
            points={hexPoints(300, 300, facet.r, facet.rotation)}
            fill="url(#hc-facet)"
            stroke="var(--accent-blue)"
            strokeOpacity="0.3"
            opacity={facet.opacity}
          />
        ))}

        <polygon
          className="hero-core-bright-glow"
          points={hexPoints(300, 300, 60, 8)}
          fill="var(--accent-blue)"
          filter="url(#hc-blur-sm)"
        />
        <polygon className="hero-core-bright" points={hexPoints(300, 300, 52, 8)} fill="url(#hc-bright)" />
        <circle className="hero-core-dot" cx="300" cy="300" r="14" fill="var(--text-primary)" filter="url(#hc-blur-sm)" />
      </svg>

      {coreLabels.map((label) => (
        <div
          key={label.id}
          className={`hero-core-label ${label.primary ? '' : 'hero-core-label-secondary'}`}
          style={{ top: label.top, left: label.left }}
        >
          <span className="hero-core-label-dot" />
          {label.label}
        </div>
      ))}
    </div>
  )
}

export default HeroCore
