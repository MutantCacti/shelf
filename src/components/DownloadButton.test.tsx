import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DownloadButton from './DownloadButton'
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

describe('DownloadButton', () => {
    beforeEach(() => {
        resetStore()
    })

    it('renders with title', () => {
        render(<DownloadButton />)
        expect(screen.getByTitle('Download selected')).toBeInTheDocument()
    })

    it('is disabled when nothing is selected', () => {
        render(<DownloadButton />)
        expect(screen.getByTitle('Download selected')).toBeDisabled()
    })

    it('is disabled when only text items are selected', () => {
        resetStore({
            transfers: [
                { id: 1, type: 'text', content: 'hello', created_at: '', size: null },
                { id: 2, type: 'text', content: 'world', created_at: '', size: null },
            ],
            selected: [1, 2],
        })
        render(<DownloadButton />)
        expect(screen.getByTitle('Download selected')).toBeDisabled()
    })

    it('is enabled when a file is selected', () => {
        resetStore({
            transfers: [
                { id: 1, type: 'file', content: 'doc.pdf', created_at: '', size: 100 },
            ],
            selected: [1],
        })
        render(<DownloadButton />)
        expect(screen.getByTitle('Download selected')).not.toBeDisabled()
    })

    it('is enabled when mix of text and file selected', () => {
        resetStore({
            transfers: [
                { id: 1, type: 'text', content: 'hello', created_at: '', size: null },
                { id: 2, type: 'file', content: 'doc.pdf', created_at: '', size: 100 },
            ],
            selected: [1, 2],
        })
        render(<DownloadButton />)
        expect(screen.getByTitle('Download selected')).not.toBeDisabled()
    })

    it('calls batchDownload with selected IDs on click', async () => {
        const batchDownload = vi.fn()
        resetStore({
            transfers: [
                { id: 1, type: 'file', content: 'a.pdf', created_at: '', size: 100 },
                { id: 2, type: 'file', content: 'b.pdf', created_at: '', size: 200 },
            ],
            selected: [1, 2],
            batchDownload,
        })

        render(<DownloadButton />)
        await userEvent.click(screen.getByTitle('Download selected'))

        expect(batchDownload).toHaveBeenCalledWith([1, 2])
    })
})
