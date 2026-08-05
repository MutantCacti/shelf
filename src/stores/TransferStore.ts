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
    usage: { used: number; limit: number } | null

    fetch: () => Promise<void>
    createText: (content: string) => Promise<number | undefined>
    uploadFile: (file: File) => Promise<void>
    remove: (id: number) => Promise<void>
    batchRemove: (ids: number[]) => Promise<void>
    download: (id: number) => void
    batchDownload: (ids: number[]) => void
    rename: (id: number, newContent: string) => Promise<void>
    applyGroup: (ids: number[], group: number | null) => Promise<void>
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

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`
}

function getStatusText(usage: { used: number; limit: number } | null): string {
    if (!usage || usage.limit === 0) return ''
    return `${formatBytes(Math.max(0, usage.limit - usage.used))} free`
}

// Atomic inflight helpers to avoid race conditions
function inflightUp(set: any, activity: string) {
    set((s: TransferStore) => ({ inflight: s.inflight + 1, activity, error: null }))
}

function inflightDown(set: any, get: any) {
    set((s: TransferStore) => {
        const n = s.inflight - 1
        if (n === 0) {
            // Refresh usage when all activity finishes
            api('/usage').then(r => r.json()).then(usage => {
                set({ usage, statusText: getStatusText(usage) })
            }).catch(() => {})
            return { inflight: 0, activity: '', statusText: getStatusText(s.usage) }
        }
        return { inflight: n }
    })
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
    statusText: 'try ?',
    usage: null,
    selected: [],

    async fetch() {
        inflightUp(set, 'Loading')
        try {
            const res = await api('/')
            const transfers: Transfer[] = await res.json()
            // Prune rather than clear the selection: background refetches
            // (SSE pings, error recovery) must not wipe an in-progress selection.
            set({
                transfers,
                selected: get().selected.filter(id => transfers.some(t => t.id === id)),
            })
        } catch (e: any) {
            set({ error: e.message })
        } finally {
            inflightDown(set, get)
            set({ ready: true })
        }
    },

    async createText(content: string) {
        const dup = get().transfers.find(t => t.type === 'text' && t.content === content)
        if (dup) return dup.id

        inflightUp(set, 'Sending')

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
            inflightDown(set, get)
        }
    },

    async uploadFile(file: File) {
        const MAX_FILE = 1024 * 1024 * 1024
        if (file.size > MAX_FILE) {
            set({ error: 'File exceeds 1GB limit' })
            return
        }

        inflightUp(set, 'Uploading')

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
                inflightDown(set, get)
            }
        })
        drainQueue()
    },

    async remove(id: number) {
        inflightUp(set, 'Deleting')
        set({
            transfers: get().transfers.filter(t => t.id !== id),
            selected: get().selected.filter(s => s !== id),
        })

        try {
            await api(`/${id}`, { method: 'DELETE' })
        } catch (e: any) {
            // Re-fetch from server instead of restoring stale snapshot
            set({ error: e.message })
            try {
                const res = await api('/')
                set({ transfers: await res.json() })
            } catch { /* fetch error already surfaced */ }
        } finally {
            inflightDown(set, get)
        }
    },

    async batchRemove(ids: number[]) {
        inflightUp(set, 'Deleting')
        const idSet = new Set(ids)
        set({
            transfers: get().transfers.filter(t => !idSet.has(t.id)),
            selected: get().selected.filter(s => !idSet.has(s)),
        })

        try {
            await api('/batch-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            })
        } catch (e: any) {
            // Re-fetch from server instead of restoring stale snapshot
            set({ error: e.message })
            try {
                const res = await api('/')
                set({ transfers: await res.json() })
            } catch { /* fetch error already surfaced */ }
        } finally {
            inflightDown(set, get)
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
        inflightUp(set, 'Downloading')
        api('/batch-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: fileIds }),
        })
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'transfers.zip'
                a.click()
                URL.revokeObjectURL(url)
            })
            .catch(e => set({ error: e.message }))
            .finally(() => inflightDown(set, get))
    },

    async rename(id: number, newContent: string) {
        inflightUp(set, 'Renaming')
        const prev = get().transfers.find(t => t.id === id)
        // Optimistic: surface the new content immediately so the modal/grid don't
        // flash the old value during the PATCH round-trip.
        set({ transfers: get().transfers.map(t => t.id === id ? { ...t, content: newContent } : t) })
        try {
            const res = await api(`/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent }),
            })
            const updated: Transfer = await res.json()
            set({ transfers: get().transfers.map(t => t.id === id ? updated : t) })
        } catch (e: any) {
            set({ error: e.message })
            if (prev) set({ transfers: get().transfers.map(t => t.id === id ? prev : t) })
        } finally {
            inflightDown(set, get)
        }
    },

    async applyGroup(ids: number[], group: number | null) {
        // Toggle: assigning a group every target already has clears it instead.
        if (group !== null) {
            const targets = get().transfers.filter(t => ids.includes(t.id))
            if (targets.length > 0 && targets.every(t => t.group === group)) group = null
        }

        inflightUp(set, 'Grouping')
        const idSet = new Set(ids)
        set({ transfers: get().transfers.map(t => idSet.has(t.id) ? { ...t, group } : t) })

        try {
            await api('/batch-group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, group }),
            })
        } catch (e: any) {
            // Re-fetch from server instead of restoring stale snapshot
            set({ error: e.message })
            try {
                const res = await api('/')
                set({ transfers: await res.json() })
            } catch { /* fetch error already surfaced */ }
        } finally {
            inflightDown(set, get)
        }
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
