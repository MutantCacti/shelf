import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { tokenize, RichText } from './richtext'

describe('tokenize', () => {
    it('extracts http(s) urls from surrounding text', () => {
        expect(tokenize('see https://example.com for more')).toEqual([
            { kind: 'text', value: 'see ' },
            { kind: 'url', value: 'https://example.com' },
            { kind: 'text', value: ' for more' },
        ])
    })

    it('trims trailing sentence punctuation from urls', () => {
        expect(tokenize('go to https://example.com/a.')).toEqual([
            { kind: 'text', value: 'go to ' },
            { kind: 'url', value: 'https://example.com/a' },
            { kind: 'text', value: '.' },
        ])
    })

    it('handles a url at the end and multiple urls', () => {
        const tokens = tokenize('http://a.io and https://b.io')
        expect(tokens.filter(t => t.kind === 'url').map(t => t.value)).toEqual([
            'http://a.io',
            'https://b.io',
        ])
    })

    it('does not linkify other schemes', () => {
        expect(tokenize('ftp://files javascript:alert(1)')).toEqual([
            { kind: 'text', value: 'ftp://files javascript:alert(1)' },
        ])
    })

    it('marks a leading TODO token only', () => {
        expect(tokenize('TODO buy milk')[0]).toEqual({ kind: 'todo', value: 'TODO' })
        expect(tokenize('my TODO list').every(t => t.kind === 'text')).toBe(true)
    })

    it('plain text stays a single text token', () => {
        expect(tokenize('just words')).toEqual([{ kind: 'text', value: 'just words' }])
    })
})

describe('RichText', () => {
    it('renders links with safe attributes', () => {
        render(<RichText content="see https://example.com now" />)
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', 'https://example.com')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('clicking a link does not propagate to the card', () => {
        const onClick = vi.fn()
        render(
            <button onClick={onClick}>
                <RichText content="https://example.com" />
            </button>,
        )
        fireEvent.click(screen.getByRole('link'))
        expect(onClick).not.toHaveBeenCalled()
    })

    it('renders script-looking content as inert text', () => {
        const { container } = render(<RichText content={'<script>alert(1)</script>'} />)
        expect(container.querySelector('script')).toBeNull()
        expect(container).toHaveTextContent('<script>alert(1)</script>')
    })

    it('highlights the TODO token', () => {
        render(<RichText content="TODO water plants" />)
        const todo = screen.getByText('TODO')
        expect(todo.className).toContain('text-secondary')
    })
})
