import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef } from 'react'
import useTransferStore from '../stores/TransferStore'
import TransferItem from './TransferItem'
import TransferBar from './TransferBar'
const MAX_ITEM = 100
const GAP = 16
const MIN_ITEM = 40
const BAR_OFFSET = 48

function gridBounds(positions: [number, number][]) {
    if (positions.length === 0) return { cols: 0, rows: 0, minX: 0, minY: 0 }
    let minX = 0, maxX = 0, minY = 0, maxY = 0
    for (const [x, y] of positions) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
    }
    return { cols: maxX - minX + 1, rows: maxY - minY + 1, minX, minY }
}

function gridFill(count: number, aspect: number): [number, number][] {
    if (count === 0) return []
    if (count === 1) return [[0, 0]]

    const cols = Math.max(1, Math.round(Math.sqrt(count * aspect)))
    const rows = Math.max(1, Math.ceil(count / cols))

    // Row-major order (left to right, top to bottom), centered around (0, 0)
    const ox = (cols - 1) / 2
    const oy = (rows - 1) / 2
    const positions: [number, number][] = []

    for (let i = 0; i < count; i++) {
        const x = i % cols
        const y = Math.floor(i / cols)
        positions.push([x - ox, y - oy])
    }

    return positions
}

function rectsIntersect(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number,
) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export default function TransferGrid({ onHelp }: { onHelp: () => void }) {
    const { transfers, fetch, uploadFile, rename, clearSelection } = useTransferStore()
    const [dragging, setDragging] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [lasso, setLasso] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
    const lassoRef = useRef(lasso)
    lassoRef.current = lasso
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
    const [barHeight, setBarHeight] = useState(48)
    const containerRef = useRef<HTMLDivElement>(null)
    const gridRef = useRef<HTMLDivElement>(null)
    const barRef = useRef<HTMLDivElement>(null)
    const didLassoRef = useRef(false)

    useEffect(() => { fetch() }, [fetch])

    useEffect(() => {
        function onRename(e: Event) {
            setEditingId((e as CustomEvent).detail)
        }
        window.addEventListener('shelf:rename', onRename)
        return () => window.removeEventListener('shelf:rename', onRename)
    }, [])

    useEffect(() => {
        const el = barRef.current
        if (!el) return
        const obs = new ResizeObserver(([entry]) => {
            setBarHeight(entry.contentRect.height)
        })
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    useLayoutEffect(() => {
        const el = containerRef.current
        if (el) setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    }, [])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const obs = new ResizeObserver(([entry]) => {
            setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height })
        })
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    const aspect = containerSize.w && containerSize.h ? containerSize.w / containerSize.h : 1

    const positions = useMemo(
        () => gridFill(transfers.length, aspect),
        [transfers.length, aspect],
    )

    const bounds = useMemo(() => gridBounds(positions), [positions])
    const { cols, rows } = bounds

    const itemSize = useMemo(() => {
        if (cols === 0 || rows === 0 || containerSize.w === 0) return MAX_ITEM
        const fitW = Math.floor((containerSize.w - GAP) / cols) - GAP
        const fitH = Math.floor((containerSize.h - GAP) / rows) - GAP
        return Math.max(MIN_ITEM, Math.min(MAX_ITEM, fitW, fitH))
    }, [cols, rows, containerSize])

    const cell = itemSize + GAP

    // Lasso hit testing
    const preLassoSelection = useRef<number[]>([])

    const updateLassoSelection = useCallback((l: NonNullable<typeof lasso>) => {
        const grid = gridRef.current
        if (!grid || transfers.length === 0) return
        const cx = grid.offsetWidth / 2
        const cy = grid.offsetHeight / 2

        const lx = Math.min(l.startX, l.currentX)
        const ly = Math.min(l.startY, l.currentY)
        const lw = Math.abs(l.currentX - l.startX)
        const lh = Math.abs(l.currentY - l.startY)

        const hit: number[] = []
        for (let i = 0; i < transfers.length; i++) {
            const [gx, gy] = positions[i]
            const ix = cx + gx * cell - cell / 2
            const iy = cy + gy * cell - cell / 2 + BAR_OFFSET
            if (rectsIntersect(lx, ly, lw, lh, ix, iy, itemSize, itemSize)) {
                hit.push(transfers[i].id)
            }
        }
        const merged = [...new Set([...preLassoSelection.current, ...hit])]
        useTransferStore.setState({ selected: merged })
    }, [transfers, positions, cell, itemSize])

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, input')) return
        if (e.button !== 0) return
        const grid = gridRef.current
        if (!grid) return
        const rect = grid.getBoundingClientRect()
        const x = e.clientX - rect.left + grid.scrollLeft
        const y = e.clientY - rect.top + grid.scrollTop
        if (e.shiftKey) {
            preLassoSelection.current = [...useTransferStore.getState().selected]
        } else {
            preLassoSelection.current = []
            clearSelection()
        }
        setLasso({ startX: x, startY: y, currentX: x, currentY: y })
        e.preventDefault()
    }, [clearSelection])

    useEffect(() => {
        if (!lasso) return

        const handleMouseMove = (e: MouseEvent) => {
            const grid = gridRef.current
            if (!grid) return
            const rect = grid.getBoundingClientRect()
            const x = e.clientX - rect.left + grid.scrollLeft
            const y = e.clientY - rect.top + grid.scrollTop
            const updated = { ...lassoRef.current!, currentX: x, currentY: y }
            setLasso(updated)
            updateLassoSelection(updated)
        }

        const handleMouseUp = () => {
            didLassoRef.current = true
            setLasso(null)
            requestAnimationFrame(() => { didLassoRef.current = false })
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [!!lasso, updateLassoSelection])

    const lassoStyle = useMemo(() => {
        if (!lasso) return null
        return {
            left: Math.min(lasso.startX, lasso.currentX),
            top: Math.min(lasso.startY, lasso.currentY),
            width: Math.abs(lasso.currentX - lasso.startX),
            height: Math.abs(lasso.currentY - lasso.startY),
        } as const
    }, [lasso])

    const handleFileDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragging(true)
    }, [])

    const handleFileDragLeave = useCallback((e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setDragging(false)
    }, [])

    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        Array.from(e.dataTransfer.files).forEach(f => uploadFile(f))
    }, [uploadFile])

    return (
        <div
            ref={containerRef}
            className={`flex-1 flex flex-col overflow-auto transition-colors ${
                dragging ? 'bg-accent/5' : ''
            }`}
            onClick={e => {
                if (!(e.target as HTMLElement).closest('button') && !lassoRef.current && !didLassoRef.current) clearSelection()
                if (!(e.target as HTMLElement).closest('input')) (document.activeElement as HTMLElement)?.blur()
            }}
            onDragOver={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
        >
            <div
                ref={gridRef}
                className="flex-1 relative select-none overflow-visible"
                onMouseDown={transfers.length > 0 ? handleMouseDown : undefined}
            >
                <div
                    ref={barRef}
                    className="absolute inset-x-0 mx-auto w-fit max-w-lg px-4 z-20"
                    style={{
                        top: transfers.length > 0
                            ? `calc(50vh + ${bounds.minY * cell - cell / 2 - GAP - barHeight + BAR_OFFSET}px)`
                            : `calc(50vh - ${barHeight / 2}px)`,
                        transition: 'top 0.3s ease-out',
                    }}
                >
                    <div
                        className="absolute inset-x-0 pointer-events-none z-[-1]"
                        style={{
                            top: '-0.5rem',
                            bottom: '-1rem',
                            opacity: dragging ? 0 : 1,
                            transition: dragging ? 'none' : 'opacity 300ms',
                            background: `linear-gradient(to bottom, transparent, var(--color-bg) 0.5rem, var(--color-bg) calc(100% - 1rem), transparent)`,
                        }}
                    />
                    <TransferBar onHelp={onHelp} />
                </div>
                {transfers.map((t, i) => {
                    const [gx, gy] = positions[i]
                    return (
                        <div
                            key={t.id}
                            className="absolute z-10"
                            style={{
                                left: `calc(50% + ${gx * cell - cell / 2}px)`,
                                top: `calc(50% + ${gy * cell - cell / 2 + BAR_OFFSET}px)`,
                                transition: 'left 0.15s cubic-bezier(0, 0, 0.2, 1), top 0.15s cubic-bezier(0, 0, 0.2, 1)',
                            }}
                        >
                            <TransferItem
                                transfer={t}
                                size={itemSize}
                                editing={editingId === t.id}
                                onStartEdit={() => setEditingId(t.id)}
                                onCommitEdit={(newContent) => { rename(t.id, newContent); setEditingId(null) }}
                                onCancelEdit={() => setEditingId(null)}
                            />
                        </div>
                    )
                })}
                {lassoStyle && (
                    <div
                        className="absolute pointer-events-none border border-accent/50 rounded-sm z-30"
                        style={{ ...lassoStyle, backgroundColor: 'rgba(35, 166, 122, 0.08)' }}
                    />
                )}
            </div>
        </div>
    )
}
