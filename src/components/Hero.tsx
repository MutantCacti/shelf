import { LuGithub } from 'react-icons/lu'

const VERSION = __APP_VERSION__

export default function Hero() {
    return (
        <div className="flex flex-col items-center gap-7">
            <div className="relative flex items-center gap-3">
                <img src="/shelf-logo.svg" alt="" className="h-12 w-12" draggable={false} />
                <h1 className="text-2xl font-medium text-accent tracking-wide mr-1.5">shelf</h1>
                <a
                    href="https://github.com/MutantCacti/shelf/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute -bottom-3.5 right-0 inline-flex items-center gap-1 text-[0.6rem] text-border hover:text-accent transition-colors"
                >
                    <LuGithub size={9} />
                    {VERSION}
                </a>
            </div>
            <p className="text-xs text-text-muted">
                A website for sending things to yourself
            </p>
        </div>
    )
}
