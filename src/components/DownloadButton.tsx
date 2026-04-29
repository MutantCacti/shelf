import { LuDownload } from 'react-icons/lu'
import useTransferStore from '../stores/TransferStore'

export default function DownloadButton() {
    const { selected, transfers, batchDownload } = useTransferStore()
    const hasFiles = selected.some(id => transfers.find(t => t.id === id)?.type !== 'text')

    function handleClick() {
        batchDownload(selected)
    }

    return (
        <button
            onClick={handleClick}
            disabled={!hasFiles}
            className={`ml-1 transition-all rounded-full p-1 cursor-pointer ${
                hasFiles
                    ? 'text-accent btn-matte btn-matte-active hover:text-accent-light focus-visible:text-accent-light hover:-translate-y-px focus-visible:-translate-y-px'
                    : 'text-text-muted opacity-50'
            }`}
            title="Download selected"
        >
            <LuDownload size={20} />
        </button>
    )
}
