import { useState, useEffect } from 'react'
import { LuSendHorizontal } from 'react-icons/lu'
import useTransferStore from '../stores/TransferStore'

export default function SendButton() {
    const { activity, createText } = useTransferStore()
    const [hasText, setHasText] = useState(false)

    useEffect(() => {
        const input = document.getElementById('text-input') as HTMLInputElement | null
        if (!input) return
        function check() { setHasText(!!input!.value.trim()) }
        input.addEventListener('input', check)
        check()
        return () => input.removeEventListener('input', check)
    }, [])

    const disabled = !hasText || !!activity

    function handleSend() {
        const input = document.getElementById('text-input') as HTMLInputElement | null
        if (!input || !input.value.trim()) return
        const text = input.value.trim()
        createText(text).then(dupId => {
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
        // Clear the input via native setter to trigger React's onChange
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        nativeSetter.call(input, '')
        input.dispatchEvent(new Event('input', { bubbles: true }))
    }

    return (
        <button
            onMouseDown={e => { e.preventDefault(); handleSend() }}
            disabled={disabled}
            className="text-text-muted btn-matte hover:text-accent disabled:opacity-40 transition-all rounded-full p-1 cursor-pointer hover:scale-110 focus-visible:scale-110 disabled:hover:scale-100"
            title="Send text"
        >
            <LuSendHorizontal size={16} />
        </button>
    )
}
