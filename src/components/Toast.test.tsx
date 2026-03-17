import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ToastContainer from './Toast'
import useToastStore from '../stores/ToastStore'

describe('ToastContainer', () => {
    beforeEach(() => {
        useToastStore.setState({ toasts: [] })
    })

    it('renders nothing when no toasts', () => {
        const { container } = render(<ToastContainer />)
        expect(container.firstChild).toBeNull()
    })

    it('renders toast messages', () => {
        useToastStore.setState({
            toasts: [
                { id: 1, message: 'Copied to clipboard' },
                { id: 2, message: 'File uploaded' },
            ],
        })

        render(<ToastContainer />)
        expect(screen.getByText('Copied to clipboard')).toBeInTheDocument()
        expect(screen.getByText('File uploaded')).toBeInTheDocument()
    })

    it('updates when toasts change', () => {
        const { rerender } = render(<ToastContainer />)
        expect(screen.queryByText('New toast')).not.toBeInTheDocument()

        useToastStore.setState({
            toasts: [{ id: 1, message: 'New toast' }],
        })

        rerender(<ToastContainer />)
        expect(screen.getByText('New toast')).toBeInTheDocument()
    })
})
