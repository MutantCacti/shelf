import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import TransferGrid from './TransferGrid'
import useTransferStore from '../stores/TransferStore'

// LogoSpinner uses rAF + SVG imports — stub it (TransferBar is rendered inside TransferGrid)
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
        statusText: '',
        usage: null,
        selected: [],
        fetch: vi.fn(),
        ...overrides,
    })
}

describe('TransferGrid', () => {
    beforeEach(() => {
        resetStore()
    })

    it('renders a TransferItem for each transfer in the store', () => {
        resetStore({
            transfers: [
                { id: 1, type: 'text', content: 'First', created_at: '', size: null },
                { id: 2, type: 'text', content: 'Second', created_at: '', size: null },
                { id: 3, type: 'file', content: 'photo.jpg', created_at: '', size: 500 },
            ],
        })

        render(<TransferGrid onHelp={vi.fn()} onDelete={vi.fn()} />)

        expect(screen.getByText('First')).toBeInTheDocument()
        expect(screen.getByText('Second')).toBeInTheDocument()
        expect(screen.getByText('photo.jpg')).toBeInTheDocument()
    })

    it('renders no items when transfers is empty', () => {
        resetStore({ transfers: [] })
        render(<TransferGrid onHelp={vi.fn()} onDelete={vi.fn()} />)

        expect(document.querySelector('[data-transfer-id]')).toBeNull()
    })

    it('calls uploadFile for each dropped file', () => {
        const uploadFile = vi.fn()
        resetStore({ uploadFile })

        const { container } = render(<TransferGrid onHelp={vi.fn()} onDelete={vi.fn()} />)
        const dropTarget = container.firstElementChild as HTMLElement

        const file1 = new File(['a'], 'a.txt', { type: 'text/plain' })
        const file2 = new File(['b'], 'b.png', { type: 'image/png' })

        fireEvent.dragOver(dropTarget, {
            dataTransfer: { files: [] },
        })

        fireEvent.drop(dropTarget, {
            dataTransfer: { files: [file1, file2] },
        })

        expect(uploadFile).toHaveBeenCalledTimes(2)
        expect(uploadFile).toHaveBeenCalledWith(file1)
        expect(uploadFile).toHaveBeenCalledWith(file2)
    })

    it('shelf:rename event triggers edit mode on the correct item', () => {
        resetStore({
            transfers: [
                { id: 10, type: 'text', content: 'Editable text', created_at: '', size: null },
                { id: 20, type: 'file', content: 'keep.txt', created_at: '', size: 100 },
            ],
        })

        render(<TransferGrid onHelp={vi.fn()} onDelete={vi.fn()} />)

        act(() => {
            window.dispatchEvent(new CustomEvent('shelf:rename', { detail: 10 }))
        })

        // TransferBar also has a textbox, so query by tag
        const textarea = document.querySelector('textarea')
        expect(textarea).toBeInTheDocument()
        expect(screen.getByText('keep.txt')).toBeInTheDocument()
    })

    it('calls fetch on mount', () => {
        const fetchFn = vi.fn()
        resetStore({ fetch: fetchFn })

        render(<TransferGrid onHelp={vi.fn()} onDelete={vi.fn()} />)
        expect(fetchFn).toHaveBeenCalled()
    })
})
