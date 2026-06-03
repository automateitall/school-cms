import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div style={{ marginLeft: '220px', background: '#f0f4fa' }}
        className="flex-1 min-h-screen p-8">
        {children}
      </div>
    </div>
  )
} 
