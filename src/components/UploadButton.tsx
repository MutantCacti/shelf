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
                className="ml-1 text-accent btn-matte btn-matte-active hover:text-accent-light focus-visible:text-accent-light transition-all rounded-full p-1 cursor-pointer hover:scale-110 focus-visible:scale-110"
                title="Upload files"
            >
                <LuUpload size={20} />
            </button>
        </>
    )
}
