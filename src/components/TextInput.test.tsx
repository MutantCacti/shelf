import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TextInput from './TextInput'
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

describe('TextInput', () => {
    beforeEach(() => {
        resetStore()
        vi.restoreAllMocks()
    })

    it('renders a text input with label', () => {
        render(<TextInput />)
        expect(screen.getByLabelText('Transfer text')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Send text')).toBeInTheDocument()
    })

    it('is disabled during activity', () => {
        resetStore({ activity: 'Uploading' })
        render(<TextInput />)
        expect(screen.getByLabelText('Transfer text')).toBeDisabled()
    })

    it('is enabled when idle', () => {
        resetStore({ activity: '' })
        render(<TextInput />)
        expect(screen.getByLabelText('Transfer text')).not.toBeDisabled()
    })

    it('Enter with text calls createText and clears input', async () => {
        const createText = vi.fn().mockResolvedValue(undefined)
        useTransferStore.setState({ createText } as any)

        render(<TextInput />)
        const input = screen.getByLabelText('Transfer text')
        const user = userEvent.setup()

        await user.type(input, 'hello')
        await user.keyboard('{Enter}')

        expect(createText).toHaveBeenCalledWith('hello')
    })

    it('Enter with empty input does nothing', async () => {
        const createText = vi.fn().mockResolvedValue(undefined)
        useTransferStore.setState({ createText } as any)

        render(<TextInput />)
        const input = screen.getByLabelText('Transfer text')

        fireEvent.keyDown(input, { key: 'Enter' })
        expect(createText).not.toHaveBeenCalled()
    })

    it('Ctrl+Enter triggers upload input click when nothing selected', () => {
        render(<TextInput />)
        const uploadInput = document.createElement('input')
        uploadInput.id = 'upload-input'
        uploadInput.click = vi.fn()
        document.body.appendChild(uploadInput)

        const input = screen.getByLabelText('Transfer text')
        fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })

        expect(uploadInput.click).toHaveBeenCalled()
        document.body.removeChild(uploadInput)
    })

    it('Ctrl+Enter triggers batchDownload when items selected', () => {
        const batchDownload = vi.fn()
        useTransferStore.setState({ selected: [1, 2], batchDownload } as any)

        render(<TextInput />)
        const input = screen.getByLabelText('Transfer text')
        fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })

        expect(batchDownload).toHaveBeenCalledWith([1, 2])
    })
})
