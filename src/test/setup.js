// Runs once before the test file's module graph loads (see
// vite.config.js's `test.setupFiles`). Extends Vitest's `expect` with
// jest-dom matchers (toBeInTheDocument, toHaveClass, toBeDisabled, ...).
// React Testing Library's automatic post-test cleanup registers itself
// against the global `afterEach` that `test.globals: true` provides, so
// nothing else is needed here.
import '@testing-library/jest-dom'
