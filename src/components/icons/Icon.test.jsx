import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import Icon from './Icon'
import { ICONS } from './icons'

describe('Icon', () => {
  it('renders an svg with the shared visual attributes and the requested size', () => {
    const { container } = render(<Icon name="folder" size={18} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '18')
    expect(svg).toHaveAttribute('height', '18')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('stroke', 'currentColor')
    expect(svg).toHaveAttribute('stroke-width', '2')
  })

  it('defaults to size 20 when no size is given', () => {
    const { container } = render(<Icon name="close" />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '20')
    expect(svg).toHaveAttribute('height', '20')
  })

  it('renders every path/shape for a multi-element icon (e.g. the bot icon)', () => {
    const { container } = render(<Icon name="bot" />)

    expect(container.querySelector('rect')).toBeInTheDocument()
    expect(container.querySelector('path')).toBeInTheDocument()
  })

  it('renders nothing for an unknown icon name', () => {
    const { container } = render(<Icon name="does-not-exist" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('falls back to the given fallback icon when the name is unknown', () => {
    const { container } = render(<Icon name="does-not-exist" fallback="spark" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('path')).toHaveAttribute('d', ICONS.spark.props.d)
  })

  it('applies a passed className and forwards extra props to the svg element', () => {
    const { container } = render(<Icon name="check" className="my-icon" aria-hidden="true" />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('my-icon')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('every registered icon renders without error', () => {
    for (const name of Object.keys(ICONS)) {
      const { container, unmount } = render(<Icon name={name} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
      unmount()
    }
  })
})
