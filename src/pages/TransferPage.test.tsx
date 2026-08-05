import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import TransferPage from './TransferPage'
import useTransferStore from '../stores/TransferStore'

// LogoSpinner uses rAF + SVG imports — stub it (TransferBar is rendered inside TransferGrid)
vi.mock('../components/LogoSpinner', () => ({
    default: ({ spinning }: { spinning?: boolean }) => (
        <div data-testid="logo-spinner" data-spinning={String(spinning ?? false)} />
    ),
}))

// Keep the SSE reconnect loop out of jsdom tests
vi.mock('../lib/sse', () => ({
    CLIENT_ID: 'test-client',
    connectEvents: vi.fn(() => ({ close: vi.fn() })),
}))

const textTransfer = { id: 1, type: 'text' as const, content: 'hello', created_at: '2026-01-01T00:00:00Z', size: null }

function resetStore(overrides = {}) {
    useTransferStore.setState({
        transfers: [textTransfer],
        inflight: 0,
        activity: '',
        ready: true,
        error: null,
        statusText: '',
        usage: null,
        selected: [],
        fetch: vi.fn(),
        createText: vi.fn().mockResolvedValue(null),
        uploadFile: vi.fn(),
        ...overrides,
    } as any)
}

function firePaste(text: string) {
    const event = new Event('paste', { bubbles: true, cancelable: true }) as any
    event.clipboardData = {
        files: [],
        getData: (type: string) => (type === 'text/plain' ? text : ''),
    }
    act(() => { window.dispatchEvent(event) })
}

describe('TransferPage paste handling', () => {
    beforeEach(() => resetStore())

    it('pasting text on the main page creates a text transfer', () => {
        render(<TransferPage onHelp={vi.fn()} />)
        firePaste('pasted content')
        expect(useTransferStore.getState().createText).toHaveBeenCalledWith('pasted content')
    })

    it('pasting while the preview modal is open does not create a transfer', () => {
        render(<TransferPage onHelp={vi.fn()} />)
        act(() => {
            window.dispatchEvent(new CustomEvent('shelf:preview', { detail: textTransfer.id }))
        })
        firePaste('pasted content')
        expect(useTransferStore.getState().createText).not.toHaveBeenCalled()
    })

    it('pasting into a contentEditable target does not create a transfer', () => {
        render(<TransferPage onHelp={vi.fn()} />)
        const editable = document.createElement('div')
        editable.contentEditable = 'true'
        Object.defineProperty(editable, 'isContentEditable', { value: true })
        document.body.appendChild(editable)

        const event = new Event('paste', { bubbles: true, cancelable: true }) as any
        event.clipboardData = { files: [], getData: () => 'pasted content' }
        act(() => { editable.dispatchEvent(event) })

        expect(useTransferStore.getState().createText).not.toHaveBeenCalled()
        editable.remove()
    })
})
