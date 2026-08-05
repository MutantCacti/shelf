// Clipboard formatting helpers.
//
// Paste-in: rich text/html from docs or the web is converted to structured
// plain text (line breaks, "- " bullets, links) instead of the browser's
// collapsed text/plain rendition.
// Copy-out: text items are written as both text/plain and a simple text/html
// so pasting into rich editors keeps the structure.

const BLOCK_TAGS = new Set([
    'P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'TR',
    'BLOCKQUOTE', 'PRE', 'FIGURE', 'HR',
])

export function htmlToStructuredText(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html')

    function walk(node: Node, listDepth: number): string {
        if (node.nodeType === Node.TEXT_NODE) {
            // Collapse the formatting whitespace HTML sources are full of;
            // <pre> content is handled by its parent below.
            return (node.textContent ?? '').replace(/\s+/g, ' ')
        }
        if (!(node instanceof Element)) return ''
        const tag = node.tagName
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') return ''
        if (tag === 'BR') return '\n'
        if (tag === 'PRE') return node.textContent ?? ''

        const childDepth = tag === 'UL' || tag === 'OL' ? listDepth + 1 : listDepth
        let text = [...node.childNodes].map(child => walk(child, childDepth)).join('')

        if (tag === 'A') {
            const href = node.getAttribute('href') ?? ''
            const label = text.trim()
            if (href && !href.startsWith('javascript:')) {
                return label && label !== href ? `${label} (${href})` : href
            }
            return text
        }
        if (tag === 'UL' || tag === 'OL') {
            // Own line: a list nested in an <li> must not run into its label
            return `\n${text}`
        }
        if (tag === 'LI') {
            const indent = '  '.repeat(Math.max(0, listDepth - 1))
            const lines = text.split('\n')
            const first = `${indent}- ${lines[0].trim()}`
            const rest = lines.slice(1).filter(l => l.trim() !== '')
            return [first, ...rest].join('\n') + '\n'
        }
        if (BLOCK_TAGS.has(tag)) {
            return `${text.replace(/^ +| +$/g, '')}\n`
        }
        return text
    }

    return walk(doc.body, 0)
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

const URL_RE = /\bhttps?:\/\/[^\s<>"]+/g

function linkify(escapedLine: string): string {
    return escapedLine.replace(URL_RE, url => `<a href="${url}">${url}</a>`)
}

export function textToHtml(content: string): string {
    const lines = content.split('\n')
    const parts: string[] = []
    let listItems: string[] = []

    function flushList() {
        if (listItems.length > 0) {
            parts.push(`<ul>${listItems.join('')}</ul>`)
            listItems = []
        }
    }

    for (const line of lines) {
        const bullet = line.match(/^\s*- (.*)$/)
        if (bullet) {
            listItems.push(`<li>${linkify(escapeHtml(bullet[1]))}</li>`)
        } else {
            flushList()
            parts.push(linkify(escapeHtml(line)))
        }
    }
    flushList()

    return parts.join('<br>').replace(/<\/ul><br>/g, '</ul>')
}

export async function copyRichText(content: string): Promise<void> {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': new Blob([content], { type: 'text/plain' }),
                    'text/html': new Blob([textToHtml(content)], { type: 'text/html' }),
                }),
            ])
            return
        } catch {
            // Fall through to plain writeText (e.g. permissions, older engines)
        }
    }
    await navigator.clipboard.writeText(content)
}
