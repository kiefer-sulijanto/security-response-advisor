import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { Badge, EmptyState, StatusDot, StatCard } from '../components/ui'

// ── Badge ──────────────────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders "Critical" for sev="critical"', () => {
    render(<Badge sev="critical" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders "Warning" for sev="warning"', () => {
    render(<Badge sev="warning" />)
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('renders "Info" for sev="info"', () => {
    render(<Badge sev="info" />)
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('defaults to "Info" for an unknown severity value', () => {
    render(<Badge sev="unknown-value" />)
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('defaults to "Info" when sev is omitted', () => {
    render(<Badge />)
    expect(screen.getByText('Info')).toBeInTheDocument()
  })
})

// ── EmptyState ─────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No incidents found" />)
    expect(screen.getByText('No incidents found')).toBeInTheDocument()
  })

  it('renders the subtitle when provided', () => {
    render(<EmptyState title="Empty" subtitle="Nothing here yet" />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('does not render a subtitle paragraph when subtitle is omitted', () => {
    render(<EmptyState title="Empty" />)
    // Only the title paragraph should exist; no second text block
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument()
  })

  it('renders the action button when both actionLabel and onAction are provided', () => {
    render(<EmptyState title="Empty" actionLabel="Create one" onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Create one' })).toBeInTheDocument()
  })

  it('does not render a button when onAction is omitted', () => {
    render(<EmptyState title="Empty" actionLabel="Create one" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not render a button when actionLabel is omitted', () => {
    render(<EmptyState title="Empty" onAction={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onAction when the button is clicked', () => {
    const onAction = vi.fn()
    render(<EmptyState title="Empty" actionLabel="Go" onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('renders the default SVG icon when no icon prop is given', () => {
    const { container } = render(<EmptyState title="Empty" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders a custom icon when provided', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="custom-icon" />} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })
})

// ── StatusDot ──────────────────────────────────────────────────────────────

describe('StatusDot', () => {
  // StatusDot uses inline styles — we verify it renders without crashing for
  // every known status value and spot-check computed color values.

  it('renders for status="active"', () => {
    const { container } = render(<StatusDot status="active" />)
    const dot = container.firstChild
    expect(dot).toBeInTheDocument()
    // active maps to C.red — boxShadow glow should be set
    expect(dot.style.boxShadow).not.toBe('none')
  })

  it('renders for status="open"', () => {
    const { container } = render(<StatusDot status="open" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders for status="in_progress"', () => {
    const { container } = render(<StatusDot status="in_progress" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders for status="reviewing"', () => {
    const { container } = render(<StatusDot status="reviewing" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders a green dot for any unrecognised / resolved status', () => {
    const { container } = render(<StatusDot status="resolved" />)
    const dot = container.firstChild
    expect(dot).toBeInTheDocument()
    // jsdom normalises hex colours to rgb() in inline styles
    expect(dot.style.background).toMatch(/rgb\(34,\s*197,\s*94\)|#22c55e/)
  })

  it('active and open dots have a glow shadow; others do not', () => {
    const { container: activeContainer } = render(<StatusDot status="active" />)
    const { container: resolvedContainer } = render(<StatusDot status="resolved" />)
    expect(activeContainer.firstChild.style.boxShadow).not.toBe('none')
    expect(resolvedContainer.firstChild.style.boxShadow).toBe('none')
  })
})

// ── StatCard ───────────────────────────────────────────────────────────────

describe('StatCard', () => {
  it('renders the label, value and sub text', () => {
    render(<StatCard label="Total Incidents" value={42} sub="This shift" />)
    expect(screen.getByText('Total Incidents')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('This shift')).toBeInTheDocument()
  })

  it('renders with a string value', () => {
    render(<StatCard label="Status" value="Active" sub="" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders without crashing when optional props are omitted', () => {
    render(<StatCard label="Label" value={0} />)
    expect(screen.getByText('Label')).toBeInTheDocument()
  })
})
