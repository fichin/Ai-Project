import './SectionHead.css'

// Shared eyebrow + heading + subcopy block used by every Home section below
// the hero, so the "01 — AI CORE / 02 — WORKSPACE / ..." cinematic numbering
// and typography stay identical across sections instead of drifting.
function SectionHead({ eyebrow, heading, subcopy, align = 'center' }) {
  return (
    <div className={`home-section-head home-section-head-${align}`}>
      <p className="home-eyebrow">{eyebrow}</p>
      <h2>{heading}</h2>
      {subcopy && <p className="home-section-subcopy">{subcopy}</p>}
    </div>
  )
}

export default SectionHead
