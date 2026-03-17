import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LogoutButton from './LogoutButton'
import useAuthStore from '../stores/AuthStore'

describe('LogoutButton', () => {
    it('calls logout on click', async () => {
        const logout = vi.fn()
        useAuthStore.setState({ logout })

        globalThis.fetch = vi.fn(async () => ({ ok: true }))

        render(<LogoutButton />)
        await userEvent.click(screen.getByTitle('Log out'))

        expect(logout).toHaveBeenCalledOnce()
    })
})
