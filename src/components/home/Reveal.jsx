import { useEffect, useRef, useState } from 'react'
import './Reveal.css'

// Lightweight scroll-reveal used to give each marketing section a subtle
// entrance as it comes into view. Pure IntersectionObserver, no dependency.
// Reduced-motion visitors get the content immediately (see Reveal.css) —
// the global prefers-reduced-motion rule in index.css already zeroes the
// transition duration, so this just avoids the observer doing pointless work.
function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={`home-reveal ${isVisible ? 'home-reveal-visible' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export default Reveal
