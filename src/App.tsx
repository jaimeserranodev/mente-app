import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useItems } from './hooks/useItems'
import { Area } from './lib/supabase'
import LoginPage from './components/LoginPage'
import AuthCallback from './components/AuthCallback'
import Sidebar, { View } from './components/Sidebar'
import MainArea from './components/MainArea'
import CaptureModal from './components/CaptureModal'

function MainApp() {
  const { user, loading, authError, signInWithGoogle } = useAuth()
  const { items, createItem, updateItem, deleteItem } = useItems(user)

  const [view, setView] = useState<View>('todo')
  const [area, setArea] = useState<Area>('Todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Loading splash ──────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#ECEADE' }}
      >
        <p
          className="font-serif text-2xl font-bold animate-pulse"
          style={{ color: '#8C8C7A' }}
        >
          Mente
        </p>
      </div>
    )
  }

  // ── Auth guard ──────────────────────────────────────────────────
  if (!user) return <LoginPage authError={authError} signInWithGoogle={signInWithGoogle} />

  // ── Filtrado ────────────────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    if (view === 'ideas' && item.type !== 'idea') return false
    if (view === 'tareas' && item.type !== 'tarea') return false
    if (view === 'proyectos' && item.type !== 'proyecto') return false
    if (view === 'notas' && item.type !== 'nota') return false
    if (view === 'pendientes') {
      if (item.type !== 'tarea' || item.status !== 'pendiente') return false
    }
    if (view === 'hechas') {
      if (item.type !== 'tarea' || item.status !== 'hecha') return false
    }
    if (area !== 'Todas' && item.area !== area) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#ECEADE' }}>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(26,26,26,0.4)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        items={items}
        view={view}
        onViewChange={(v) => { setView(v); setSidebarOpen(false) }}
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <MainArea
        items={filteredItems}
        view={view}
        area={area}
        onAreaChange={setArea}
        onCapture={() => setShowModal(true)}
        onUpdateItem={updateItem}
        onDeleteItem={deleteItem}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {showModal && (
        <CaptureModal
          onClose={() => setShowModal(false)}
          onSave={createItem}
        />
      )}
    </div>
  )
}

export default function App() {
  const redirect = new URLSearchParams(window.location.search).get('p')
  if (redirect) {
    window.history.replaceState(null, '', redirect)
  }

  return (
    <BrowserRouter basename="/mente-app">
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  )
}
