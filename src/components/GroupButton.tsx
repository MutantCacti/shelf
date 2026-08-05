import { useState, useEffect, useRef } from 'react'
import { LuPalette, LuBan } from 'react-icons/lu'
import useTransferStore from '../stores/TransferStore'
import { GROUP_COLORS } from '../lib/groups'

export default function GroupButton() {
    const { selected, applyGroup } = useTransferStore()
    const [open, setOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function onMouseDown(e: MouseEvent) {
            if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
        }
        // Capture phase so Escape closes the popover without clearing the selection
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.stopPropagation()
                setOpen(false)
            }
        }
        window.addEventListener('mousedown', onMouseDown)
        window.addEventListener('keydown', onKeyDown, true)
        return () => {
            window.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('keydown', onKeyDown, true)
        }
    }, [open])

    function pick(group: number | null) {
        applyGroup(selected, group)
        setOpen(false)
    }

    return (
        <div ref={wrapRef} className="relative inline-flex">
            <button
                onClick={() => setOpen(o => !o)}
                className="ml-1 text-accent btn-matte btn-matte-active hover:text-accent-light focus-visible:text-accent-light transition-all rounded-full p-1 cursor-pointer hover:scale-110 focus-visible:scale-110"
                title="Group colours"
            >
                <LuPalette size={20} />
            </button>
            {open && (
                <div
                    data-testid="group-palette"
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 grid grid-cols-[repeat(5,auto)] gap-1.5 p-2 rounded-xl bg-surface border border-border/30 animate-fade-in"
                    style={{ boxShadow: '0 0 20px 8px rgba(0, 0, 0, 0.2)' }}
                >
                    {GROUP_COLORS.map((color, i) => (
                        <button
                            key={i}
                            onClick={() => pick(i + 1)}
                            aria-label={`Group ${i + 1}`}
                            className="w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-115 focus-visible:scale-115"
                            style={{ backgroundColor: color }}
                        />
                    ))}
                    <button
                        onClick={() => pick(null)}
                        aria-label="No colour"
                        className="w-5 h-5 rounded-full cursor-pointer text-text-muted transition-transform hover:scale-115 focus-visible:scale-115 inline-flex items-center justify-center"
                    >
                        <LuBan size={18} />
                    </button>
                </div>
            )}
        </div>
    )
}
