import { useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import useTransferStore from '../stores/TransferStore'
import ConfirmModal from './ConfirmModal'

export default function DeleteButton() {
    const { selected, batchRemove, clearSelection } = useTransferStore()
    const [showConfirm, setShowConfirm] = useState(false)
    const active = selected.length > 0

    function handleClick() {
        if (active) setShowConfirm(true)
    }

    function handleConfirm() {
        batchRemove(selected)
        clearSelection()
        setShowConfirm(false)
    }

    return (
        <>
            <button
                onClick={handleClick}
                disabled={!active}
                className={`pl-1 transition-all rounded-full cursor-pointer ${
                    active
                        ? 'text-red-400 hover:text-red-300 focus-visible:text-red-300 hover-glow'
                        : 'text-text-muted opacity-50'
                }`}
                title="Delete selected"
            >
                <LuTrash2 size={20} />
            </button>
            {showConfirm && (
                <ConfirmModal
                    message={selected.length === 1 ? 'Delete this item?' : `Delete ${selected.length} items?`}
                    onConfirm={handleConfirm}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </>
    )
}
