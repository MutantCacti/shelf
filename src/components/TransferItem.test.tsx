import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransferItem from './TransferItem'
import useTransferStore from '../stores/TransferStore'
import { Transfer } from '../types/types'

const textTransfer: Transfer = {
    id: 1,
    type: 'text',
    content: 'Hello world',
    created_at: '2025-01-01T00:00:00Z',
    size: null,
}

const fileTransfer: Transfer = {
    id: 2,
    type: 'file',
    content: 'report.pdf',
    created_at: '2025-01-01T00:00:00Z',
    size: 1024,
}

const imageTransfer: Transfer = {
    id: 3,
    type: 'file',
    content: 'photo.jpg',
    created_at: '2025-06-15T12:00:00Z',
    size: 5000,
}

const nonImageFile: Transfer = {
    id: 4,
    type: 'file',
    content: 'archive.zip',
    created_at: '2025-01-01T00:00:00Z',
    size: 2048,
}

function resetStore() {
    useTransferStore.setState({
        transfers: [],
        inflight: 0,
        activity: '',
        ready: true,
        error: null,
        statusText: '',
        usage: null,
        selected: [],
    })
}

describe('TransferItem', () => {
    beforeEach(() => {
        resetStore()
        vi.restoreAllMocks()
    })


    it('renders text transfer with content preview', () => {
        render(<TransferItem transfer={textTransfer} />)
        expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    it('renders file transfer with filename', () => {
        render(<TransferItem transfer={nonImageFile} />)
        expect(screen.getByText('archive.zip')).toBeInTheDocument()
    })

    it('renders image file with thumbnail img', () => {
        render(<TransferItem transfer={imageTransfer} />)
        const img = screen.getByRole('img')
        expect(img).toHaveAttribute(
            'src',
            `/api/transfers/${imageTransfer.id}/thumbnail?v=${imageTransfer.created_at}`,
        )
    })


    it('double-click on text copies to clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        Object.assign(navigator, { clipboard: { writeText } })

        const { container } = render(<TransferItem transfer={textTransfer} />)
        const btn = container.querySelector('button')!

        await userEvent.dblClick(btn)
        expect(writeText).toHaveBeenCalledWith('Hello world')
    })


    it('double-click on file triggers download', async () => {
        const downloadFn = vi.fn()
        useTransferStore.setState({
            transfers: [fileTransfer],
        })
        const original = useTransferStore.getState().download
        useTransferStore.setState({ download: downloadFn } as any)

        const { container } = render(<TransferItem transfer={fileTransfer} />)
        const btn = container.querySelector('button')!
        await userEvent.dblClick(btn)

        expect(downloadFn).toHaveBeenCalledWith(fileTransfer.id)

        useTransferStore.setState({ download: original } as any)
    })


    it('click toggles selection', () => {
        vi.useFakeTimers()
        const { container } = render(<TransferItem transfer={textTransfer} />)
        const btn = container.querySelector('button')!

        fireEvent.click(btn)
        // The click handler debounces via window.setTimeout(50ms)
        act(() => { vi.advanceTimersByTime(100) })

        expect(useTransferStore.getState().selected).toContain(textTransfer.id)

        vi.useRealTimers()
    })


    it('shows active glow when selected', () => {
        useTransferStore.setState({ selected: [textTransfer.id] })
        const { container } = render(<TransferItem transfer={textTransfer} />)
        const wrapper = container.querySelector('.glow-wrap')!
        expect(wrapper.classList.contains('active')).toBe(true)
    })

    it('no active glow when not selected', () => {
        useTransferStore.setState({ selected: [] })
        const { container } = render(<TransferItem transfer={textTransfer} />)
        const wrapper = container.querySelector('.glow-wrap')!
        expect(wrapper.classList.contains('active')).toBe(false)
    })


    it('sets data-transfer-id on wrapper', () => {
        const { container } = render(<TransferItem transfer={textTransfer} />)
        expect(container.querySelector('[data-transfer-id="1"]')).toBeInTheDocument()
    })


    it('shows Copied feedback after double-click on text', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

        const { container } = render(<TransferItem transfer={textTransfer} />)
        const btn = container.querySelector('button')!

        await userEvent.dblClick(btn)
        expect(screen.getByText('Copied')).toBeInTheDocument()

        vi.unstubAllGlobals()
    })

    it('Copied feedback disappears after timeout', () => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

        render(<TransferItem transfer={textTransfer} />)

        act(() => {
            window.dispatchEvent(new CustomEvent('shelf:copy', { detail: textTransfer.id }))
        })

        expect(screen.getByText('Copied')).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(1300)
        })
        expect(screen.queryByText('Copied')).not.toBeInTheDocument()

        vi.useRealTimers()
        vi.unstubAllGlobals()
    })


    it('copies text when shelf:copy event fires with matching id', () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

        render(<TransferItem transfer={textTransfer} />)
        window.dispatchEvent(new CustomEvent('shelf:copy', { detail: textTransfer.id }))

        expect(writeText).toHaveBeenCalledWith('Hello world')
        vi.unstubAllGlobals()
    })

    it('ignores shelf:copy event with non-matching id', () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

        render(<TransferItem transfer={textTransfer} />)
        window.dispatchEvent(new CustomEvent('shelf:copy', { detail: 999 }))

        expect(writeText).not.toHaveBeenCalled()
        vi.unstubAllGlobals()
    })


    it('context menu calls onStartEdit', () => {
        const onStartEdit = vi.fn()
        const { container } = render(
            <TransferItem transfer={textTransfer} onStartEdit={onStartEdit} />
        )
        const wrapper = container.querySelector('.glow-wrap')!
        fireEvent.contextMenu(wrapper)
        expect(onStartEdit).toHaveBeenCalledOnce()
    })

    describe('edit mode', () => {
        it('renders textarea for text transfer in edit mode', () => {
            render(
                <TransferItem transfer={textTransfer} editing onCommitEdit={vi.fn()} onCancelEdit={vi.fn()} />
            )
            const textarea = screen.getByRole('textbox')
            expect(textarea.tagName).toBe('TEXTAREA')
        })

        it('renders input for file transfer in edit mode', () => {
            render(
                <TransferItem transfer={nonImageFile} editing onCommitEdit={vi.fn()} onCancelEdit={vi.fn()} />
            )
            const input = screen.getByRole('textbox')
            expect(input.tagName).toBe('INPUT')
        })

        it('Enter commits edit', async () => {
            const onCommitEdit = vi.fn()
            render(
                <TransferItem transfer={textTransfer} editing onCommitEdit={onCommitEdit} onCancelEdit={vi.fn()} />
            )
            const textarea = screen.getByRole('textbox')
            fireEvent.keyDown(textarea, { key: 'Enter' })
            expect(onCommitEdit).toHaveBeenCalledWith('Hello world')
        })

        it('Escape cancels edit', async () => {
            const onCancelEdit = vi.fn()
            render(
                <TransferItem transfer={textTransfer} editing onCommitEdit={vi.fn()} onCancelEdit={onCancelEdit} />
            )
            const textarea = screen.getByRole('textbox')
            fireEvent.keyDown(textarea, { key: 'Escape' })
            expect(onCancelEdit).toHaveBeenCalledOnce()
        })

        it('blur with content commits edit', () => {
            const onCommitEdit = vi.fn()
            render(
                <TransferItem transfer={textTransfer} editing onCommitEdit={onCommitEdit} onCancelEdit={vi.fn()} />
            )
            const textarea = screen.getByRole('textbox')
            fireEvent.blur(textarea)
            expect(onCommitEdit).toHaveBeenCalledWith('Hello world')
        })

        it('blur with empty content cancels edit', () => {
            const onCancelEdit = vi.fn()
            const emptyTransfer = { ...textTransfer, content: '   ' }
            render(
                <TransferItem transfer={emptyTransfer} editing onCommitEdit={vi.fn()} onCancelEdit={onCancelEdit} />
            )
            const textarea = screen.getByRole('textbox')
            fireEvent.blur(textarea)
            expect(onCancelEdit).toHaveBeenCalledOnce()
        })
    })

    describe('drag', () => {
        it('sets text/plain on drag start for text transfers', () => {
            const { container } = render(<TransferItem transfer={textTransfer} />)
            const wrapper = container.querySelector('.glow-wrap')!
            const dataTransfer = { setData: vi.fn() }
            fireEvent.dragStart(wrapper, { dataTransfer })
            expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'Hello world')
        })

        it('sets DownloadURL on drag start for file transfers', () => {
            const { container } = render(<TransferItem transfer={fileTransfer} />)
            const wrapper = container.querySelector('.glow-wrap')!
            const dataTransfer = { setData: vi.fn() }
            fireEvent.dragStart(wrapper, { dataTransfer })
            expect(dataTransfer.setData).toHaveBeenCalledWith(
                'DownloadURL',
                expect.stringContaining(`application/pdf:report.pdf:`)
            )
            expect(dataTransfer.setData).toHaveBeenCalledWith(
                'DownloadURL',
                expect.stringContaining(`/api/transfers/${fileTransfer.id}/download`)
            )
        })

        it('is not draggable in edit mode', () => {
            const { container } = render(
                <TransferItem transfer={textTransfer} editing onCommitEdit={vi.fn()} onCancelEdit={vi.fn()} />
            )
            const wrapper = container.querySelector('.glow-wrap')!
            expect(wrapper).toHaveAttribute('draggable', 'false')
        })
    })
})
