import { LuInfo } from 'react-icons/lu'

export default function InfoButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="text-text-muted hover:text-accent focus-visible:text-accent hover-glow transition-all rounded-full p-1 cursor-pointer"
            title="Help"
        >
            <LuInfo size={20} />
        </button>
    )
}
