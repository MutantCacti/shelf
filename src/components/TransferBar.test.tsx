import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransferBar from './TransferBar'
import useTransferStore from '../stores/TransferStore'

// LogoSpinner uses requestAnimationFrame + SVG imports — stub it
vi.mock('./LogoSpinner', () => ({
    default: ({ spinning }: { spinning?: boolean }) => (
        <div data-testid="logo-spinner" data-spinning={String(spinning ?? false)} />
    ),
}))

function resetStore(overrides = {}) {
    useTransferStore.setState({
        transfers: [],
        inflight: 0,
        activity: '',
        ready: true,
        error: null,
        statusText: '5 KB',
        usage: { used: 5000, limit: 1073741824 },
        selected: [],
        ...overrides,
    })
}

describe('TransferBar', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        resetStore()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders all toolbar buttons (desktop + mobile layouts)', () => {
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        expect(screen.getAllByTitle('Log out')).toHaveLength(2)
        expect(screen.getAllByTitle('Help')).toHaveLength(2)
        expect(screen.getAllByTitle('Upload files')).toHaveLength(2)
        expect(screen.getAllByTitle('Download selected')).toHaveLength(2)
        expect(screen.getAllByTitle('Delete selected')).toHaveLength(2)
        expect(screen.getByTitle('Send text')).toBeInTheDocument()
        expect(screen.getAllByTitle('Refresh')).toHaveLength(2)
    })

    it('Download button disabled when selected is empty', () => {
        resetStore({ selected: [] })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        screen.getAllByTitle('Download selected').forEach(btn => {
            expect(btn).toBeDisabled()
        })
    })

    it('Delete button disabled when selected is empty', () => {
        resetStore({ selected: [] })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        screen.getAllByTitle('Delete selected').forEach(btn => {
            expect(btn).toBeDisabled()
        })
    })

    it('Download button enabled when a file is selected', () => {
        resetStore({
            transfers: [{ id: 1, type: 'file', content: 'test.pdf', created_at: '', size: 100 }],
            selected: [1],
        })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        screen.getAllByTitle('Download selected').forEach(btn => {
            expect(btn).not.toBeDisabled()
        })
    })

    it('Delete button enabled when items are selected', () => {
        resetStore({ selected: [1] })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        screen.getAllByTitle('Delete selected').forEach(btn => {
            expect(btn).not.toBeDisabled()
        })
    })

    it('displays status text with formatted usage', () => {
        resetStore({ statusText: '5 KB' })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        vi.advanceTimersByTime(12 * 10)

        expect(screen.getAllByText('5 KB').length).toBeGreaterThanOrEqual(1)
    })

    it('displays selection count when items selected', () => {
        resetStore({ selected: [1, 2, 3] })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        vi.advanceTimersByTime(12 * 20)

        expect(screen.getAllByText('3 selected').length).toBeGreaterThanOrEqual(1)
    })


    it('displays error message', () => {
        resetStore({ error: 'Upload failed' })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })


    it('clicking refresh calls fetch', async () => {
        const fetchFn = vi.fn()
        useTransferStore.setState({ fetch: fetchFn } as any)

        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        const refreshBtns = screen.getAllByTitle('Refresh')
        await userEvent.click(refreshBtns[0])

        expect(fetchFn).toHaveBeenCalled()
    })


    it('passes spinning=true to LogoSpinner during activity', () => {
        resetStore({ activity: 'Loading' })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        const spinners = screen.getAllByTestId('logo-spinner')
        spinners.forEach(s => {
            expect(s).toHaveAttribute('data-spinning', 'true')
        })
    })

    it('passes spinning=false when idle', () => {
        resetStore({ activity: '' })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        const spinners = screen.getAllByTestId('logo-spinner')
        spinners.forEach(s => {
            expect(s).toHaveAttribute('data-spinning', 'false')
        })
    })

    it('shows activity string instead of status text during loading', () => {
        resetStore({ activity: 'Uploading', statusText: '5 KB' })
        render(<TransferBar onHelp={vi.fn()} onDelete={vi.fn()} />)

        vi.advanceTimersByTime(12 * 20)

        expect(screen.getAllByText('Uploading').length).toBeGreaterThanOrEqual(1)
    })
})
