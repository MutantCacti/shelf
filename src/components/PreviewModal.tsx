import { useEffect, useRef, useState } from 'react'
import { LuDownload, LuX, LuFile, LuClipboard, LuCheck } from 'react-icons/lu'
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

function ImageViewer({ src, alt }: { src: string, alt: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const imgRef = useRef<HTMLImageElement>(null)
    const [scale, setScale] = useState(1)
    const [pos, setPos] = useState({ x: 0, y: 0 })
    const [dragging, setDragging] = useState(false)
    const dragStart = useRef<{ mouseX: number, mouseY: number, posX: number, posY: number } | null>(null)
    const scaleRef = useRef(scale)
    const posRef = useRef(pos)
    scaleRef.current = scale
    posRef.current = pos

    // Clamp pan offset so the image edges never leave the viewer.
    function clampPos(s: number, x: number, y: number): { x: number, y: number } {
        const container = containerRef.current
        const img = imgRef.current
        if (!container || !img || !img.naturalWidth || !img.naturalHeight) {
            return { x, y }
        }
        const vw = container.clientWidth
        const vh = container.clientHeight
        // object-contain rendered size at scale 1
        const fitRatio = Math.min(vw / img.naturalWidth, vh / img.naturalHeight)
        const renderedW = img.naturalWidth * fitRatio
        const renderedH = img.naturalHeight * fitRatio
        const maxX = Math.max(0, (renderedW * s - vw) / 2)
        const maxY = Math.max(0, (renderedH * s - vh) / 2)
        return {
            x: Math.max(-maxX, Math.min(maxX, x)),
            y: Math.max(-maxY, Math.min(maxY, y)),
        }
    }

    // Ctrl+wheel zoom — attach as non-passive so preventDefault works
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        function onWheel(e: WheelEvent) {
            if (!e.ctrlKey) return
            e.preventDefault()
            const rect = el!.getBoundingClientRect()
            const cx = e.clientX - rect.left - rect.width / 2
            const cy = e.clientY - rect.top - rect.height / 2
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
            const s = scaleRef.current
            const p = posRef.current
            const newScale = Math.max(1, Math.min(8, s * factor))
            if (newScale === s) return
            const ratio = newScale / s
            setScale(newScale)
            if (newScale === 1) {
                setPos({ x: 0, y: 0 })
            } else {
                const rawX = cx - (cx - p.x) * ratio
                const rawY = cy - (cy - p.y) * ratio
                setPos(clampPos(newScale, rawX, rawY))
            }
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [])

    function handleMouseDown(e: React.MouseEvent) {
        if (scale <= 1) return
        e.preventDefault()
        dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y }
        setDragging(true)
    }

    useEffect(() => {
        if (!dragging) return
        function onMove(e: MouseEvent) {
            if (!dragStart.current) return
            const rawX = dragStart.current.posX + (e.clientX - dragStart.current.mouseX)
            const rawY = dragStart.current.posY + (e.clientY - dragStart.current.mouseY)
            setPos(clampPos(scaleRef.current, rawX, rawY))
        }
        function onUp() {
            dragStart.current = null
            setDragging(false)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [dragging])

    const cursorClass = scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden flex items-center justify-center w-full max-h-[70vh] rounded-lg ${cursorClass}`}
            onMouseDown={handleMouseDown}
        >
            <img
                ref={imgRef}
                src={src}
                alt={alt}
                draggable={false}
                className="max-w-full max-h-[70vh] object-contain select-none"
                style={{
                    transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                    transition: dragging ? 'none' : 'transform 0.1s',
                    transformOrigin: 'center',
                }}
            />
        </div>
    )
}

interface PreviewModalProps {
    transfer: Transfer
    onClose: () => void
}

export default function PreviewModal({ transfer, onClose }: PreviewModalProps) {
    const [visible, setVisible] = useState(false)
    const [textContent, setTextContent] = useState<string | null>(null)
    const [textError, setTextError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const mouseDownOnBackdrop = useRef(false)
    const download = useTransferStore(s => s.download)

    function copyTextContent() {
        navigator.clipboard.writeText(transfer.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
    }

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
        fetch(`/api/transfers/${transfer.id}/download?v=${transfer.created_at}&inline=1`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error(res.statusText)
                return res.text()
            })
            .then(text => { if (!cancelled) setTextContent(text) })
            .catch(e => { if (!cancelled) setTextError(e.message || 'Failed to load preview') })
        return () => { cancelled = true }
    }, [isText, transfer.id, transfer.size, transfer.created_at])

    let body: React.ReactNode
    if (transfer.type === 'text') {
        body = (
            <div className="text-sm text-text whitespace-pre-wrap wrap-break-word">
                {transfer.content}
            </div>
        )
    } else if (IMAGE_EXTS.has(ext)) {
        body = (
            <ImageViewer
                src={`/api/transfers/${transfer.id}/download?v=${transfer.created_at}&inline=1`}
                alt={transfer.content}
            />
        )
    } else if (ext === 'pdf') {
        body = (
            <iframe
                src={`/api/transfers/${transfer.id}/download?v=${transfer.created_at}&inline=1`}
                title={transfer.content}
                className="w-full h-[70vh] rounded-lg bg-bg"
            />
        )
    } else if (VIDEO_EXTS.has(ext)) {
        body = (
            <video
                src={`/api/transfers/${transfer.id}/download?v=${transfer.created_at}&inline=1`}
                controls
                className="max-w-full max-h-[70vh] mx-auto rounded-lg"
            />
        )
    } else if (AUDIO_EXTS.has(ext)) {
        body = (
            <audio
                src={`/api/transfers/${transfer.id}/download?v=${transfer.created_at}&inline=1`}
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
                <pre className="whitespace-pre-wrap wrap-break-word text-xs text-text bg-bg/50 rounded-lg p-4 max-h-[70vh] overflow-auto font-mono">
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
            onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget }}
            onClick={(e) => {
                if (mouseDownOnBackdrop.current && e.target === e.currentTarget) dismiss()
                mouseDownOnBackdrop.current = false
            }}
        >
            <div
                className={`bg-surface border border-border rounded-xl ${ext === 'pdf' ? 'w-full' : ''} max-w-2xl max-h-[90vh] flex flex-col transition-all duration-150`}
                style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'scale(1)' : 'scale(0.95)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/40">
                    <div className="flex flex-col min-w-0 flex-1">
                        {transfer.type === 'file' && (
                            <>
                                <span className="text-sm text-text truncate">{transfer.content}</span>
                                {transfer.size != null && (
                                    <span className="text-xs text-text-muted">{formatSize(transfer.size)}</span>
                                )}
                            </>
                        )}
                    </div>
                    <div className="inline-flex items-center gap-3 shrink-0">
                        {transfer.type === 'text' ? (
                            <button
                                id="preview-copy"
                                onClick={copyTextContent}
                                aria-label="Copy"
                                title="Copy"
                                className="cursor-pointer transition-all rounded-full text-accent hover:text-accent-light focus-visible:text-accent-light hover-glow hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
                            >
                                {copied ? <LuCheck size={20} /> : <LuClipboard size={20} />}
                            </button>
                        ) : (
                            <button
                                id="preview-download"
                                onClick={() => download(transfer.id)}
                                aria-label="Download"
                                title="Download"
                                className="cursor-pointer transition-all rounded-full text-accent hover:text-accent-light focus-visible:text-accent-light hover-glow hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
                            >
                                <LuDownload size={20} />
                            </button>
                        )}
                        <button
                            id="preview-close"
                            onClick={dismiss}
                            aria-label="Close"
                            title="Close"
                            className="cursor-pointer transition-all rounded-full text-red-400 hover:text-red-300 focus-visible:text-red-300 hover-glow"
                        >
                            <LuX size={20} />
                        </button>
                    </div>
                </header>
                <div className="flex-1 overflow-auto px-5 py-4 min-h-0">
                    {body}
                </div>
            </div>
        </div>
    )
}
