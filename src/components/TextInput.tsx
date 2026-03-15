import { useState, useRef } from 'react'
import useTransferStore from '../stores/TransferStore'

const CARET_COLORS = [
    'var(--color-accent)',
    'var(--color-accent-light)',
    'var(--color-accent-dark)',
    'var(--color-highlight)',
    'var(--color-accent-light)',
    'var(--color-accent)',
]

export default function TextInput() {
    const { createText, activity } = useTransferStore()
    const [value, setValue] = useState('')
    const caretIdx = useRef(0)
    const [caretColor, setCaretColor] = useState(CARET_COLORS[0])

    const { selected, batchDownload } = useTransferStore()

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (selected.length > 0) {
                batchDownload(selected)
            } else {
                document.getElementById('upload-input')?.click()
            }
            return
        }

        if (e.key === 'Enter' && value.trim()) {
            createText(value.trim()).then(dupId => {
                if (dupId) {
                    const el = document.querySelector(`[data-transfer-id="${dupId}"]`)
                    if (el) {
                        el.classList.remove('animate-nudge')
                        void (el as HTMLElement).offsetWidth
                        el.classList.add('animate-nudge')
                        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
                    }
                }
            })
            setValue('')
        }
    }

    return (
        <div className="flex-1 relative">
        <label htmlFor="text-input" className="sr-only">Transfer text</label>
        <input
            type="text"
            value={value}
            onChange={e => {
                setValue(e.target.value)
                caretIdx.current = (caretIdx.current + 1) % CARET_COLORS.length
                setCaretColor(CARET_COLORS[caretIdx.current])
            }}
            onKeyDown={handleKeyDown}
            disabled={!!activity}
            placeholder="Send text"
            id="text-input"
            className="peer w-full bg-transparent rounded-none
                       mx-0.25 pl-2.75 my-0.25 py-1.5 text-xs text-text placeholder:text-text/60
                       hover:placeholder:text-accent focus:placeholder:text-accent
                       placeholder:transition-colors disabled:opacity-50"
            style={{ caretColor }}
        />
        <div className="absolute bottom-1 left-3 right-0 h-px bg-border/30 pointer-events-none transition-colors peer-focus:bg-accent/50" />
        </div>
    )
}
