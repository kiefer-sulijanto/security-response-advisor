import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { LoginPage } from '../pages/LoginPage'

// The logo is a PNG asset — stub it so jsdom doesn't choke on binary imports.
vi.mock('../images/new-logo-certis-x2.png', () => ({ default: 'test-logo.png' }))

// Helper: fill in both inputs then click Submit.
function submitForm(nameValue, badgeValue) {
  const [nameInput, badgeInput] = screen.getAllByRole('textbox')
  if (nameValue) fireEvent.change(nameInput, { target: { value: nameValue } })
  if (badgeValue) fireEvent.change(badgeInput, { target: { value: badgeValue } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('LoginPage — rendering', () => {
  it('renders the sign-in card', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    expect(screen.getByText(/enter your credentials/i)).toBeInTheDocument()
  })

  it('renders all three shift options', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    expect(screen.getByText(/morning shift/i)).toBeInTheDocument()
    expect(screen.getByText(/afternoon shift/i)).toBeInTheDocument()
    expect(screen.getByText(/night shift/i)).toBeInTheDocument()
  })
})

describe('LoginPage — validation', () => {
  it('shows an error when name is empty', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument()
  })

  it('shows an error when badge is empty but name is provided', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    submitForm('Bill Adams', null)
    expect(screen.getByText('Please enter your Staff ID.')).toBeInTheDocument()
  })

  it('shows an authorisation error for an unknown name/badge pair', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    submitForm('Unknown User', 'XX-9999')
    expect(screen.getByText(/do not match any authorised operator/i)).toBeInTheDocument()
  })

  it('shows an authorisation error when only the badge is wrong', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    submitForm('Bill Adams', 'CC-9999')
    expect(screen.getByText(/do not match any authorised operator/i)).toBeInTheDocument()
  })

  it('shows an authorisation error when only the name is wrong', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    submitForm('Wrong Name', 'CC-0001')
    expect(screen.getByText(/do not match any authorised operator/i)).toBeInTheDocument()
  })
})

describe('LoginPage — successful login', () => {
  it('calls onLogin with the correct user data', () => {
    const onLogin = vi.fn()
    render(<LoginPage onLogin={onLogin} />)
    submitForm('Bill Adams', 'CC-0001')
    expect(onLogin).toHaveBeenCalledOnce()
    const arg = onLogin.mock.calls[0][0]
    expect(arg.name).toBe('Bill Adams')
    expect(arg.badge).toBe('CC-0001')
    expect(arg.shift).toBeDefined()
    expect(arg.shift.id).toMatch(/morning|afternoon|night/)
  })

  it('does not call onLogin on invalid credentials', () => {
    const onLogin = vi.fn()
    render(<LoginPage onLogin={onLogin} />)
    submitForm('Hacker', 'XX-0000')
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('credential matching is case-insensitive for name and badge', () => {
    const onLogin = vi.fn()
    render(<LoginPage onLogin={onLogin} />)
    submitForm('bill adams', 'cc-0001')
    expect(onLogin).toHaveBeenCalledOnce()
  })

  it('all four valid users can log in', () => {
    const users = [
      { name: 'Bill Adams',    badge: 'CC-0001' },
      { name: 'Julia Roman',   badge: 'CC-0002' },
      { name: 'Jeffrey Cowan', badge: 'CC-0003' },
      { name: 'Renato Massey', badge: 'CC-0004' },
    ]
    for (const user of users) {
      const onLogin = vi.fn()
      const { unmount } = render(<LoginPage onLogin={onLogin} />)
      submitForm(user.name, user.badge)
      expect(onLogin).toHaveBeenCalledOnce()
      unmount()
    }
  })
})

describe('LoginPage — error clearing', () => {
  it('clears the error when the user types in the name field', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument()

    const [nameInput] = screen.getAllByRole('textbox')
    fireEvent.change(nameInput, { target: { value: 'a' } })
    expect(screen.queryByText('Please enter your name.')).not.toBeInTheDocument()
  })

  it('clears the error when the user types in the badge field', () => {
    render(<LoginPage onLogin={vi.fn()} />)
    submitForm('Bill Adams', null)
    expect(screen.getByText('Please enter your Staff ID.')).toBeInTheDocument()

    const [, badgeInput] = screen.getAllByRole('textbox')
    fireEvent.change(badgeInput, { target: { value: 'x' } })
    expect(screen.queryByText('Please enter your Staff ID.')).not.toBeInTheDocument()
  })
})
