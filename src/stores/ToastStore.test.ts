import { describe, it, expect, vi, beforeEach } from 'vitest'
import useToastStore from './ToastStore'

function resetStore() {
    useToastStore.setState({ toasts: [] })
}

describe('ToastStore', () => {
    beforeEach(() => {
        resetStore()
        vi.useFakeTimers()
    })

    describe('show', () => {
        it('adds a toast', () => {
            useToastStore.getState().show('Hello')
            const toasts = useToastStore.getState().toasts

            expect(toasts).toHaveLength(1)
            expect(toasts[0].message).toBe('Hello')
        })

        it('adds multiple toasts with unique IDs', () => {
            useToastStore.getState().show('First')
            useToastStore.getState().show('Second')
            const toasts = useToastStore.getState().toasts

            expect(toasts).toHaveLength(2)
            expect(toasts[0].id).not.toBe(toasts[1].id)
        })

        it('auto-dismisses after 2 seconds', () => {
            useToastStore.getState().show('Temporary')
            expect(useToastStore.getState().toasts).toHaveLength(1)

            vi.advanceTimersByTime(2000)
            expect(useToastStore.getState().toasts).toHaveLength(0)
        })

        it('auto-dismisses only the right toast', () => {
            useToastStore.getState().show('First')
            vi.advanceTimersByTime(1000)
            useToastStore.getState().show('Second')

            vi.advanceTimersByTime(1000)
            const toasts = useToastStore.getState().toasts
            expect(toasts).toHaveLength(1)
            expect(toasts[0].message).toBe('Second')

            vi.advanceTimersByTime(1000)
            expect(useToastStore.getState().toasts).toHaveLength(0)
        })
    })

    describe('dismiss', () => {
        it('removes a specific toast by ID', () => {
            useToastStore.getState().show('Keep')
            useToastStore.getState().show('Remove')
            const toasts = useToastStore.getState().toasts
            const removeId = toasts[1].id

            useToastStore.getState().dismiss(removeId)

            const remaining = useToastStore.getState().toasts
            expect(remaining).toHaveLength(1)
            expect(remaining[0].message).toBe('Keep')
        })

        it('does nothing for non-existent ID', () => {
            useToastStore.getState().show('Only')
            useToastStore.getState().dismiss(99999)
            expect(useToastStore.getState().toasts).toHaveLength(1)
        })
    })
})
