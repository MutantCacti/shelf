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
    group: null,
}

const archiveTransfer: Transfer = {
    id: 2,
    type: 'file',
    content: 'archive.zip',
    created_at: '2026-01-01T00:00:00Z',
    size: 2048,
    group: null,
}

const textTransfer: Transfer = {
    id: 3,
    type: 'text',
    content: 'first line\nsecond line',
    created_at: '2026-01-01T00:00:00Z',
    size: null,
    group: null,
}

const pdfTransfer: Transfer = {
    id: 5,
    type: 'file',
    content: 'doc.pdf',
    created_at: '2026-01-01T00:00:00Z',
    size: 10000,
    group: null,
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

    describe('edit', () => {
        it('renders an Edit pencil button when not editing', () => {
            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} />)
            expect(screen.getByLabelText('Edit')).toBeInTheDocument()
        })

        it('clicking Edit swaps the file header to an input', async () => {
            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} />)
            await userEvent.click(screen.getByLabelText('Edit'))
            const input = screen.getByLabelText('Edit') as HTMLInputElement
            expect(input.tagName).toBe('INPUT')
            expect(input.value).toBe('archive.zip')
        })

        it('startInEdit opens directly in edit mode for files', () => {
            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} startInEdit />)
            const input = screen.getByLabelText('Edit') as HTMLInputElement
            expect(input.tagName).toBe('INPUT')
        })

        it('startInEdit opens directly in edit mode for text', () => {
            render(<PreviewModal transfer={textTransfer} onClose={vi.fn()} startInEdit />)
            const editor = screen.getByLabelText('Edit')
            expect(editor.tagName).toBe('DIV')
            expect(editor.getAttribute('contenteditable')).toBe('true')
        })

        it('Save commits the new content via store.rename', async () => {
            const rename = vi.fn()
            useTransferStore.setState({ rename } as any)

            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} startInEdit />)
            const input = screen.getByLabelText('Edit') as HTMLInputElement
            await userEvent.clear(input)
            await userEvent.type(input, 'renamed.zip')
            await userEvent.click(screen.getByLabelText('Save'))

            expect(rename).toHaveBeenCalledWith(archiveTransfer.id, 'renamed.zip')
        })

        it('Enter in the edit input commits via store.rename', async () => {
            const rename = vi.fn()
            useTransferStore.setState({ rename } as any)

            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} startInEdit />)
            const input = screen.getByLabelText('Edit') as HTMLInputElement
            await userEvent.clear(input)
            await userEvent.type(input, 'renamed.zip{Enter}')

            expect(rename).toHaveBeenCalledWith(archiveTransfer.id, 'renamed.zip')
        })

        it('Escape cancels edit without dismissing the modal', async () => {
            const rename = vi.fn()
            const onClose = vi.fn()
            useTransferStore.setState({ rename } as any)

            render(<PreviewModal transfer={archiveTransfer} onClose={onClose} startInEdit />)
            fireEvent.keyDown(window, { key: 'Escape' })
            vi.advanceTimersByTime(200)

            expect(rename).not.toHaveBeenCalled()
            expect(onClose).not.toHaveBeenCalled()
            expect(screen.getByLabelText('Edit').tagName).toBe('BUTTON')
        })

        it('Enter committing a rename does not also trigger download', async () => {
            const rename = vi.fn()
            const download = vi.fn()
            useTransferStore.setState({ rename, download } as any)

            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} startInEdit />)
            const input = screen.getByLabelText('Edit') as HTMLInputElement
            await userEvent.clear(input)
            await userEvent.type(input, 'renamed.zip{Enter}')

            expect(rename).toHaveBeenCalledWith(archiveTransfer.id, 'renamed.zip')
            expect(download).not.toHaveBeenCalled()
        })

        it('Ctrl+Enter committing a text edit does not also copy', () => {
            const rename = vi.fn()
            const writeText = vi.fn()
            useTransferStore.setState({ rename } as any)
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText },
                configurable: true,
            })

            render(<PreviewModal transfer={textTransfer} onClose={vi.fn()} startInEdit />)
            const editor = screen.getByLabelText('Edit')
            fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

            expect(writeText).not.toHaveBeenCalled()
        })

        it('Escape inside the edit field cancels edit without dismissing', () => {
            const onClose = vi.fn()
            render(<PreviewModal transfer={archiveTransfer} onClose={onClose} startInEdit />)
            const input = screen.getByLabelText('Edit') as HTMLInputElement
            fireEvent.keyDown(input, { key: 'Escape' })
            vi.advanceTimersByTime(200)

            expect(onClose).not.toHaveBeenCalled()
            expect(screen.getByLabelText('Edit').tagName).toBe('BUTTON')
        })

        it('committing without a change does not call store.rename', async () => {
            const rename = vi.fn()
            useTransferStore.setState({ rename } as any)

            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} startInEdit />)
            await userEvent.click(screen.getByLabelText('Save'))

            expect(rename).not.toHaveBeenCalled()
        })
    })

    describe('keybinds', () => {
        it('E enters edit mode for a file', () => {
            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} />)
            fireEvent.keyDown(window, { key: 'e' })
            const input = screen.getByLabelText('Edit') as HTMLInputElement
            expect(input.tagName).toBe('INPUT')
        })

        it('E enters edit mode for text', () => {
            render(<PreviewModal transfer={textTransfer} onClose={vi.fn()} />)
            fireEvent.keyDown(window, { key: 'e' })
            const editor = screen.getByLabelText('Edit')
            expect(editor.getAttribute('contenteditable')).toBe('true')
        })

        it('typing e while editing does not re-trigger startEdit', () => {
            render(<PreviewModal transfer={textTransfer} onClose={vi.fn()} startInEdit />)
            const editor = screen.getByLabelText('Edit')
            const before = editor.outerHTML
            fireEvent.keyDown(window, { key: 'e' })
            expect(editor.outerHTML).toBe(before)
        })

        it('Enter copies content for text-type transfers', () => {
            const writeText = vi.fn()
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText },
                configurable: true,
            })

            render(<PreviewModal transfer={textTransfer} onClose={vi.fn()} />)
            fireEvent.keyDown(window, { key: 'Enter' })

            expect(writeText).toHaveBeenCalledWith('first line\nsecond line')
        })

        it('Enter calls store.download for file-type transfers', () => {
            const download = vi.fn()
            useTransferStore.setState({ download } as any)

            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} />)
            fireEvent.keyDown(window, { key: 'Enter' })

            expect(download).toHaveBeenCalledWith(archiveTransfer.id)
        })

        it('Ctrl+Enter does not call store.download', () => {
            const download = vi.fn()
            useTransferStore.setState({ download } as any)

            render(<PreviewModal transfer={archiveTransfer} onClose={vi.fn()} />)
            fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })

            expect(download).not.toHaveBeenCalled()
        })
    })
})
