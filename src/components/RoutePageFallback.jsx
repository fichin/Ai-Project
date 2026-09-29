import './RoutePageFallback.css'

// Suspense fallback for lazy-loaded authenticated route pages — mirrors the
// existing in-page "Loading..." message style (e.g. ProjectDetails' status
// message) so a route chunk still downloading doesn't introduce a new look.
function RoutePageFallback() {
  return <p className="route-page-fallback">Loading...</p>
}

export default RoutePageFallback
