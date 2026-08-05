export interface Transfer {
    id: number
    type: 'text' | 'file'
    content: string
    created_at: string
    size: number | null
    group: number | null
}
