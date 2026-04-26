import { useEffect, useState } from 'react'
import { LuDownload, LuX, LuFile } from 'react-icons/lu'
import { Transfer } from '../types/types'
import useTransferStore from '../stores/TransferStore'

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'opus'])
const TEXT_EXTS = new Set([
    'txt', 'md', 'json', 'toml', 'yaml', 'yml', 'xml', 'ini', 'env', 'csv', 'tsv',
    'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift',
    'c', 'cpp', 'h', 'cs', 'php', 'lua', 'r', 'scala', 'zig', 'sh', 'bash',
    'zsh', 'fish', 'html', 'css', 'scss', 'less', 'vue', 'svelte', 'sql',
])

const TEXT_PREVIEW_LIMIT = 1024 * 1024

function getExt(t: Transfer) {
    return t.content.split('.').pop()?.toLowerCase() ?? ''
}

function formatSize(bytes: number | null) {
    if (bytes == null) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

interface PreviewModalProps {
    transfer: Transfer
    onClose: () => void
}

export default function PreviewModal({ transfer, onClose }: PreviewModalProps) {
    const [visible, setVisible] = useState(false)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [textError, setTextError] = useState<string | null>(null)
    const download = useTransferStore(s => s.download)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    function dismiss() {
        setVisible(false)
        setTimeout(onClose, 150)
    }

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') { e.preventDefault(); dismiss() }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    const ext = transfer.type === 'file' ? getExt(transfer) : ''
    const isText = transfer.type === 'file' && TEXT_EXTS.has(ext)

    useEffect(() => {
        if (!isText) return
        if (transfer.size != null && transfer.size > TEXT_PREVIEW_LIMIT) {
            setTextError('File is too large to preview')
            return
        }
        let cancelled = false
        fetch(`/api/transfers/${transfer.id}/download`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error(res.statusText)
                return res.text()
            })
            .then(text => { if (!cancelled) setTextContent(text) })
            .catch(e => { if (!cancelled) setTextError(e.message || 'Failed to load preview') })
        return () => { cancelled = true }
    }, [isText, transfer.id, transfer.size])

    let body: React.ReactNode
    if (IMAGE_EXTS.has(ext)) {
        body = (
            <img
                src={`/api/transfers/${transfer.id}/download`}
                alt={transfer.content}
                className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
            />
        )
    } else if (ext === 'pdf') {
        body = (
            <iframe
                src={`/api/transfers/${transfer.id}/download`}
                title={transfer.content}
                className="w-full h-[70vh] rounded-lg bg-bg"
            />
        )
    } else if (VIDEO_EXTS.has(ext)) {
        body = (
            <video
                src={`/api/transfers/${transfer.id}/download`}
                controls
                className="max-w-full max-h-[70vh] mx-auto rounded-lg"
            />
        )
    } else if (AUDIO_EXTS.has(ext)) {
        body = (
            <audio
                src={`/api/transfers/${transfer.id}/download`}
                controls
                className="w-full mt-8"
            />
        )
    } else if (isText) {
        if (textError) {
            body = <p className="text-sm text-text-muted text-center py-12">{textError}</p>
        } else if (textContent == null) {
            body = <p className="text-sm text-text-muted text-center py-12">Loading…</p>
        } else {
            body = (
                <pre className="whitespace-pre-wrap break-words text-xs text-text bg-bg/50 rounded-lg p-4 max-h-[70vh] overflow-auto font-mono">
                    {textContent}
                </pre>
            )
        }
    } else {
        body = (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <LuFile size={48} className="text-text-muted" />
                <p className="text-sm text-text-muted">No preview available</p>
            </div>
        )
    }

    return (
        <div
            data-testid="preview-modal"
            className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-150 px-4"
            style={{ backgroundColor: visible ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0)' }}
            onClick={dismiss}
        >
            <div
                className="bg-surface border border-border rounded-xl max-w-4xl max-h-[90vh] flex flex-col transition-all duration-150"
                style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'scale(1)' : 'scale(0.95)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/40">
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm text-text truncate">{transfer.content}</span>
                        {transfer.size != null && (
                            <span className="text-xs text-text-muted">{formatSize(transfer.size)}</span>
                        )}
                    </div>
                    <button
                        id="preview-close"
                        onClick={dismiss}
                        aria-label="Close"
                        className="p-1.5 text-text-muted rounded-lg hover:bg-bg/50 transition-colors cursor-pointer"
                    >
                        <LuX size={16} />
                    </button>
                </header>
                <div className="flex-1 overflow-auto px-5 py-4 min-h-0">
                    {body}
                </div>
                <footer className="flex justify-end gap-2 px-5 py-3 border-t border-border/40">
                    <button
                        id="preview-download"
                        onClick={() => download(transfer.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-bg font-medium bg-accent/80 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    >
                        <LuDownload size={14} />
                        Download
                    </button>
                </footer>
            </div>
        </div>
    )
}
