import { Transfer } from '../types/types'

export const GROUP_COUNT = 10

// Group n (1-10) renders with --color-group-n, defined in index.css @theme.
export const GROUP_COLORS = Array.from(
    { length: GROUP_COUNT },
    (_, i) => `var(--color-group-${i + 1})`,
)

export function groupColor(group: number): string {
    return GROUP_COLORS[group - 1]
}

// Number row maps 1-9 to groups 1-9 and 0 to group 10.
export function keyToGroup(key: string): number | null {
    if (!/^[0-9]$/.test(key)) return null
    return key === '0' ? 10 : Number(key)
}

// Grid order: grouped clusters first (group 1-10), ungrouped last,
// newest first within each bucket.
export function byGroupThenCreated(a: Transfer, b: Transfer): number {
    const ga = a.group ?? Infinity
    const gb = b.group ?? Infinity
    if (ga !== gb) return ga - gb
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1
    return b.id - a.id
}
