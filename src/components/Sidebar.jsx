import { NavLink, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/themes', label: 'Thématiques', icon: '🗂️' },
  { to: '/cards', label: 'Mes cartes', icon: '✏️' },
]

export default function Sidebar({ user, signOut }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-navy-800 border-r border-navy-700 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <span className="text-xl font-extrabold text-accent">📚 VocabMemo</span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-navy-700 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-navy-700'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + sign out */}
      <div className="px-5 py-4 border-t border-navy-700">
        <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
        <button
          onClick={handleSignOut}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
