import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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

  it('renders GFM tables, strikethrough and task lists', async () => {
    const content = [
      '| Role | Company |',
      '| --- | --- |',
      '| Frontend | Acme |',
      '',
      'This is ~~old~~ news.',
      '',
      '- [x] Send CV',
      '- [ ] Follow up',
    ].join('\n')

    render(<ChatMessage role="assistant" content={content} />)

    const table = await screen.findByRole('table')
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((th) => th.textContent)).toEqual(['Role', 'Company'])
    expect(within(table).getByRole('cell', { name: 'Acme' })).toBeInTheDocument()

    // Wrapped in a labelled region that owns the horizontal scroll.
    const scroller = screen.getByRole('region', { name: 'Table' })
    expect(scroller).toHaveClass('table-scroll')
    expect(scroller).toContainElement(table)
    // In the Tab order, so keyboard users can reach it and scroll it.
    expect(scroller).toHaveAttribute('tabindex', '0')

    expect(screen.getByText('old').tagName).toBe('DEL')

    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    expect(boxes[0]).toBeChecked()
    expect(boxes[1]).not.toBeChecked()
    // Read-only: the user can't tick the model's checklist.
    boxes.forEach((box) => expect(box).toBeDisabled())
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

  it('keeps GFM output sanitized: table cells, autolinks and footnote ids', async () => {
    const content = [
      '| Name | Link |',
      '| --- | --- |',
      '| evil | [open](javascript:window.__xss=1) |',
      '| img | <img src="x" onerror="window.__xss=2"> |',
      '',
      'Bare text javascript:window.__xss=3 stays text.',
      '',
      'A claim.[^1]',
      '',
      '[^1]: The source.',
    ].join('\n')

    const { container } = render(<ChatMessage role="assistant" content={content} />)
    await screen.findByRole('table')

    const link = screen.getByText('open').closest('a')
    expect(link?.getAttribute('href') ?? '').not.toMatch(/javascript:/i)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()

    // GFM only autolinks http(s), www. and emails, so this never becomes a link.
    expect(screen.queryByRole('link', { name: /javascript:/i })).toBeNull()

    // Footnote ids get a prefix, so model text can't create an id like
    // "root" that clashes with (clobbers) the app's own elements.
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(ids.length).toBeGreaterThan(0)
    ids.forEach((id) => expect(id).toMatch(/^user-content-/))

    expect(window.__xss).toBeUndefined()
  })
})
