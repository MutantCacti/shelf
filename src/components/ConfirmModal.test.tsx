import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmModal from './ConfirmModal'

describe('ConfirmModal', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders the message', () => {
        render(<ConfirmModal message="Delete 3 items?" onConfirm={vi.fn()} onCancel={vi.fn()} />)
        expect(screen.getByText('Delete 3 items?')).toBeInTheDocument()
    })

    it('renders confirm and cancel buttons', () => {
        render(<ConfirmModal message="Sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />)
        expect(screen.getByText('Delete')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('calls onConfirm when Delete button is clicked', async () => {
        const onConfirm = vi.fn()
        render(<ConfirmModal message="Sure?" onConfirm={onConfirm} onCancel={vi.fn()} />)

        await userEvent.click(screen.getByText('Delete'))
        vi.advanceTimersByTime(200)

        expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('calls onCancel when Cancel button is clicked', async () => {
        const onCancel = vi.fn()
        render(<ConfirmModal message="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />)

        await userEvent.click(screen.getByText('Cancel'))
        vi.advanceTimersByTime(200)

        expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onCancel when clicking the backdrop', async () => {
        const onCancel = vi.fn()
        const { container } = render(<ConfirmModal message="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />)

        const backdrop = container.firstElementChild as HTMLElement
        await userEvent.click(backdrop)
        vi.advanceTimersByTime(200)

        expect(onCancel).toHaveBeenCalledOnce()
    })


    it('Escape key dismisses the modal', () => {
        const onCancel = vi.fn()
        render(<ConfirmModal message="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />)

        fireEvent.keyDown(window, { key: 'Escape' })
        vi.advanceTimersByTime(200)

        expect(onCancel).toHaveBeenCalledOnce()
    })


    it('Tab key cycles focus between buttons', () => {
        render(<ConfirmModal message="Sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />)

        const confirmBtn = document.getElementById('modal-confirm')!
        const cancelBtn = document.getElementById('modal-cancel')!

        confirmBtn.focus()
        expect(document.activeElement).toBe(confirmBtn)

        fireEvent.keyDown(window, { key: 'Tab' })
        expect(document.activeElement).toBe(cancelBtn)

        fireEvent.keyDown(window, { key: 'Tab' })
        expect(document.activeElement).toBe(confirmBtn)
    })

    it('Arrow keys cycle focus between buttons', () => {
        render(<ConfirmModal message="Sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />)

        const confirmBtn = document.getElementById('modal-confirm')!
        const cancelBtn = document.getElementById('modal-cancel')!

        confirmBtn.focus()
        fireEvent.keyDown(window, { key: 'ArrowLeft' })
        expect(document.activeElement).toBe(cancelBtn)

        fireEvent.keyDown(window, { key: 'ArrowRight' })
        expect(document.activeElement).toBe(confirmBtn)
    })
})
