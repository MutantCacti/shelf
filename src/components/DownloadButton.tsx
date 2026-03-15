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
            className={`pl-1 transition-all rounded-full cursor-pointer ${
                hasFiles
                    ? 'text-accent hover:text-accent-light focus-visible:text-accent-light hover-glow hover:-translate-y-0.5 focus-visible:-translate-y-0.5'
                    : 'text-text-muted opacity-50'
            }`}
            title="Download selected"
        >
            <LuDownload size={20} />
        </button>
    )
}
