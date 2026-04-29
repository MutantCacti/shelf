import { LuClipboardPaste } from 'react-icons/lu'
import useTransferStore from '../stores/TransferStore'

export default function PasteButton() {
    const { createText, uploadFile } = useTransferStore()

    async function handlePaste() {
        try {
            const items = await navigator.clipboard.read()
            for (const item of items) {
                const imageType = item.types.find(t => t.startsWith('image/'))
                if (imageType) {
                    const blob = await item.getType(imageType)
                    const ext = imageType.split('/')[1] || 'png'
                    const file = new File([blob], `clipboard.${ext}`, { type: imageType })
                    uploadFile(file)
                    return
                }
                if (item.types.includes('text/plain')) {
                    const blob = await item.getType('text/plain')
                    const text = await blob.text()
                    if (text.trim()) {
                        const dupId = await createText(text.trim())
                        if (dupId) {
                            const el = document.querySelector(`[data-transfer-id="${dupId}"]`)
                            if (el) {
                                el.classList.remove('animate-nudge')
                                void (el as HTMLElement).offsetWidth
                                el.classList.add('animate-nudge')
                                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
                            }
                        }
                    }
                    return
                }
            }
        } catch {
            // Clipboard API not available or permission denied — ignore
        }
    }

    return (
        <button
            onClick={handlePaste}
            className="text-text-muted btn-matte hover:text-accent focus-visible:text-accent transition-all rounded-full p-1 cursor-pointer"
            title="Paste from clipboard"
        >
            <LuClipboardPaste size={20} />
        </button>
    )
}
