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
            className="p-1 hover-glow logout-glow transition-all rounded-lg cursor-pointer hover:-translate-x-px hover:-translate-y-px focus-visible:-translate-x-px focus-visible:-translate-y-px"
            style={{ color: '#b45a5a', outlineColor: 'rgb(248 113 113 / 0.6)' }}
            title="Log out"
        >
            <LuLogOut size={18} style={{ transform: 'scaleX(-1)' }} />
        </button>
    )
}
