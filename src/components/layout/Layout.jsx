import { useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ background: '#f0f4fa' }}
        className="flex-1 min-h-screen p-4 md:p-8 md:ml-[220px]">
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ color: '#083e78' }}
          className="md:hidden mb-4 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <span>☰</span> Menu
        </button>
        {children}
      </div>
    </div>
  )
}
