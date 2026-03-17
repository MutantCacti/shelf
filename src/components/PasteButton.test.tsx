import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasteButton from './PasteButton'
import useTransferStore from '../stores/TransferStore'

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

describe('PasteButton', () => {
    beforeEach(() => {
        resetStore()
        vi.restoreAllMocks()
    })

    it('renders with title', () => {
        render(<PasteButton />)
        expect(screen.getByTitle('Paste from clipboard')).toBeInTheDocument()
    })

    it('pastes text from clipboard', async () => {
        const createText = vi.fn().mockResolvedValue(undefined)
        useTransferStore.setState({ createText } as any)

        const textBlob = new Blob(['pasted text'], { type: 'text/plain' })
        Object.assign(navigator, {
            clipboard: {
                read: vi.fn().mockResolvedValue([{
                    types: ['text/plain'],
                    getType: vi.fn().mockResolvedValue(textBlob),
                }]),
            },
        })

        render(<PasteButton />)
        await userEvent.click(screen.getByTitle('Paste from clipboard'))

        expect(createText).toHaveBeenCalledWith('pasted text')
    })

    it('pastes image from clipboard as file upload', async () => {
        const uploadFile = vi.fn()
        useTransferStore.setState({ uploadFile } as any)

        const imageBlob = new Blob(['fake-image'], { type: 'image/png' })
        Object.assign(navigator, {
            clipboard: {
                read: vi.fn().mockResolvedValue([{
                    types: ['image/png'],
                    getType: vi.fn().mockResolvedValue(imageBlob),
                }]),
            },
        })

        render(<PasteButton />)
        await userEvent.click(screen.getByTitle('Paste from clipboard'))

        expect(uploadFile).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'clipboard.png',
                type: 'image/png',
            })
        )
    })

    it('ignores empty text from clipboard', async () => {
        const createText = vi.fn()
        useTransferStore.setState({ createText } as any)

        const emptyBlob = new Blob(['   '], { type: 'text/plain' })
        Object.assign(navigator, {
            clipboard: {
                read: vi.fn().mockResolvedValue([{
                    types: ['text/plain'],
                    getType: vi.fn().mockResolvedValue(emptyBlob),
                }]),
            },
        })

        render(<PasteButton />)
        await userEvent.click(screen.getByTitle('Paste from clipboard'))

        expect(createText).not.toHaveBeenCalled()
    })

    it('handles clipboard permission denied gracefully', async () => {
        Object.assign(navigator, {
            clipboard: {
                read: vi.fn().mockRejectedValue(new Error('Permission denied')),
            },
        })

        render(<PasteButton />)
        await userEvent.click(screen.getByTitle('Paste from clipboard'))
    })
})
