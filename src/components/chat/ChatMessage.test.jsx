import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import ChatMessage from './ChatMessage'

// ChatMessage lazy-loads MarkdownContent. Warming the module up front keeps
// its first (slow, under full-suite load) transform out of each test's
// findBy/waitFor timeout window.
beforeAll(async () => {
  await import('./MarkdownContent')
})

describe('ChatMessage — Markdown rendering', () => {
  it('renders bold text, lists, code blocks and safe links in assistant messages', async () => {
    const content = [
      'Here is **bold** and *italic* with `inline code`.',
      '',
      '- first item',
      '- second item',
      '',
      '```js',
      'const answer = 42',
      '```',
      '',
      '[Docs](https://example.com/docs)',
    ].join('\n')

    const { container } = render(<ChatMessage role="assistant" content={content} />)

    expect((await screen.findByText('bold')).tagName).toBe('STRONG')
    expect(screen.getByText('italic').tagName).toBe('EM')
    expect(screen.getByText('inline code').tagName).toBe('CODE')

    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['first item', 'second item'])

    const codeBlock = container.querySelector('pre > code')
    expect(codeBlock).not.toBeNull()
    expect(codeBlock.textContent).toBe('const answer = 42\n')

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('href', 'https://example.com/docs')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('keeps user messages as plain text', () => {
    const { container } = render(<ChatMessage role="user" content="**not bold** and `not code`" userName="Ada" />)

    expect(container.querySelector('strong')).toBeNull()
    expect(container.querySelector('code')).toBeNull()
    expect(screen.getByText('**not bold** and `not code`')).toBeInTheDocument()
  })

  it('renders non-string assistant content (e.g. the Home showcase JSX) as-is', () => {
    render(
      <ChatMessage
        role="assistant"
        content={
          <ul>
            <li>static item</li>
          </ul>
        }
      />,
    )

    expect(screen.getByRole('listitem')).toHaveTextContent('static item')
  })
})

describe('ChatMessage — HTML safety', () => {
  afterEach(() => {
    delete window.__xss
  })

  it('does not render or execute <script> tags, event-handler attributes or javascript: links', async () => {
    const content = [
      'Hello <script>window.__xss = "script"</script>',
      '',
      '<img src="x" onerror="window.__xss = \'onerror\'">',
      '',
      '<div onclick="window.__xss = \'onclick\'">raw div</div>',
      '',
      '[click me](javascript:window.__xss=1)',
    ].join('\n')
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const { container } = render(<ChatMessage role="assistant" content={content} />)
    // Wait for the lazy Markdown renderer, so the assertions below check its
    // output rather than the plain-text Suspense fallback.
    await waitFor(() => expect(container.querySelector('.markdown-content')).not.toBeNull())

    // No raw HTML became real elements…
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
    expect(container.querySelector('[onclick]')).toBeNull()
    // …and nothing ran.
    expect(window.__xss).toBeUndefined()
    expect(alertSpy).not.toHaveBeenCalled()

    // The javascript: URL is stripped, leaving a link with no usable href.
    const link = screen.getByText('click me').closest('a')
    expect(link?.getAttribute('href') ?? '').not.toMatch(/javascript:/i)

    alertSpy.mockRestore()
  })
})
