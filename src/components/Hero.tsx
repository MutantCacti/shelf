const VERSION = __APP_VERSION__

export default function Hero() {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
                <img src="/melogo.svg" alt="" className="h-12 w-12" draggable={false} />
                <h1 className="text-2xl font-medium text-accent tracking-wide mr-1.5">shelf</h1>
            </div>
            <p className="relative text-xs text-text-muted">
                A simple online transfer tool
                <span className="absolute -top-3.5 right-0 text-[0.6rem] text-text-muted/30">{VERSION}</span>
            </p>
        </div>
    )
}
