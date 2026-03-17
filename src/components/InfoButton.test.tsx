import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InfoButton from './InfoButton'

describe('InfoButton', () => {
    it('calls onClick on click', async () => {
        const onClick = vi.fn()
        render(<InfoButton onClick={onClick} />)

        await userEvent.click(screen.getByTitle('Help'))
        expect(onClick).toHaveBeenCalledOnce()
    })
})
