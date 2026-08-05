// Custom fetch-based EventSource so auth headers (e.g. Bearer keys) can be
// attached — the native EventSource only ever sends cookies.

// Identifies this tab to the server so its own mutations don't ping it back.
export const CLIENT_ID: string =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)

const INITIAL_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30000

// Minimal SSE wire-format parser: emits each event's joined data lines,
// ignores comment (:) heartbeats, tolerates \r\n and events split mid-chunk.
export function createSSEParser(onData: (data: string) => void): (chunk: string) => void {
    let buffer = ''
    let dataLines: string[] = []
    return (chunk: string) => {
        buffer += chunk
        while (true) {
            const nl = buffer.indexOf('\n')
            const cr = buffer.indexOf('\r')
            let end: number
            let skip: number
            if (nl === -1 && cr === -1) break
            if (cr !== -1 && (nl === -1 || cr < nl)) {
                // A trailing \r may be half of a \r\n split across chunks
                if (cr === buffer.length - 1) break
                end = cr
                skip = buffer[cr + 1] === '\n' ? 2 : 1
            } else {
                end = nl
                skip = 1
            }
            const line = buffer.slice(0, end)
            buffer = buffer.slice(end + skip)
            if (line === '') {
                if (dataLines.length > 0) onData(dataLines.join('\n'))
                dataLines = []
            } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).replace(/^ /, ''))
            }
        }
    }
}

interface ConnectOptions {
    url: string
    onPing: () => void
    headers?: Record<string, string>
}

export function connectEvents({ url, onPing, headers }: ConnectOptions): { close: () => void } {
    let closed = false
    let controller: AbortController | null = null
    let backoff = INITIAL_BACKOFF_MS

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    async function readStream(body: ReadableStream<Uint8Array>) {
        const reader = body.getReader()
        const decoder = new TextDecoder()
        const parse = createSSEParser(data => { if (data === 'changed') onPing() })
        while (true) {
            const { done, value } = await reader.read()
            if (done) return
            parse(decoder.decode(value, { stream: true }))
        }
    }

    async function run() {
        while (!closed) {
            controller = new AbortController()
            try {
                const res = await fetch(`${url}?client_id=${CLIENT_ID}`, {
                    credentials: 'include',
                    headers: { Accept: 'text/event-stream', ...headers },
                    signal: controller.signal,
                })
                if (res.ok && res.body) {
                    backoff = INITIAL_BACKOFF_MS
                    await readStream(res.body)
                } else if (res.status === 401) {
                    // Not authed: sit at the cap; the page-level auth flow owns logout
                    backoff = MAX_BACKOFF_MS
                }
            } catch {
                // Network error or abort — fall through to reconnect
            }
            if (closed) return
            await sleep(backoff)
            backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
        }
    }

    run()

    return {
        close() {
            closed = true
            controller?.abort()
        },
    }
}
