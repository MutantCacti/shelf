import { useEffect } from 'react'
import { LuArrowLeft } from 'react-icons/lu'
import Hero from '../components/Hero'

const KEYBINDS = [
    ['Click', 'Select item'],
    ['Double-click', 'Copy text / Download file'],
    ['Click+drag', 'Lasso select'],
    ['Ctrl+Enter', 'Upload / Download selected'],
    ['Ctrl+A', 'Select all'],
    ['Ctrl+V', 'Paste text or files'],
    ['Ctrl+Esc', 'Logout'],
    ['Enter', 'Copy selected text / Submit input'],
    ['F2 / Right-click', 'Rename item'],
    ['Delete / Backspace', 'Delete selected'],
    ['Escape', 'Clear selection'],
    ['?', 'Help'],
]

export default function HelpPage({ onBack, onPassword }: { onBack: () => void, onPassword?: () => void }) {
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') { e.preventDefault(); onBack() }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onBack])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-xs text-text-muted/50 hover:text-accent transition-colors mb-6 cursor-pointer"
                >
                    <LuArrowLeft size={14} aria-hidden="true" />
                    Back
                </button>

                {onPassword && (
                    <div className="mb-4">
                        <button
                            onClick={onPassword}
                            className="text-sm text-text-muted hover:text-accent transition-colors cursor-pointer underline underline-offset-4 decoration-text/30 hover:decoration-accent"
                        >
                            Change password
                        </button>
                    </div>
                )}

                <div className="hidden sm:block">
                    <h1 className="text-2xl font-medium text-text mb-6">Keybinds</h1>
                    <div className="flex flex-col gap-3">
                        {KEYBINDS.map(([key, desc]) => (
                            <div key={key} className="flex items-baseline justify-between gap-4">
                                <kbd className="text-xs text-accent font-mono bg-surface px-2 py-1 rounded border border-border/30 whitespace-nowrap">
                                    {key}
                                </kbd>
                                <span className="text-sm text-text-muted">{desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="sm:hidden flex flex-col gap-8">
                    <div>
                        <h2 className="text-sm font-medium text-text mb-3">Gestures</h2>
                        <ul className="flex flex-col gap-2 text-sm text-text-muted">
                            <li><span className="text-accent">Tap</span> an item to select it</li>
                            <li><span className="text-accent">Double-tap</span> to copy text or download a file</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-sm font-medium text-text mb-3">Buttons</h2>
                        <ul className="flex flex-col gap-2 text-sm text-text-muted">
                            <li><span className="text-accent">Paste</span> reads text or images from your clipboard</li>
                            <li><span className="text-accent">Upload</span> opens a file picker</li>
                            <li><span className="text-accent">Download</span> saves selected files (active when files are selected)</li>
                            <li><span className="text-accent">Logo</span> refreshes items from the server</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8">
                    <Hero />
                </div>

                <footer className="mt-10 pt-6 border-t border-border/20 text-center">
                    <a
                        href="https://github.com/MutantCacti/shelf/issues/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-muted hover:text-accent transition-colors underline underline-offset-4 decoration-text/30 hover:decoration-accent"
                    >
                        Send feedback
                    </a>
                    <p className="text-[0.6rem] text-border mt-3">&copy; 2026 Maxence Morel Dierckx. All rights reserved.</p>
                </footer>
            </div>
        </div>
    )
}
