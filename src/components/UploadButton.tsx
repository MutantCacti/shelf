import { useRef } from 'react'
import { LuUpload } from 'react-icons/lu'
import useTransferStore from '../stores/TransferStore'

export default function UploadButton() {
    const { uploadFile } = useTransferStore()
    const inputRef = useRef<HTMLInputElement>(null)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
        files.forEach(f => uploadFile(f))
        e.target.value = ''
    }

    return (
        <>
            <input
                ref={inputRef}
                id="upload-input"
                type="file"
                multiple
                onChange={handleChange}
                className="hidden"
            />
            <button
                onClick={() => inputRef.current?.click()}
                className="pl-1 text-text-muted hover:text-accent focus-visible:text-accent hover-glow transition-all rounded-full cursor-pointer hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
                title="Upload files"
            >
                <LuUpload size={20} />
            </button>
        </>
    )
}
