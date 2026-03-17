import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadButton from './UploadButton'
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

describe('UploadButton', () => {
    beforeEach(() => {
        resetStore()
        vi.restoreAllMocks()
    })

    it('renders with title', () => {
        render(<UploadButton />)
        expect(screen.getByTitle('Upload files')).toBeInTheDocument()
    })

    it('has a hidden file input that accepts multiple files', () => {
        render(<UploadButton />)
        const input = document.getElementById('upload-input') as HTMLInputElement
        expect(input).toBeInTheDocument()
        expect(input.type).toBe('file')
        expect(input.multiple).toBe(true)
    })

    it('calls uploadFile for each selected file', () => {
        const uploadFile = vi.fn()
        useTransferStore.setState({ uploadFile } as any)

        render(<UploadButton />)
        const input = document.getElementById('upload-input') as HTMLInputElement

        const file1 = new File(['a'], 'a.txt', { type: 'text/plain' })
        const file2 = new File(['b'], 'b.txt', { type: 'text/plain' })

        fireEvent.change(input, { target: { files: [file1, file2] } })

        expect(uploadFile).toHaveBeenCalledTimes(2)
        expect(uploadFile).toHaveBeenCalledWith(file1)
        expect(uploadFile).toHaveBeenCalledWith(file2)
    })

    it('clears file input value after selection', () => {
        const uploadFile = vi.fn()
        useTransferStore.setState({ uploadFile } as any)

        render(<UploadButton />)
        const input = document.getElementById('upload-input') as HTMLInputElement

        const file = new File(['a'], 'a.txt', { type: 'text/plain' })
        fireEvent.change(input, { target: { files: [file] } })

        expect(input.value).toBe('')
    })
})
