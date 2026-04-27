import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('PreviewModal', () => {
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
