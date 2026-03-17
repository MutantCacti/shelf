import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import SendButton from './SendButton'
import useTransferStore from '../stores/TransferStore'

// SendButton monitors #text-input via DOM, so we need to provide one
function renderWithInput(storeOverrides = {}) {
    useTransferStore.setState({
        transfers: [],
        inflight: 0,
        activity: '',
        ready: true,
        error: null,
        statusText: '',
        usage: null,
        selected: [],
        ...storeOverrides,
    })

    const input = document.createElement('input')
    input.id = 'text-input'
    input.type = 'text'
    document.body.appendChild(input)

    const result = render(<SendButton />)
    return { ...result, input }
}

describe('SendButton', () => {
    afterEach(() => {
        const input = document.getElementById('text-input')
        if (input) input.remove()
    })

    it('renders with title', () => {
        renderWithInput()
        expect(screen.getByTitle('Send text')).toBeInTheDocument()
    })

    it('is disabled when text input is empty', () => {
        renderWithInput()
        expect(screen.getByTitle('Send text')).toBeDisabled()
    })

    it('is enabled when text input has content', () => {
        const { input } = renderWithInput()

        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        nativeSetter.call(input, 'hello')
        act(() => {
            input.dispatchEvent(new Event('input', { bubbles: true }))
        })

        expect(screen.getByTitle('Send text')).not.toBeDisabled()
    })

    it('is disabled during activity even with text', () => {
        const { input } = renderWithInput({ activity: 'Uploading' })

        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        nativeSetter.call(input, 'hello')
        act(() => {
            input.dispatchEvent(new Event('input', { bubbles: true }))
        })

        expect(screen.getByTitle('Send text')).toBeDisabled()
    })

    it('mousedown calls createText with input value and clears input', () => {
        const createText = vi.fn().mockResolvedValue(undefined)
        const { input } = renderWithInput({ createText })

        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        nativeSetter.call(input, 'send this')
        act(() => {
            input.dispatchEvent(new Event('input', { bubbles: true }))
        })

        fireEvent.mouseDown(screen.getByTitle('Send text'))

        expect(createText).toHaveBeenCalledWith('send this')
        expect(input.value).toBe('')
    })

    it('does not send when input is empty', () => {
        const createText = vi.fn().mockResolvedValue(undefined)
        renderWithInput({ createText })

        fireEvent.mouseDown(screen.getByTitle('Send text'))
        expect(createText).not.toHaveBeenCalled()
    })
})
