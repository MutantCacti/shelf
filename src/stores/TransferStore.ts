import { create } from 'zustand'
import { Transfer } from '../types/types'

const API = '/api/transfers'

interface TransferStore {
    transfers: Transfer[]
    inflight: number
    activity: string
    ready: boolean
    error: string | null
    selected: number[]
    statusText: string

    fetch: () => Promise<void>
    createText: (content: string) => Promise<number | undefined>
    uploadFile: (file: File) => Promise<void>
    remove: (id: number) => Promise<void>
    batchRemove: (ids: number[]) => Promise<void>
    download: (id: number) => void
    batchDownload: (ids: number[]) => void
    toggleSelect: (id: number) => void
    clearSelection: () => void
}

async function api(path: string, init?: RequestInit) {
    const res = await fetch(`${API}${path}`, {
        credentials: 'include',
        ...init,
    })
    if (!res.ok) {
        const body = await res.text()
        throw new Error(body || res.statusText)
    }
    return res
}

function getStatusText(transfers: Transfer[]): string {
    const files = transfers.filter(t => t.type === 'file').length
    const texts = transfers.filter(t => t.type === 'text').length
    const parts: string[] = []
    if (files) parts.push(`${files} file${files !== 1 ? 's' : ''}`)
    if (texts) parts.push(`${texts} text${texts !== 1 ? 's' : ''}`)
    return parts.join(', ') || 'Empty'
}

// Sequential upload queue to avoid overwhelming browser connection limits
const uploadQueue: (() => Promise<void>)[] = []
let uploading = false

async function drainQueue() {
    if (uploading) return
    uploading = true
    while (uploadQueue.length > 0) {
        const task = uploadQueue.shift()!
        await task()
    }
    uploading = false
}

const useTransferStore = create<TransferStore>((set, get) => ({
    transfers: [],
    inflight: 0,
    activity: '',
    ready: false,
    error: null,
    statusText: 'try help',
    selected: [],

    async fetch() {
        set({ inflight: get().inflight + 1, activity: 'Loading', error: null, selected: [] })
        try {
            const res = await api('/')
            const transfers: Transfer[] = await res.json()
            set({ transfers })
        } catch (e: any) {
            set({ error: e.message })
        } finally {
            const n = get().inflight - 1
            set({ inflight: n, ...(n === 0 ? { activity: '', statusText: getStatusText(get().transfers) } : {}), ready: true })
        }
    },

    async createText(content: string) {
        const dup = get().transfers.find(t => t.type === 'text' && t.content === content)
        if (dup) return dup.id

        set({ error: null, inflight: get().inflight + 1, activity: 'Sending' })

        try {
            const res = await api('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'text', content }),
            })
            const transfer: Transfer = await res.json()
            set({ transfers: [transfer, ...get().transfers] })
        } catch (e: any) {
            set({ error: e.message })
        } finally {
            const n = get().inflight - 1
            set({ inflight: n, ...(n === 0 ? { activity: '', statusText: getStatusText(get().transfers) } : {}) })
        }
    },

    async uploadFile(file: File) {
        set({ error: null, inflight: get().inflight + 1, activity: 'Uploading' })

        uploadQueue.push(async () => {
            try {
                const form = new FormData()
                form.append('data', file)
                const res = await api('/upload', {
                    method: 'POST',
                    body: form,
                })
                const transfer: Transfer = await res.json()
                set({ transfers: [transfer, ...get().transfers] })
            } catch (e: any) {
                set({ error: e.message })
            } finally {
                const n = get().inflight - 1
                set({ inflight: n, ...(n === 0 ? { activity: '', statusText: getStatusText(get().transfers) } : {}) })
            }
        })
        drainQueue()
    },

    async remove(id: number) {
        const prev = get().transfers
        set({
            error: null,
            inflight: get().inflight + 1,
            activity: 'Deleting',
            transfers: prev.filter(t => t.id !== id),
            selected: get().selected.filter(s => s !== id),
        })

        try {
            await api(`/${id}`, { method: 'DELETE' })
        } catch (e: any) {
            set({ error: e.message, transfers: prev })
        } finally {
            const n = get().inflight - 1
            set({ inflight: n, ...(n === 0 ? { activity: '', statusText: getStatusText(get().transfers) } : {}) })
        }
    },

    async batchRemove(ids: number[]) {
        const prev = get().transfers
        const idSet = new Set(ids)
        set({
            error: null,
            inflight: get().inflight + 1,
            activity: 'Deleting',
            transfers: prev.filter(t => !idSet.has(t.id)),
            selected: get().selected.filter(s => !idSet.has(s)),
        })

        try {
            await api('/batch-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            })
        } catch (e: any) {
            set({ error: e.message, transfers: prev })
        } finally {
            const n = get().inflight - 1
            set({ inflight: n, ...(n === 0 ? { activity: '', statusText: getStatusText(get().transfers) } : {}) })
        }
    },

    download(id: number) {
        const t = get().transfers.find(t => t.id === id)
        if (t && t.type !== 'text') {
            window.open(`${API}/${id}/download`, '_blank')
        }
    },

    batchDownload(ids: number[]) {
        const fileIds = ids.filter(id => {
            const t = get().transfers.find(t => t.id === id)
            return t && t.type !== 'text'
        })
        if (fileIds.length === 0) return
        if (fileIds.length === 1) {
            get().download(fileIds[0])
            return
        }
        // POST to batch-download and trigger download from blob
        fetch(`${API}/batch-download`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: fileIds }),
        })
            .then(res => {
                if (!res.ok) throw new Error(res.statusText)
                return res.blob()
            })
            .then(blob => {
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'transfers.zip'
                a.click()
                URL.revokeObjectURL(url)
            })
            .catch(e => set({ error: e.message }))
    },

    toggleSelect(id: number) {
        const s = get().selected
        set({ selected: s.includes(id) ? s.filter(x => x !== id) : [...s, id] })
    },

    clearSelection() {
        set({ selected: [] },)
    },
}))

export default useTransferStore
