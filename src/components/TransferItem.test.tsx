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


    it('double-click on text dispatches shelf:preview', async () => {
        useTransferStore.setState({ transfers: [textTransfer] })

        const onPreview = vi.fn()
        window.addEventListener('shelf:preview', onPreview)

        const { container } = render(<TransferItem transfer={textTransfer} />)
        const btn = container.querySelector('button')!
        await userEvent.dblClick(btn)

        expect(onPreview).toHaveBeenCalledOnce()
        expect((onPreview.mock.calls[0][0] as CustomEvent).detail).toBe(textTransfer.id)

        window.removeEventListener('shelf:preview', onPreview)
    })


    it('double-click on file dispatches shelf:preview', async () => {
        useTransferStore.setState({ transfers: [fileTransfer] })

        const onPreview = vi.fn()
        window.addEventListener('shelf:preview', onPreview)

        const { container } = render(<TransferItem transfer={fileTransfer} />)
        const btn = container.querySelector('button')!
        await userEvent.dblClick(btn)

        expect(onPreview).toHaveBeenCalledOnce()
        expect((onPreview.mock.calls[0][0] as CustomEvent).detail).toBe(fileTransfer.id)

        window.removeEventListener('shelf:preview', onPreview)
    })

    it('double-click leaves an unselected item unselected', async () => {
        useTransferStore.setState({ transfers: [fileTransfer], selected: [] })

        const { container } = render(<TransferItem transfer={fileTransfer} />)
        const btn = container.querySelector('button')!
        await userEvent.dblClick(btn)

        expect(useTransferStore.getState().selected).not.toContain(fileTransfer.id)
    })

    it('double-click leaves an already-selected item selected', async () => {
        useTransferStore.setState({ transfers: [fileTransfer], selected: [fileTransfer.id] })

        const { container } = render(<TransferItem transfer={fileTransfer} />)
        const btn = container.querySelector('button')!
        await userEvent.dblClick(btn)

        expect(useTransferStore.getState().selected).toContain(fileTransfer.id)
    })


    it('click toggles selection', () => {
        const { container } = render(<TransferItem transfer={textTransfer} />)
        const btn = container.querySelector('button')!

        fireEvent.click(btn)

        expect(useTransferStore.getState().selected).toContain(textTransfer.id)
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


    describe('right-click', () => {
        it('right-click on text copies content', () => {
            const writeText = vi.fn().mockResolvedValue(undefined)
            vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

            const { container } = render(<TransferItem transfer={textTransfer} />)
            const wrapper = container.querySelector('.glow-wrap')!
            fireEvent.contextMenu(wrapper)

            expect(writeText).toHaveBeenCalledWith('Hello world')
            vi.unstubAllGlobals()
        })

        it('right-click on file calls store.download', () => {
            const download = vi.fn()
            useTransferStore.setState({ download } as any)

            const { container } = render(<TransferItem transfer={fileTransfer} />)
            const wrapper = container.querySelector('.glow-wrap')!
            fireEvent.contextMenu(wrapper)

            expect(download).toHaveBeenCalledWith(fileTransfer.id)
        })

        it('right-click prevents the browser context menu', () => {
            const { container } = render(<TransferItem transfer={fileTransfer} />)
            const wrapper = container.querySelector('.glow-wrap')!
            const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
            wrapper.dispatchEvent(event)
            expect(event.defaultPrevented).toBe(true)
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
    })
})
