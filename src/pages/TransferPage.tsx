import { useEffect, useCallback, useState } from 'react'
import TransferGrid from '../components/TransferGrid'
import ConfirmModal from '../components/ConfirmModal'
import PreviewModal from '../components/PreviewModal'
import useTransferStore from '../stores/TransferStore'
import useAuthStore from '../stores/AuthStore'
import ToastContainer from '../components/Toast'

export default function TransferPage({ onHelp }: { onHelp: () => void }) {
    const { batchRemove, clearSelection, transfers } = useTransferStore()
    const [showConfirm, setShowConfirm] = useState(false)
    const [previewId, setPreviewId] = useState<number | null>(null)

    const [deleteTargets, setDeleteTargets] = useState<number[]>([])

    const { uploadFile, createText } = useTransferStore()

    const previewTransfer = previewId != null ? transfers.find(t => t.id === previewId) ?? null : null

    function nudgeDuplicate(id: number) {
        const el = document.querySelector(`[data-transfer-id="${id}"]`)
        if (!el) return
        el.classList.remove('animate-nudge')
        void (el as HTMLElement).offsetWidth
        el.classList.add('animate-nudge')
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }

    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (e.target instanceof HTMLInputElement) return
        const { transfers } = useTransferStore.getState()
        const files = Array.from(e.clipboardData?.files ?? [])
        if (files.length > 0) {
            files.forEach(f => {
                const dup = transfers.find(t => t.type === 'file' && t.content === f.name)
                if (dup) { nudgeDuplicate(dup.id) } else { uploadFile(f) }
            })
        } else {
            const text = e.clipboardData?.getData('text/plain')
            if (!text) return
            createText(text).then(dupId => { if (dupId) nudgeDuplicate(dupId) })
        }
    }, [uploadFile, createText])

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (showConfirm || previewId != null) return
        if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
            e.preventDefault()
            useTransferStore.getState().fetch()
            return
        }
        if (e.key === 'Escape' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            useAuthStore.getState().logout()
            return
        }
        if (e.key === 'Escape') {
            clearSelection()
            return
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement)) {
            const { selected } = useTransferStore.getState()
            if (selected.length > 0) {
                setDeleteTargets(selected)
                setShowConfirm(true)
            }
            return
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            const { selected, batchDownload } = useTransferStore.getState()
            if (selected.length > 0) {
                batchDownload(selected)
            } else {
                document.getElementById('upload-input')?.click()
            }
            return
        }
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            if (e.target instanceof HTMLInputElement) return
            const { selected, transfers } = useTransferStore.getState()
            if (selected.length === 1) {
                const t = transfers.find(t => t.id === selected[0])
                if (t && t.type === 'text') {
                    e.preventDefault()
                    navigator.clipboard.writeText(t.content)
                    window.dispatchEvent(new CustomEvent('shelf:copy', { detail: t.id }))
                }
            }
            return
        }
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            if (e.target instanceof HTMLInputElement && (e.target as HTMLInputElement).value) return
            const all = useTransferStore.getState().transfers
            if (all.length === 0) {
                const input = document.getElementById('text-input') as HTMLInputElement | null
                if (input) { input.focus(); input.select() }
                return
            }
            e.preventDefault()
            if (e.target instanceof HTMLInputElement) (e.target as HTMLInputElement).blur()
            useTransferStore.setState({ selected: all.map(t => t.id) })
            return
        }
        if (e.key === '?') {
            if (e.target instanceof HTMLInputElement && (e.target as HTMLInputElement).value) return
            e.preventDefault()
            if (e.target instanceof HTMLInputElement) (e.target as HTMLInputElement).blur()
            onHelp()
            return
        }
        if (e.key === 'F2') {
            const { selected } = useTransferStore.getState()
            if (selected.length === 1) {
                e.preventDefault()
                window.dispatchEvent(new CustomEvent('shelf:rename', { detail: selected[0] }))
            }
            return
        }
        // Redirect printable keystrokes to text input
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
            clearSelection()
            document.getElementById('text-input')?.focus()
        }
    }, [showConfirm, previewId])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('paste', handlePaste)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('paste', handlePaste)
        }
    }, [handleKeyDown, handlePaste])

    useEffect(() => {
        function onPreview(e: Event) {
            setPreviewId((e as CustomEvent).detail)
        }
        window.addEventListener('shelf:preview', onPreview)
        return () => window.removeEventListener('shelf:preview', onPreview)
    }, [])

    function handleConfirm() {
        batchRemove(deleteTargets)
        clearSelection()
        setDeleteTargets([])
        setShowConfirm(false)
    }

    return (
        <div className="relative flex flex-col h-screen">
            <TransferGrid onHelp={onHelp} onDelete={() => {
                const { selected } = useTransferStore.getState()
                if (selected.length > 0) {
                    setDeleteTargets(selected)
                    setShowConfirm(true)
                }
            }} />
            <ToastContainer />
            {showConfirm && (
                <ConfirmModal
                    message={deleteTargets.length === 1 ? 'Delete this item?' : `Delete ${deleteTargets.length} items?`}
                    onConfirm={handleConfirm}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
            {previewTransfer && (
                <PreviewModal
                    transfer={previewTransfer}
                    onClose={() => setPreviewId(null)}
                />
            )}
        </div>
    )
}
