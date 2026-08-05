import { describe, it, expect } from 'vitest'
import { keyToGroup, byGroupThenCreated, groupColor, GROUP_COLORS } from './groups'
import { Transfer } from '../types/types'

const t = (id: number, group: number | null, created_at = '2025-01-01T00:00:00Z'): Transfer => ({
    id,
    type: 'text',
    content: `item ${id}`,
    created_at,
    size: null,
    group,
})

describe('keyToGroup', () => {
    it('maps 1-9 to groups 1-9', () => {
        expect(keyToGroup('1')).toBe(1)
        expect(keyToGroup('9')).toBe(9)
    })

    it('maps 0 to group 10', () => {
        expect(keyToGroup('0')).toBe(10)
    })

    it('returns null for non-digit keys', () => {
        expect(keyToGroup('a')).toBeNull()
        expect(keyToGroup('Enter')).toBeNull()
        expect(keyToGroup('10')).toBeNull()
    })
})

describe('byGroupThenCreated', () => {
    it('orders grouped items before ungrouped', () => {
        const sorted = [t(1, null), t(2, 5), t(3, 2)].sort(byGroupThenCreated)
        expect(sorted.map(x => x.id)).toEqual([3, 2, 1])
    })

    it('orders newest first within a bucket', () => {
        const sorted = [
            t(1, 1, '2025-01-01T00:00:00Z'),
            t(2, 1, '2025-06-01T00:00:00Z'),
            t(3, null, '2025-01-01T00:00:00Z'),
            t(4, null, '2025-06-01T00:00:00Z'),
        ].sort(byGroupThenCreated)
        expect(sorted.map(x => x.id)).toEqual([2, 1, 4, 3])
    })

    it('breaks created_at ties by id, newest first', () => {
        const sorted = [t(1, null), t(2, null), t(3, null)].sort(byGroupThenCreated)
        expect(sorted.map(x => x.id)).toEqual([3, 2, 1])
    })
})

describe('groupColor', () => {
    it('maps group n to --color-group-n', () => {
        expect(groupColor(1)).toBe('var(--color-group-1)')
        expect(groupColor(10)).toBe('var(--color-group-10)')
        expect(GROUP_COLORS).toHaveLength(10)
    })
})
