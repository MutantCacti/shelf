import { useEffect } from 'react'

interface ConfirmModalProps {
    message: string
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') { e.preventDefault(); onCancel() }
            else if (e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault()
                const active = document.activeElement
                const confirm = document.getElementById('modal-confirm')
                const cancel = document.getElementById('modal-cancel')
                if (active === confirm) cancel?.focus()
                else confirm?.focus()
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onCancel, onConfirm])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onCancel}
        >
            <div
                className="bg-surface border border-border rounded-3xl p-4 pt-3"
                onClick={e => e.stopPropagation()}
            >
                <p className="text-text text-sm mb-3">{message}</p>
                <div className="flex justify-end gap-2">
                    <button
                        id="modal-confirm"
                        onClick={onConfirm}
                        autoFocus
                        className="px-2 py-1 text-sm text-bg bg-red-400/60 rounded-full
                                   hover:bg-red-400/80 transition-colors cursor-pointer"
                        style={{ outlineColor: 'rgb(248 113 113 / 0.6)' }}
                    >
                        Delete
                    </button>
                    <button
                        id="modal-cancel"
                        onClick={onCancel}
                        className="px-2 py-1 text-sm text-text-muted rounded-full bg-bg/50 transition-colors cursor-pointer hover:brightness-125"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
