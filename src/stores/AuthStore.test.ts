import { describe, it, expect, vi, beforeEach } from 'vitest'
import useAuthStore from './AuthStore'
import useTransferStore from './TransferStore'

function resetStore() {
    useAuthStore.setState({ authed: null })
}

describe('AuthStore', () => {
    beforeEach(() => {
        resetStore()
        vi.restoreAllMocks()
    })

    describe('checkAuth', () => {
        it('sets authed: true on 200', async () => {
            globalThis.fetch = vi.fn(async () => ({
                ok: true,
                status: 200,
            }))

            await useAuthStore.getState().checkAuth()
            expect(useAuthStore.getState().authed).toBe(true)
        })

        it('sets authed: false on 401', async () => {
            globalThis.fetch = vi.fn(async () => ({
                ok: false,
                status: 401,
            }))

            await useAuthStore.getState().checkAuth()
            expect(useAuthStore.getState().authed).toBe(false)
        })

        it('sets authed: false on network error', async () => {
            globalThis.fetch = vi.fn(async () => { throw new Error('Network error') })

            await useAuthStore.getState().checkAuth()
            expect(useAuthStore.getState().authed).toBe(false)
        })
    })

    describe('login', () => {
        it('sets authed: true', () => {
            useAuthStore.getState().login()
            expect(useAuthStore.getState().authed).toBe(true)
        })
    })

    describe('logout', () => {
        it('calls POST logout and sets authed: false', () => {
            globalThis.fetch = vi.fn(async () => ({ ok: true }))
            useAuthStore.setState({ authed: true })

            useAuthStore.getState().logout()

            expect(useAuthStore.getState().authed).toBe(false)
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/auth/logout',
                expect.objectContaining({ method: 'POST' }),
            )
        })

        it('resets TransferStore state', () => {
            useTransferStore.setState({
                transfers: [{ id: 1, type: 'text', content: 'x', created_at: '', size: null }],
                selected: [1],
                error: 'old error',
                usage: { used: 100, limit: 1000 },
            })

            globalThis.fetch = vi.fn(async () => ({ ok: true }))
            useAuthStore.getState().logout()

            const ts = useTransferStore.getState()
            expect(ts.transfers).toEqual([])
            expect(ts.selected).toEqual([])
            expect(ts.error).toBeNull()
            expect(ts.usage).toBeNull()
        })
    })
})
