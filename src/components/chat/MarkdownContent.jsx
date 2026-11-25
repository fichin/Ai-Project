import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import './MarkdownContent.css'

// Assistant replies are model output, so they're treated as untrusted:
// react-markdown never parses raw HTML without rehype-raw (any tags in the
// text come through as literal text), and rehype-sanitize runs on top of
// that with GitHub's default schema as a second line of defence — it strips
// anything outside a known-safe set of elements, attributes and URL
// protocols (e.g. `javascript:` links).
const REHYPE_PLUGINS = [rehypeSanitize]

// Models answer in GitHub-flavoured Markdown (tables, ~~strike~~, task lists),
// which plain CommonMark leaves as raw text.
const REMARK_PLUGINS = [remarkGfm]

const COMPONENTS = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  // Wide tables scroll inside their own box instead of stretching the bubble.
  // Focusable so keyboard users can scroll it with the arrow keys.
  table: ({ children }) => (
    <div className="table-scroll" role="region" aria-label="Table" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
}

function MarkdownContent({ children }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownContent
