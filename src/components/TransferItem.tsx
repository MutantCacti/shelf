import { useState, useEffect } from 'react'
import {
    LuImage, LuFileText, LuFileCode, LuFileTerminal,
    LuFileArchive, LuFile, LuCheck, LuFileAudio, LuFileVideo,
    LuFileSpreadsheet, LuBraces, LuPresentation, LuClipboard,
} from 'react-icons/lu'
import { Transfer } from '../types/types'
import useTransferStore from '../stores/TransferStore'
import { groupColor } from '../lib/groups'
import { RichText } from '../lib/richtext'
import { copyRichText } from '../lib/clipboard'

const RADIUS = '8px'

const EXT_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
    // Images
    jpg: LuImage, jpeg: LuImage, png: LuImage, gif: LuImage,
    svg: LuImage, webp: LuImage, ico: LuImage, bmp: LuImage, tiff: LuImage,
    // Documents
    pdf: LuFileText, doc: LuFileText, docx: LuFileText, txt: LuFileText,
    md: LuFileText, rtf: LuFileText, odt: LuFileText, pages: LuFileText,
    // Data / config
    json: LuBraces, toml: LuBraces, yaml: LuBraces, yml: LuBraces,
    xml: LuBraces, ini: LuBraces, env: LuBraces,
    // Spreadsheets
    csv: LuFileSpreadsheet, xls: LuFileSpreadsheet, xlsx: LuFileSpreadsheet,
    ods: LuFileSpreadsheet, tsv: LuFileSpreadsheet,
    // Presentations
    ppt: LuPresentation, pptx: LuPresentation, key: LuPresentation,
    // Code
    js: LuFileCode, jsx: LuFileCode, ts: LuFileCode, tsx: LuFileCode,
    py: LuFileCode, rb: LuFileCode, go: LuFileCode, rs: LuFileCode,
    java: LuFileCode, kt: LuFileCode, swift: LuFileCode, c: LuFileCode,
    cpp: LuFileCode, h: LuFileCode, cs: LuFileCode, php: LuFileCode,
    lua: LuFileCode, r: LuFileCode, scala: LuFileCode, zig: LuFileCode,
    html: LuFileCode, css: LuFileCode, scss: LuFileCode, less: LuFileCode,
    vue: LuFileCode, svelte: LuFileCode, sql: LuFileCode,
    // Shell / terminal
    sh: LuFileTerminal, bash: LuFileTerminal, zsh: LuFileTerminal,
    fish: LuFileTerminal, bat: LuFileTerminal, ps1: LuFileTerminal,
    // Audio
    mp3: LuFileAudio, wav: LuFileAudio, flac: LuFileAudio, aac: LuFileAudio,
    ogg: LuFileAudio, m4a: LuFileAudio, wma: LuFileAudio, aiff: LuFileAudio,
    opus: LuFileAudio, mid: LuFileAudio, midi: LuFileAudio,
    // Video
    mp4: LuFileVideo, mkv: LuFileVideo, avi: LuFileVideo, mov: LuFileVideo,
    wmv: LuFileVideo, flv: LuFileVideo, webm: LuFileVideo, m4v: LuFileVideo,
    // Archives
    zip: LuFileArchive, tar: LuFileArchive, gz: LuFileArchive, '7z': LuFileArchive,
    rar: LuFileArchive, bz2: LuFileArchive, xz: LuFileArchive, zst: LuFileArchive,
    dmg: LuFileArchive, iso: LuFileArchive,
}

const THUMB_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'pdf'])

function getExt(t: Transfer) {
    return t.content.split('.').pop()?.toLowerCase() ?? ''
}

function isImage(t: Transfer) {
    return t.type === 'file' && THUMB_EXTS.has(getExt(t))
}

function getIcon(t: Transfer) {
    if (t.type === 'text') return LuClipboard
    return EXT_ICONS[getExt(t)] ?? LuFile
}

const MIME_MAP: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon', bmp: 'image/bmp',
    pdf: 'application/pdf', zip: 'application/zip', mp3: 'audio/mpeg',
    mp4: 'video/mp4', txt: 'text/plain', html: 'text/html', css: 'text/css',
    js: 'application/javascript', json: 'application/json', xml: 'application/xml',
}

function getMime(t: Transfer): string {
    return MIME_MAP[getExt(t)] ?? 'application/octet-stream'
}

function getLabel(t: Transfer) {
    if (t.type === 'text') return t.content.split('\n')[0]
    return t.content
}

// --- Sub-components ---

function ImageItem({ transfer, dim, onClick, onDoubleClick }: {
    transfer: Transfer, dim: string,
    onClick: () => void, onDoubleClick: () => void,
}) {
    return (
        <button
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            className="group relative block overflow-hidden transition-colors cursor-pointer select-none bg-bg"
            style={{ width: dim, height: dim, borderRadius: RADIUS }}
        >
            <img
                src={`/api/transfers/${transfer.id}/thumbnail?v=${transfer.created_at}`}
                alt={transfer.content}
                loading="lazy"
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                    maskImage: 'linear-gradient(to top, transparent, black 60%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent, black 60%)',
                }}
            />
            <span className="absolute bottom-0 inset-x-0 text-xs text-text truncate text-center px-1 py-1">
                {getLabel(transfer)}
            </span>
        </button>
    )
}

function TextItem({ transfer, dim, iconSize, copied, onClick, onDoubleClick }: {
    transfer: Transfer, dim: string, iconSize: number, copied: boolean,
    onClick: () => void, onDoubleClick: () => void,
}) {
    return (
        <button
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            className="group relative flex items-start overflow-hidden transition-colors cursor-pointer select-none bg-surface"
            style={{ width: dim, height: dim, borderRadius: RADIUS }}
        >
            {copied ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <LuCheck size={iconSize} className="text-accent-light animate-copied" />
                    <span className="text-xs text-accent-light">Copied</span>
                </span>
            ) : (
                <span
                    className="text-xs text-text text-left w-full h-full p-3 overflow-hidden wrap-break-word leading-relaxed"
                    style={{ maskImage: 'linear-gradient(to bottom, black calc(80% - 1.5rem), transparent 100%)' }}
                >
                    <RichText content={transfer.content} />
                </span>
            )}
        </button>
    )
}

function FileItem({ transfer, dim, iconSize, onClick, onDoubleClick }: {
    transfer: Transfer, dim: string, iconSize: number,
    onClick: () => void, onDoubleClick: () => void,
}) {
    const Icon = getIcon(transfer)
    return (
        <button
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            className="group relative flex items-center justify-center overflow-hidden transition-colors cursor-pointer select-none bg-surface"
            style={{ width: dim, height: dim, borderRadius: RADIUS }}
        >
            <span className="flex flex-col items-center justify-center gap-2 px-2 overflow-hidden">
                <Icon size={iconSize} className="text-text-muted" />
                <span className="text-xs text-text text-center w-full line-clamp-2 break-all">
                    {getLabel(transfer)}
                </span>
            </span>
        </button>
    )
}

// --- Main component ---

interface TransferItemProps {
    transfer: Transfer
    size?: number
}

export default function TransferItem({ transfer, size = 100 }: TransferItemProps) {
    const { selected, toggleSelect, download } = useTransferStore()
    const [copied, setCopied] = useState(false)
    const isSelected = selected.includes(transfer.id)
    const iconSize = Math.round(size * 0.4)
    const fileIconSize = Math.round(size * 0.25)
    const dim = `${size}px`

    function copyText() {
        copyRichText(transfer.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
    }

    useEffect(() => {
        function onCopy(e: Event) {
            if ((e as CustomEvent).detail === transfer.id) copyText()
        }
        window.addEventListener('shelf:copy', onCopy)
        return () => window.removeEventListener('shelf:copy', onCopy)
    }, [transfer.id])

    function handleClick() {
        toggleSelect(transfer.id)
    }

    function handleDoubleClick() {
        window.dispatchEvent(new CustomEvent('shelf:preview', { detail: transfer.id }))
    }

    function handleContextMenu(e: React.MouseEvent) {
        e.preventDefault()
        if (transfer.type === 'text') copyText()
        else download(transfer.id)
    }

    function handleDragStart(e: React.DragEvent) {
        if (transfer.type === 'text') {
            e.dataTransfer.setData('text/plain', transfer.content)
        } else {
            const mime = getMime(transfer)
            const url = `${window.location.origin}/api/transfers/${transfer.id}/download`
            e.dataTransfer.setData('DownloadURL', `${mime}:${transfer.content}:${url}`)
        }
    }

    let content
    if (isImage(transfer)) {
        content = <ImageItem transfer={transfer} dim={dim}
                             onClick={handleClick} onDoubleClick={handleDoubleClick} />
    } else if (transfer.type === 'text') {
        content = <TextItem transfer={transfer} dim={dim} iconSize={iconSize} copied={copied}
                            onClick={handleClick} onDoubleClick={handleDoubleClick} />
    } else {
        content = <FileItem transfer={transfer} dim={dim} iconSize={fileIconSize}
                            onClick={handleClick} onDoubleClick={handleDoubleClick} />
    }

    return (
        <div className={`glow-wrap${isSelected ? ' active' : ''}${transfer.group != null ? ' group-tinted' : ''}`}
             data-transfer-id={transfer.id}
             style={{
                 borderRadius: RADIUS,
                 ...(transfer.group != null && { '--group-color': groupColor(transfer.group) } as React.CSSProperties),
             }}
             title={transfer.type === 'file' ? transfer.content : undefined}
             draggable
             onDragStart={handleDragStart}
             onContextMenu={handleContextMenu}>
            {content}
        </div>
    )
}
