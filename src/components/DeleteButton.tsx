import { LuTrash2 } from 'react-icons/lu'
import useTransferStore from '../stores/TransferStore'

export default function DeleteButton({ onDelete }: { onDelete: () => void }) {
    const { selected } = useTransferStore()
    const active = selected.length > 0

    return (
        <button
            onClick={active ? onDelete : undefined}
            disabled={!active}
            className={`ml-1 mr-1.75 transition-all rounded-full p-1 cursor-pointer ${
                active
                    ? 'text-red-400 btn-matte btn-matte-red btn-matte-active hover:text-red-300 focus-visible:text-red-300'
                    : 'text-text-muted opacity-50'
            }`}
            title="Delete selected"
        >
            <LuTrash2 size={20} />
        </button>
    )
}
