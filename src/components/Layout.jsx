import { useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ user, signOut, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar user={user} signOut={signOut} />
      </div>

      {/* Mobile: hamburger + overlay sidebar */}
      <div className="md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 bg-navy-800 border border-navy-700 rounded-lg p-2 text-gray-300"
        >
          ☰
        </button>
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50">
              <Sidebar user={user} signOut={signOut} />
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
