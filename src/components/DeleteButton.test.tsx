import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteButton from './DeleteButton'
import useTransferStore from '../stores/TransferStore'

function resetStore(overrides = {}) {
    useTransferStore.setState({
        transfers: [],
        inflight: 0,
        activity: '',
        ready: true,
        error: null,
        statusText: '',
        usage: null,
        selected: [],
        ...overrides,
    })
}

describe('DeleteButton', () => {
    beforeEach(() => {
        resetStore()
    })

    it('renders with title', () => {
        render(<DeleteButton onDelete={vi.fn()} />)
        expect(screen.getByTitle('Delete selected')).toBeInTheDocument()
    })

    it('is disabled when nothing is selected', () => {
        render(<DeleteButton onDelete={vi.fn()} />)
        expect(screen.getByTitle('Delete selected')).toBeDisabled()
    })

    it('is enabled when items are selected', () => {
        resetStore({ selected: [1, 2] })
        render(<DeleteButton onDelete={vi.fn()} />)
        expect(screen.getByTitle('Delete selected')).not.toBeDisabled()
    })

    it('calls onDelete when clicked with selection', async () => {
        const onDelete = vi.fn()
        resetStore({ selected: [1] })
        render(<DeleteButton onDelete={onDelete} />)

        await userEvent.click(screen.getByTitle('Delete selected'))
        expect(onDelete).toHaveBeenCalledOnce()
    })

    it('does not call onDelete when clicked with empty selection', async () => {
        const onDelete = vi.fn()
        resetStore({ selected: [] })
        render(<DeleteButton onDelete={onDelete} />)

        await userEvent.click(screen.getByTitle('Delete selected'))
        expect(onDelete).not.toHaveBeenCalled()
    })
})
