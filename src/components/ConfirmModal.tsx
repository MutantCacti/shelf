import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface ConfirmModalProps {
    message: string
    onConfirm: () => void
    onCancel: () => void
    anchor?: { x: number, y: number } | null
}

export default function ConfirmModal({ message, onConfirm, onCancel, anchor }: ConfirmModalProps) {
    const [visible, setVisible] = useState(false)
    const [pos, setPos] = useState<{ left: number, top: number } | null>(null)
    const cardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true))
    }, [])

    function dismiss() {
        setVisible(false)
        setTimeout(onCancel, 150)
    }

    function confirm() {
        setVisible(false)
        setTimeout(onConfirm, 150)
    }

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') { e.preventDefault(); dismiss() }
            else if (e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault()
                const active = document.activeElement
                const confirmBtn = document.getElementById('modal-confirm')
                const cancel = document.getElementById('modal-cancel')
                if (active === confirmBtn) cancel?.focus()
                else confirmBtn?.focus()
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onCancel])

    useLayoutEffect(() => {
        const el = cardRef.current
        if (!el || !anchor) { setPos(null); return }
        const margin = 16
        function position() {
            if (!el || !anchor) return
            const w = el.offsetWidth
            const h = el.offsetHeight
            const left = Math.max(margin, Math.min(window.innerWidth - w - margin, anchor.x - w / 2))
            const top = Math.max(margin, Math.min(window.innerHeight - h - margin, anchor.y - h / 2))
            setPos({ left, top })
        }
        position()
        const obs = new ResizeObserver(position)
        obs.observe(el)
        window.addEventListener('resize', position)
        return () => {
            obs.disconnect()
            window.removeEventListener('resize', position)
        }
    }, [anchor])

    const anchored = !!anchor
    const cardPositionStyle: React.CSSProperties = anchored
        ? { position: 'fixed', left: pos?.left ?? 0, top: pos?.top ?? 0 }
        : {}
    const cardHidden = anchored && pos === null

    return (
        <div
            className={`fixed inset-0 z-50 transition-all duration-150 ${anchored ? '' : 'flex items-center justify-center'}`}
            style={{
                backgroundColor: visible ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0)',
            }}
            onClick={dismiss}
        >
            <div
                ref={cardRef}
                className="bg-surface border border-border rounded-xl px-6 py-4 max-w-sm w-full mx-4 transition-[opacity,transform] duration-150"
                style={{
                    ...cardPositionStyle,
                    opacity: visible && !cardHidden ? 1 : 0,
                    transform: visible ? 'scale(1)' : 'scale(0.95)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <p className="text-text text-sm text-center mb-4">{message}</p>
                <div className="flex gap-2">
                    <button
                        id="modal-cancel"
                        onClick={dismiss}
                        className="flex-1 px-3 py-2 text-sm text-text-muted rounded-lg bg-bg/50
                                   transition-colors cursor-pointer hover:brightness-125"
                    >
                        Cancel
                    </button>
                    <button
                        id="modal-confirm"
                        onClick={confirm}
                        autoFocus
                        className="flex-1 px-3 py-2 text-sm text-bg font-medium bg-red-400/60 rounded-lg
                                   hover:bg-red-400/80 transition-colors cursor-pointer"
                        style={{ outlineColor: 'rgb(248 113 113 / 0.6)' }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}
