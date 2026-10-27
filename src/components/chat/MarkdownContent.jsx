import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import './MarkdownContent.css'

// Assistant replies are model output, so they're treated as untrusted:
// react-markdown never parses raw HTML without rehype-raw (any tags in the
// text come through as literal text), and rehype-sanitize runs on top of
// that with GitHub's default schema as a second line of defence — it strips
// anything outside a known-safe set of elements, attributes and URL
// protocols (e.g. `javascript:` links).
const REHYPE_PLUGINS = [rehypeSanitize]

const COMPONENTS = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

function MarkdownContent({ children }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown rehypePlugins={REHYPE_PLUGINS} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownContent
