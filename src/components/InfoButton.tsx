import { LuInfo } from 'react-icons/lu'

export default function InfoButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="text-text-muted hover:text-accent focus-visible:text-accent hover-glow transition-all rounded-full cursor-pointer hover:-translate-y-0.5 focus-visible:-translate-y-0.5 pl-1 pr-2"
            title="Help"
        >
            <LuInfo size={18} />
        </button>
    )
}
