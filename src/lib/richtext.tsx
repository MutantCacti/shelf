import React from 'react'

// Tokenizer + renderer for text item content: highlights http(s) links and a
// leading TODO marker. Rendering stays plain React elements (never
// dangerouslySetInnerHTML) so content remains escaped.

export interface Token {
    kind: 'text' | 'url' | 'todo'
    value: string
}

const URL_RE = /\bhttps?:\/\/[^\s<>"]+/g
// Punctuation that is almost always sentence context, not part of the URL
const TRAILING_PUNCT_RE = /[.,;:!?'")\]]+$/

export function tokenize(content: string): Token[] {
    const tokens: Token[] = []
    let rest = content

    if (rest.startsWith('TODO')) {
        tokens.push({ kind: 'todo', value: 'TODO' })
        rest = rest.slice(4)
    }

    let last = 0
    for (const match of rest.matchAll(URL_RE)) {
        let url = match[0]
        const trimmed = url.match(TRAILING_PUNCT_RE)
        if (trimmed) url = url.slice(0, -trimmed[0].length)
        if (!url) continue
        if (match.index! > last) tokens.push({ kind: 'text', value: rest.slice(last, match.index!) })
        tokens.push({ kind: 'url', value: url })
        last = match.index! + url.length
    }
    if (last < rest.length) tokens.push({ kind: 'text', value: rest.slice(last) })

    return tokens
}

export function RichText({ content }: { content: string }) {
    return (
        <>
            {tokenize(content).map((token, i) => {
                if (token.kind === 'url') {
                    return (
                        <a
                            key={i}
                            href={token.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-accent-light underline decoration-accent-light/50 hover:text-highlight hover:decoration-highlight focus-visible:text-highlight"
                        >
                            {token.value}
                        </a>
                    )
                }
                if (token.kind === 'todo') {
                    return (
                        <span key={i} className="text-secondary font-semibold">
                            {token.value}
                        </span>
                    )
                }
                return <React.Fragment key={i}>{token.value}</React.Fragment>
            })}
        </>
    )
}
