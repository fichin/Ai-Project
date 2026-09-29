import { ICONS } from './icons'

// Every icon this replaces was rendered the same way at its call site:
// viewBox="0 0 24 24", fill="none", stroke="currentColor", strokeWidth="2",
// with only the pixel size and the path data varying — so those attributes
// are fixed here rather than exposed as props. `size` covers every existing
// usage (they're all square: width === height). `strokeWidth` defaults to
// the "2" every icon but one used — the Home page's check icon was
// deliberately bolder (2.5) for legibility at its small size, so that one
// override is exposed rather than dropped.
function Icon({ name, size = 20, strokeWidth = 2, className, fallback, ...rest }) {
  const path = ICONS[name] ?? (fallback ? ICONS[fallback] : undefined)
  if (!path) return null

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {path}
    </svg>
  )
}

export default Icon
