import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewModal from './PreviewModal'
import useTransferStore from '../stores/TransferStore'
import { Transfer } from '../types/types'

const imageTransfer: Transfer = {
    id: 1,
    type: 'file',
    content: 'photo.jpg',
    created_at: '2026-01-01T00:00:00Z',
    size: 5000,
}

const archiveTransfer: Transfer = {
    id: 2,
    type: 'file',
    content: 'archive.zip',
    created_at: '2026-01-01T00:00:00Z',
    size: 2048,
}

const textTransfer: Transfer = {
    id: 3,
    type: 'text',
    content: 'first line\nsecond line',
    created_at: '2026-01-01T00:00:00Z',
    size: null,
}

const pdfTransfer: Transfer = {
    id: 5,
    type: 'file',
    content: 'doc.pdf',
    created_at: '2026-01-01T00:00:00Z',
    size: 10000,
}

describe('PreviewModal', () => {
    let originalDownload: (id: number) => void

    beforeAll(() => {
        originalDownload = useTransferStore.getState().download
    })

    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        useTransferStore.setState({ download: vi.fn() } as any)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders the filename', () => {
        render(<PreviewModal transfer={imageTransfer} onClose={vi.fn()} />)
        expect(screen.getByText('photo.jpg')).toBeInTheDocument()
    })

    it('renders an image for image transfers', () => {
        render(<PreviewModal transfer={imageTransfer} onClose={vi.fn()} />)
        const img = screen.getByAltText('photo.jpg') as HTMLImageElement
        expect(img.src).toContain('/api/transfers/1/download')
    })

    it('PDF preview URL uses inline=1 and Download button URL does not', async () => {
        useTransferStore.setState({ transfers: [pdfTransfer], download: originalDownload } as any)

        const open = vi.spyOn(window, 'open').mockImplementation(() => null)

        render(<PreviewModal transfer={pdfTransfer} onClose={vi.fn()} />)

        const iframe = screen.getByTitle('doc.pdf') as HTMLIFrameElement
        expect(iframe.src).toContain('inline=1')

        await userEvent.click(screen.getByLabelText('Download'))

        const url = open.mock.calls[0][0] as string
        expect(url).toContain('/api/transfers/5/download')
        expect(url).not.toContain('inline=1')

        open.mockRestore()
    })

    it('cache-busts the download URL with created_at', () => {
        const a: Transfer = { ...imageTransfer, id: 7, created_at: '2026-01-01T00:00:00Z' }
        const b: Transfer = { ...imageTransfer, id: 7, created_at: '2026-04-27T12:00:00Z' }

        const { unmount } = render(<PreviewModal transfer={a} onClose={vi.fn()} />)
        const srcA = (screen.getByAltText('photo.jpg') as HTMLImageElement).src
        unmount()

        render(<PreviewModal transfer={b} onClose={vi.fn()} />)
        const srcB = (screen.getByAltText('photo.jpg') as HTMLImageElement).src

        expect(srcA).toContain('/api/transfers/7/download?v=')
        expect(srcB).toContain('/api/transfers/7/download?v=')
        expect(srcA).not.toBe(srcB)
    })

    it('renders a no-preview fallback for unsupported file types', () => {
        render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} />)
        expect(screen.getByText('No preview available')).toBeInTheDocument()
    })

    it('Escape dismisses the modal', () => {
        const onClose = vi.fn()
        render(<PreviewModal transfer={imageTransfer} onClose={onClose} />)

        fireEvent.keyDown(window, { key: 'Escape' })
        vi.advanceTimersByTime(200)

        expect(onClose).toHaveBeenCalledOnce()
    })

    it('clicking the backdrop dismisses the modal', async () => {
        const onClose = vi.fn()
        render(<PreviewModal transfer={imageTransfer} onClose={onClose} />)

        const backdrop = screen.getByTestId('preview-modal')
        await userEvent.click(backdrop)
        vi.advanceTimersByTime(200)

        expect(onClose).toHaveBeenCalledOnce()
    })

    it('clicking the close button dismisses the modal', async () => {
        const onClose = vi.fn()
        render(<PreviewModal transfer={imageTransfer} onClose={onClose} />)

        await userEvent.click(screen.getByLabelText('Close'))
        vi.advanceTimersByTime(200)

        expect(onClose).toHaveBeenCalledOnce()
    })

    it('Download button calls store.download', async () => {
        const download = vi.fn()
        useTransferStore.setState({ download } as any)
        render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} />)

        await userEvent.click(screen.getByLabelText('Download'))

        expect(download).toHaveBeenCalledWith(2)
    })

    it('renders text content for text-type transfers', () => {
        render(<PreviewModal transfer={textTransfer} onClose={vi.fn()} />)
        const modal = screen.getByTestId('preview-modal')
        expect(modal).toHaveTextContent('first line')
        expect(modal).toHaveTextContent('second line')
    })

    it('shows Copy (not Download) button for text-type transfers', () => {
        render(<PreviewModal transfer={textTransfer} onClose={vi.fn()} />)
        expect(screen.getByLabelText('Copy')).toBeInTheDocument()
        expect(screen.queryByLabelText('Download')).not.toBeInTheDocument()
    })

    it('Copy button writes text to clipboard', async () => {
        const writeText = vi.fn()
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        })

        render(<PreviewModal transfer={textTransfer} onClose={vi.fn()} />)
        await userEvent.click(screen.getByLabelText('Copy'))

        expect(writeText).toHaveBeenCalledWith('first line\nsecond line')
    })
})
