import { useState, useRef, useEffect } from 'react'
import Hero from '../components/Hero'

const CARET_COLORS = [
    'var(--color-accent)',
    'var(--color-accent-light)',
    'var(--color-accent-dark)',
    'var(--color-highlight)',
    'var(--color-accent-light)',
    'var(--color-accent)',
]

export default function AccessPage({ onLogin }: { onLogin: () => void }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const caretIdx = useRef(0)
    const [caretColor, setCaretColor] = useState(CARET_COLORS[0])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password }),
            })

            if (!res.ok) {
                setError('Invalid password')
                return
            }

            onLogin()
        } catch {
            setError('Connection failed')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.target instanceof HTMLInputElement) return
            if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
                document.getElementById('password')?.focus()
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [])

    return (
        <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
            <Hero />
            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-xs">
                <div className="inline-flex items-center gap-2 px-1 py-1 rounded-full w-full
                                bg-surface border border-border/30"
                     style={{ boxShadow: '0 0 20px 8px rgba(0, 0, 0, 0.2)' }}>
                    <div className="relative flex-1">
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => {
                                setPassword(e.target.value)
                                caretIdx.current = (caretIdx.current + 1) % CARET_COLORS.length
                                setCaretColor(CARET_COLORS[caretIdx.current])
                            }}
                            placeholder="Password"
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            data-bwignore
                            autoFocus
                            className="peer w-full bg-transparent rounded-none
                                       mx-0.25 pl-2.75 my-0.25 py-1.5 text-xs text-text placeholder:text-text/60
                                       hover:placeholder:text-accent focus:placeholder:text-accent
                                       placeholder:transition-colors"
                            style={{ caretColor }}
                        />
                        <div className="absolute bottom-1 left-3 right-0 h-px bg-border/30 pointer-events-none transition-colors peer-focus:bg-accent/50" />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="text-xs text-bg bg-accent rounded-full px-3 py-1.5
                                   hover:bg-accent-light disabled:opacity-40 transition-colors
                                   cursor-pointer whitespace-nowrap"
                    >
                        {loading ? 'Signing in' : 'Sign in'}
                    </button>
                </div>
                {error && (
                    <p className="text-xs text-red-400/80">{error}</p>
                )}
            </form>
        </main>
    )
}
