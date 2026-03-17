import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccessPage from '../pages/AccessPage'

describe('AccessPage', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('renders password input', () => {
        render(<AccessPage onLogin={vi.fn()} />)

        const input = screen.getByLabelText('Password')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('type', 'password')
    })

    it('renders sign-in button', () => {
        render(<AccessPage onLogin={vi.fn()} />)
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    })

    it('sign-in button disabled when password is empty', () => {
        render(<AccessPage onLogin={vi.fn()} />)
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    })

    it('calls onLogin on successful form submission', async () => {
        const onLogin = vi.fn()
        globalThis.fetch = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({}),
            text: async () => '',
        }))

        render(<AccessPage onLogin={onLogin} />)
        const user = userEvent.setup()

        await user.type(screen.getByLabelText('Password'), 'secret')
        await user.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(globalThis.fetch).toHaveBeenCalledWith(
            '/api/auth/login',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ password: 'secret' }),
            }),
        )
        expect(onLogin).toHaveBeenCalled()
    })

    it('shows error on invalid password', async () => {
        globalThis.fetch = vi.fn(async () => ({
            ok: false,
            status: 401,
        }))

        render(<AccessPage onLogin={vi.fn()} />)
        const user = userEvent.setup()

        await user.type(screen.getByLabelText('Password'), 'wrong')
        await user.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(await screen.findByText('Invalid password')).toBeInTheDocument()
    })

    it('shows connection error on network failure', async () => {
        globalThis.fetch = vi.fn(async () => { throw new Error('Network error') })

        render(<AccessPage onLogin={vi.fn()} />)
        const user = userEvent.setup()

        await user.type(screen.getByLabelText('Password'), 'test')
        await user.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(await screen.findByText('Connection failed')).toBeInTheDocument()
    })


    it('focuses password input when a printable key is pressed outside', () => {
        render(<AccessPage onLogin={vi.fn()} />)

        const input = screen.getByLabelText('Password')
        ;(input as HTMLElement).blur()

        fireEvent.keyDown(window, { key: 'a' })
        expect(document.activeElement).toBe(input)
    })

    it('does not focus when ctrl/meta key combos pressed', () => {
        render(<AccessPage onLogin={vi.fn()} />)
        const input = screen.getByLabelText('Password')
        ;(input as HTMLElement).blur()
        document.body.focus()

        fireEvent.keyDown(window, { key: 'a', ctrlKey: true })
        expect(document.activeElement).not.toBe(input)
    })


    it('shows "Signing in" text while loading', async () => {
        globalThis.fetch = vi.fn(() => new Promise(() => {}))

        render(<AccessPage onLogin={vi.fn()} />)
        const user = userEvent.setup()

        await user.type(screen.getByLabelText('Password'), 'test')
        await user.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(screen.getByRole('button', { name: 'Signing in' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Signing in' })).toBeDisabled()
    })
})
