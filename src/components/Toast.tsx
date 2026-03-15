import useToastStore from '../stores/ToastStore'

export default function ToastContainer() {
    const toasts = useToastStore(s => s.toasts)

    if (toasts.length === 0) return null

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className="px-4 py-2 rounded-full bg-surface border border-border
                               text-sm text-text shadow-lg animate-fade-in
                               max-w-sm truncate"
                >
                    {t.message}
                </div>
            ))}
        </div>
    )
}
