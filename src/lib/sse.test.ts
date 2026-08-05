import { describe, it, expect, vi, afterEach } from 'vitest'
import { createSSEParser, connectEvents } from './sse'

describe('createSSEParser', () => {
    it('emits data events and ignores comments', () => {
        const onData = vi.fn()
        const parse = createSSEParser(onData)
        parse(': keep-alive\n\ndata: changed\n\n')
        expect(onData).toHaveBeenCalledTimes(1)
        expect(onData).toHaveBeenCalledWith('changed')
    })

    it('handles an event split across chunks', () => {
        const onData = vi.fn()
        const parse = createSSEParser(onData)
        parse('data: cha')
        parse('nged\n')
        expect(onData).not.toHaveBeenCalled()
        parse('\n')
        expect(onData).toHaveBeenCalledWith('changed')
    })

    it('handles \\r\\n line endings, including split across chunks', () => {
        const onData = vi.fn()
        const parse = createSSEParser(onData)
        parse('data: changed\r')
        parse('\n\r\n')
        expect(onData).toHaveBeenCalledWith('changed')
    })

    it('joins multi-line data fields', () => {
        const onData = vi.fn()
        const parse = createSSEParser(onData)
        parse('data: a\ndata: b\n\n')
        expect(onData).toHaveBeenCalledWith('a\nb')
    })

    it('ignores comment-only heartbeats entirely', () => {
        const onData = vi.fn()
        const parse = createSSEParser(onData)
        parse(': ka\n\n: ka\n\n')
        expect(onData).not.toHaveBeenCalled()
    })
})

describe('connectEvents', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    function streamOf(...chunks: string[]) {
        const encoder = new TextEncoder()
        return new ReadableStream<Uint8Array>({
            start(controller) {
                for (const c of chunks) controller.enqueue(encoder.encode(c))
                controller.close()
            },
        })
    }

    it('calls onPing for changed events and reconnects with growing backoff', async () => {
        vi.useFakeTimers()
        const onPing = vi.fn()
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, status: 200, body: streamOf('data: changed\n\n') })
            .mockRejectedValue(new Error('down'))
        globalThis.fetch = fetchMock as any

        const conn = connectEvents({ url: '/api/transfers/events', onPing })

        await vi.waitFor(() => expect(onPing).toHaveBeenCalledTimes(1))
        expect(fetchMock).toHaveBeenCalledTimes(1)

        // Stream ended ok: reconnect after the initial 1s backoff
        await vi.advanceTimersByTimeAsync(1000)
        expect(fetchMock).toHaveBeenCalledTimes(2)

        // That attempt failed: next wait doubles to 2s
        await vi.advanceTimersByTimeAsync(1000)
        expect(fetchMock).toHaveBeenCalledTimes(2)
        await vi.advanceTimersByTimeAsync(1000)
        expect(fetchMock).toHaveBeenCalledTimes(3)

        conn.close()
    })

    it('close() stops reconnecting', async () => {
        vi.useFakeTimers()
        const fetchMock = vi.fn().mockRejectedValue(new Error('down'))
        globalThis.fetch = fetchMock as any

        const conn = connectEvents({ url: '/api/transfers/events', onPing: vi.fn() })
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

        conn.close()
        await vi.advanceTimersByTimeAsync(120000)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('sends the client id and custom headers', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, body: streamOf() })
        globalThis.fetch = fetchMock as any

        const conn = connectEvents({
            url: '/api/transfers/events',
            onPing: vi.fn(),
            headers: { Authorization: 'Bearer key' },
        })
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
        conn.close()

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toMatch(/\/api\/transfers\/events\?client_id=.+/)
        expect(init.headers.Accept).toBe('text/event-stream')
        expect(init.headers.Authorization).toBe('Bearer key')
        expect(init.credentials).toBe('include')
    })
})
