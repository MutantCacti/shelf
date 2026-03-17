import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useTransferStore from './TransferStore'

const transfer = (overrides = {}) => ({
    id: 1,
    type: 'text' as const,
    content: 'hello',
    created_at: '2025-01-01T00:00:00Z',
    size: null,
    ...overrides,
})

const usage = { used: 5000, limit: 1073741824 }

function mockFetch(responses: Record<string, { ok: boolean; status?: number; body?: any }>) {
    return vi.fn(async (url: string, init?: RequestInit) => {
        for (const [pattern, resp] of Object.entries(responses)) {
            if (url.includes(pattern)) {
                return {
                    ok: resp.ok,
                    status: resp.status ?? (resp.ok ? 200 : 500),
                    statusText: resp.ok ? 'OK' : 'Error',
                    json: async () => resp.body,
                    text: async () => (typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body ?? '')),
                    blob: async () => new Blob(),
                }
            }
        }
        return { ok: true, status: 200, statusText: 'OK', json: async () => ({}), text: async () => '' }
    })
}

function resetStore() {
    useTransferStore.setState({
        transfers: [],
        inflight: 0,
        activity: '',
        ready: false,
        error: null,
        statusText: 'try help',
        usage: null,
        selected: [],
    })
}

describe('TransferStore', () => {
    beforeEach(() => {
        resetStore()
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // fetch

    describe('fetch', () => {
        it('populates transfers and sets ready: true', async () => {
            const items = [transfer({ id: 1 }), transfer({ id: 2, content: 'world' })]
            globalThis.fetch = mockFetch({
                '/api/transfers/': { ok: true, body: items },
                '/usage': { ok: true, body: usage },
            })

            await useTransferStore.getState().fetch()
            const s = useTransferStore.getState()

            expect(s.transfers).toEqual(items)
            expect(s.ready).toBe(true)
            expect(s.error).toBeNull()
        })

        it('clears selected on fetch', async () => {
            useTransferStore.setState({ selected: [1, 2, 3] })
            globalThis.fetch = mockFetch({
                '/api/transfers/': { ok: true, body: [] },
                '/usage': { ok: true, body: usage },
            })

            await useTransferStore.getState().fetch()
            expect(useTransferStore.getState().selected).toEqual([])
        })

        it('sets error on failure', async () => {
            globalThis.fetch = mockFetch({
                '/api/transfers/': { ok: false, body: 'Server down' },
            })

            await useTransferStore.getState().fetch()
            const s = useTransferStore.getState()

            expect(s.error).toBe('Server down')
            expect(s.ready).toBe(true)
        })
    })

    // createText

    describe('createText', () => {
        it('sends POST and prepends new transfer', async () => {
            const newT = transfer({ id: 10, content: 'new text' })
            globalThis.fetch = mockFetch({
                '/api/transfers/': { ok: true, body: newT },
                '/usage': { ok: true, body: usage },
            })

            await useTransferStore.getState().createText('new text')
            const s = useTransferStore.getState()

            expect(s.transfers[0]).toEqual(newT)
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/transfers/',
                expect.objectContaining({ method: 'POST' }),
            )
        })

        it('returns existing ID for duplicate text', async () => {
            useTransferStore.setState({ transfers: [transfer({ id: 5, content: 'dup' })] })
            globalThis.fetch = vi.fn()

            const result = await useTransferStore.getState().createText('dup')

            expect(result).toBe(5)
            expect(globalThis.fetch).not.toHaveBeenCalled()
        })

        it('sets error on failure', async () => {
            globalThis.fetch = mockFetch({
                '/api/transfers/': { ok: false, body: 'Bad request' },
            })

            await useTransferStore.getState().createText('fail')
            expect(useTransferStore.getState().error).toBe('Bad request')
        })
    })

    // uploadFile

    describe('uploadFile', () => {
        it('sends FormData POST and prepends result', async () => {
            const newT = transfer({ id: 20, type: 'file', content: 'test.txt', size: 100 })
            globalThis.fetch = mockFetch({
                '/upload': { ok: true, body: newT },
                '/usage': { ok: true, body: usage },
            })

            const file = new File(['data'], 'test.txt', { type: 'text/plain' })
            await useTransferStore.getState().uploadFile(file)
            await vi.waitFor(() => {
                expect(useTransferStore.getState().transfers).toHaveLength(1)
            })

            expect(useTransferStore.getState().transfers[0]).toEqual(newT)
        })

        it('rejects files > 1GB client-side', async () => {
            globalThis.fetch = vi.fn()

            const bigFile = new File([], 'big.bin')
            Object.defineProperty(bigFile, 'size', { value: 1024 * 1024 * 1024 + 1 })

            await useTransferStore.getState().uploadFile(bigFile)

            expect(useTransferStore.getState().error).toBe('File exceeds 1GB limit')
            expect(globalThis.fetch).not.toHaveBeenCalled()
        })
    })

    // remove

    describe('remove', () => {
        it('optimistically removes from list', async () => {
            useTransferStore.setState({
                transfers: [transfer({ id: 1 }), transfer({ id: 2 })],
                selected: [1],
            })
            globalThis.fetch = mockFetch({
                '/1': { ok: true },
                '/usage': { ok: true, body: usage },
            })

            await useTransferStore.getState().remove(1)
            const s = useTransferStore.getState()

            expect(s.transfers.map(t => t.id)).toEqual([2])
            expect(s.selected).toEqual([])
        })

        it('re-fetches on error', async () => {
            const serverItems = [transfer({ id: 1 }), transfer({ id: 2 })]
            useTransferStore.setState({ transfers: serverItems })

            let callCount = 0
            globalThis.fetch = vi.fn(async (url: string) => {
                callCount++
                if (url.includes('/1') && callCount === 1) {
                    return { ok: false, status: 500, statusText: 'Error', text: async () => 'Delete failed', json: async () => ({}) }
                }
                return { ok: true, status: 200, statusText: 'OK', json: async () => serverItems, text: async () => '' }
            })

            await useTransferStore.getState().remove(1)
            const s = useTransferStore.getState()

            expect(s.error).toBe('Delete failed')
            expect(s.transfers).toEqual(serverItems)
        })
    })

    // batchRemove

    describe('batchRemove', () => {
        it('optimistically removes multiple items', async () => {
            useTransferStore.setState({
                transfers: [transfer({ id: 1 }), transfer({ id: 2 }), transfer({ id: 3 })],
                selected: [1, 2],
            })
            globalThis.fetch = mockFetch({
                '/batch-delete': { ok: true },
                '/usage': { ok: true, body: usage },
            })

            await useTransferStore.getState().batchRemove([1, 2])
            const s = useTransferStore.getState()

            expect(s.transfers.map(t => t.id)).toEqual([3])
            expect(s.selected).toEqual([])
        })

        it('re-fetches on error', async () => {
            const all = [transfer({ id: 1 }), transfer({ id: 2 })]
            useTransferStore.setState({ transfers: all })

            let callCount = 0
            globalThis.fetch = vi.fn(async (url: string) => {
                callCount++
                if (url.includes('/batch-delete')) {
                    return { ok: false, status: 500, statusText: 'Error', text: async () => 'Batch failed', json: async () => ({}) }
                }
                return { ok: true, status: 200, statusText: 'OK', json: async () => all, text: async () => '' }
            })

            await useTransferStore.getState().batchRemove([1, 2])
            expect(useTransferStore.getState().error).toBe('Batch failed')
            expect(useTransferStore.getState().transfers).toEqual(all)
        })
    })

    // rename

    describe('rename', () => {
        it('sends PATCH and updates transfer in-place', async () => {
            const original = transfer({ id: 1, content: 'old' })
            const updated = transfer({ id: 1, content: 'new' })
            useTransferStore.setState({ transfers: [original] })

            globalThis.fetch = mockFetch({
                '/1': { ok: true, body: updated },
                '/usage': { ok: true, body: usage },
            })

            await useTransferStore.getState().rename(1, 'new')
            expect(useTransferStore.getState().transfers[0].content).toBe('new')
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/transfers/1',
                expect.objectContaining({ method: 'PATCH' }),
            )
        })

        it('sets error on failure', async () => {
            useTransferStore.setState({ transfers: [transfer({ id: 1 })] })
            globalThis.fetch = mockFetch({
                '/1': { ok: false, body: 'Rename failed' },
            })

            await useTransferStore.getState().rename(1, 'new')
            expect(useTransferStore.getState().error).toBe('Rename failed')
        })
    })

    // selection

    describe('selection', () => {
        it('toggleSelect adds and removes IDs', () => {
            const { toggleSelect } = useTransferStore.getState()

            toggleSelect(1)
            expect(useTransferStore.getState().selected).toEqual([1])

            toggleSelect(2)
            expect(useTransferStore.getState().selected).toEqual([1, 2])

            toggleSelect(1)
            expect(useTransferStore.getState().selected).toEqual([2])
        })

        it('clearSelection empties selection', () => {
            useTransferStore.setState({ selected: [1, 2, 3] })
            useTransferStore.getState().clearSelection()
            expect(useTransferStore.getState().selected).toEqual([])
        })
    })

    // download

    describe('download', () => {
        it('opens a new window for file transfers', () => {
            useTransferStore.setState({
                transfers: [transfer({ id: 5, type: 'file', content: 'doc.pdf', size: 100 })],
            })
            const openSpy = vi.fn()
            vi.stubGlobal('open', openSpy)

            useTransferStore.getState().download(5)
            expect(openSpy).toHaveBeenCalledWith('/api/transfers/5/download', '_blank')

            vi.unstubAllGlobals()
        })

        it('does not open window for text transfers', () => {
            useTransferStore.setState({
                transfers: [transfer({ id: 5, type: 'text', content: 'some text' })],
            })
            const openSpy = vi.fn()
            vi.stubGlobal('open', openSpy)

            useTransferStore.getState().download(5)
            expect(openSpy).not.toHaveBeenCalled()

            vi.unstubAllGlobals()
        })
    })

    // batchDownload

    describe('batchDownload', () => {
        it('delegates to download for a single file', () => {
            useTransferStore.setState({
                transfers: [transfer({ id: 1, type: 'file', content: 'a.zip', size: 100 })],
            })
            const openSpy = vi.fn()
            vi.stubGlobal('open', openSpy)

            useTransferStore.getState().batchDownload([1])
            expect(openSpy).toHaveBeenCalledWith('/api/transfers/1/download', '_blank')

            vi.unstubAllGlobals()
        })

        it('does nothing when no file IDs', () => {
            useTransferStore.setState({
                transfers: [transfer({ id: 1, type: 'text', content: 'text only' })],
            })
            globalThis.fetch = vi.fn()

            useTransferStore.getState().batchDownload([1])
            expect(globalThis.fetch).not.toHaveBeenCalled()
        })

        it('filters out text transfers from batch', () => {
            useTransferStore.setState({
                transfers: [
                    transfer({ id: 1, type: 'text', content: 'skip me' }),
                    transfer({ id: 2, type: 'file', content: 'a.zip', size: 100 }),
                ],
            })
            const openSpy = vi.fn()
            vi.stubGlobal('open', openSpy)

            useTransferStore.getState().batchDownload([1, 2])
            expect(openSpy).toHaveBeenCalledWith('/api/transfers/2/download', '_blank')

            vi.unstubAllGlobals()
        })

        it('POSTs batch-download for multiple files and creates download link', async () => {
            useTransferStore.setState({
                transfers: [
                    transfer({ id: 1, type: 'file', content: 'a.zip', size: 100 }),
                    transfer({ id: 2, type: 'file', content: 'b.zip', size: 200 }),
                ],
            })

            const fakeBlob = new Blob(['zip-data'])
            const fakeUrl = 'blob:fake-url'
            vi.stubGlobal('URL', {
                createObjectURL: vi.fn(() => fakeUrl),
                revokeObjectURL: vi.fn(),
            })

            const clickSpy = vi.fn()
            vi.spyOn(document, 'createElement').mockReturnValue({
                set href(v: string) { /* noop */ },
                set download(v: string) { /* noop */ },
                click: clickSpy,
            } as any)

            globalThis.fetch = mockFetch({
                '/batch-download': { ok: true, body: fakeBlob },
                '/usage': { ok: true, body: usage },
            })

            useTransferStore.getState().batchDownload([1, 2])

            await vi.waitFor(() => {
                expect(clickSpy).toHaveBeenCalled()
            })

            vi.unstubAllGlobals()
            vi.restoreAllMocks()
        })
    })

    // inflight tracking

    describe('inflight tracking', () => {
        it('increments inflight and sets activity during request', async () => {
            let resolveFetch: Function
            globalThis.fetch = vi.fn(() => new Promise(r => { resolveFetch = r }))

            const fetchPromise = useTransferStore.getState().fetch()

            expect(useTransferStore.getState().inflight).toBe(1)
            expect(useTransferStore.getState().activity).toBe('Loading')

            resolveFetch!({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => [],
                text: async () => '',
            })

            await fetchPromise

            expect(useTransferStore.getState().inflight).toBe(0)
            expect(useTransferStore.getState().activity).toBe('')
        })

        it('sets correct activity strings for different operations', async () => {
            globalThis.fetch = mockFetch({
                '/api/transfers/': { ok: true, body: [] },
                '/usage': { ok: true, body: usage },
            })

            const activities: string[] = []
            const unsub = useTransferStore.subscribe(s => {
                if (s.activity) activities.push(s.activity)
            })

            await useTransferStore.getState().fetch()
            resetStore()
            await useTransferStore.getState().createText('test')

            unsub()
            expect(activities).toContain('Loading')
            expect(activities).toContain('Sending')
        })
    })
})
