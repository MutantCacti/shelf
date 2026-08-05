import { LuLogOut } from 'react-icons/lu'
import useAuthStore from '../stores/AuthStore'

export default function LogoutButton() {
    const logout = useAuthStore(s => s.logout)

    function handleLogout() {
        logout()
    }

    return (
        <button
            onClick={handleLogout}
            className="p-1 hover-glow logout-glow transition-all rounded-lg cursor-pointer hover:scale-110 focus-visible:scale-110"
            style={{ color: 'var(--color-danger-dark)', outlineColor: 'color-mix(in srgb, var(--color-danger) 60%, transparent)' }}
            title="Log out"
        >
            <LuLogOut size={18} style={{ transform: 'scaleX(-1)' }} />
        </button>
    )
}
