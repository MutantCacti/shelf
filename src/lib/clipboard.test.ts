import { describe, it, expect, vi, afterEach } from 'vitest'
import { htmlToStructuredText, textToHtml, copyRichText } from './clipboard'

describe('htmlToStructuredText', () => {
    it('separates paragraphs with line breaks', () => {
        expect(htmlToStructuredText('<p>one</p><p>two</p>')).toBe('one\ntwo')
    })

    it('converts br tags to line breaks', () => {
        expect(htmlToStructuredText('a<br>b')).toBe('a\nb')
    })

    it('renders list items as dash bullets, nested lists indented', () => {
        const html = '<ul><li>top</li><li>with<ul><li>nested</li></ul></li></ul>'
        expect(htmlToStructuredText(html)).toBe('- top\n- with\n  - nested')
    })

    it('keeps links as "text (href)"', () => {
        expect(htmlToStructuredText('<a href="https://x.io">docs</a>')).toBe('docs (https://x.io)')
        expect(htmlToStructuredText('<a href="https://x.io">https://x.io</a>')).toBe('https://x.io')
    })

    it('drops script and style content', () => {
        expect(htmlToStructuredText('<p>ok</p><script>alert(1)</script><style>p{}</style>')).toBe('ok')
    })

    it('ignores javascript: hrefs', () => {
        expect(htmlToStructuredText('<a href="javascript:alert(1)">x</a>')).toBe('x')
    })

    it('collapses formatting whitespace but keeps pre content', () => {
        expect(htmlToStructuredText('<p>a\n   b</p>')).toBe('a b')
        expect(htmlToStructuredText('<pre>a\n  b</pre>')).toBe('a\n  b')
    })
})

describe('textToHtml', () => {
    it('escapes html entities', () => {
        expect(textToHtml('<script>alert("x")</script>')).toBe(
            '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
        )
    })

    it('converts newlines to br', () => {
        expect(textToHtml('a\nb')).toBe('a<br>b')
    })

    it('converts dash bullets to a ul', () => {
        expect(textToHtml('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>')
    })

    it('linkifies urls', () => {
        expect(textToHtml('see https://x.io')).toBe('see <a href="https://x.io">https://x.io</a>')
    })
})

describe('copyRichText', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('writes text/plain and text/html when ClipboardItem exists', async () => {
        const write = vi.fn().mockResolvedValue(undefined)
        const writeText = vi.fn()
        Object.defineProperty(navigator, 'clipboard', {
            value: { write, writeText },
            configurable: true,
        })
        class FakeClipboardItem {
            types: string[]
            constructor(items: Record<string, Blob>) {
                this.types = Object.keys(items)
            }
        }
        vi.stubGlobal('ClipboardItem', FakeClipboardItem)

        await copyRichText('hello')

        expect(write).toHaveBeenCalledTimes(1)
        expect(write.mock.calls[0][0][0].types).toEqual(['text/plain', 'text/html'])
        expect(writeText).not.toHaveBeenCalled()
    })

    it('falls back to writeText without ClipboardItem', async () => {
        const writeText = vi.fn()
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        })

        await copyRichText('hello')
        expect(writeText).toHaveBeenCalledWith('hello')
    })
})
