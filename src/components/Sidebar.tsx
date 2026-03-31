import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Item, supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ProfileModal from './ProfileModal'

export type View =
  | 'todo'
  | 'ideas'
  | 'tareas'
  | 'proyectos'
  | 'notas'
  | 'pendientes'
  | 'hechas'

interface SidebarProps {
  items: Item[]
  view: View
  onViewChange: (v: View) => void
  user: User
  searchQuery: string
  onSearchChange: (q: string) => void
  isOpen: boolean
  onClose: () => void
}

const TYPE_COLORS: Record<string, string> = {
  idea: '#D4A843',
  tarea: '#4CAF7D',
  proyecto: '#6B7FD4',
  nota: '#C4513A',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-1 mt-5 px-3"
      style={{ color: '#B0AD9F' }}
    >
      {children}
    </p>
  )
}

function NavItem({
  active,
  dot,
  label,
  count,
  onClick,
}: {
  active: boolean
  dot?: string
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors"
      style={{
        backgroundColor: active ? 'rgba(44,44,44,0.07)' : 'transparent',
        color: active ? '#1A1A1A' : '#5C5C4E',
        fontWeight: active ? 500 : 400,
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: dot ?? '#1A1A1A' }}
      />
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs tabular-nums" style={{ color: '#B0AD9F' }}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function Sidebar({
  items,
  view,
  onViewChange,
  user,
  searchQuery,
  onSearchChange,
  isOpen,
  onClose,
}: SidebarProps) {
  const { signOut } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const [currentUser, setCurrentUser] = useState<User>(user)

  async function handleProfileUpdated() {
    const { data: { user: updated } } = await supabase.auth.getUser()
    if (updated) setCurrentUser(updated as User)
  }

  const avatarUrlLive = currentUser.user_metadata?.avatar_url as string | undefined
  const displayNameLive = (currentUser.user_metadata?.full_name as string | undefined) ?? currentUser.email ?? 'Tú'

  const counts = {
    todo: items.length,
    ideas: items.filter((i) => i.type === 'idea').length,
    tareas: items.filter((i) => i.type === 'tarea').length,
    proyectos: items.filter((i) => i.type === 'proyecto').length,
    notas: items.filter((i) => i.type === 'nota').length,
    pendientes: items.filter((i) => i.type === 'tarea' && i.status === 'pendiente').length,
    hechas: items.filter((i) => i.type === 'tarea' && i.status === 'hecha').length,
  }

  const ahora = Date.now()
  const semana = items.filter(
    (i) => ahora - new Date(i.created_at).getTime() < 7 * 24 * 3600 * 1000
  ).length
  const proyectosActivos = items.filter(
    (i) => i.type === 'proyecto' && i.status === 'activo'
  ).length

  return (
    <aside
      className="flex flex-col h-screen flex-shrink-0 fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300"
      style={{
        width: 280,
        backgroundColor: '#ECEADE',
        borderRight: '1px solid rgba(44,44,44,0.1)',
        transform: isOpen ? 'translateX(0)' : undefined,
      }}
      // On desktop always visible; on mobile use translate
      data-open={isOpen}
    >
      {/* Mobile: force hidden via inline style when closed */}
      <style>{`
        @media (max-width: 767px) {
          aside[data-open="false"] { transform: translateX(-100%); }
          aside[data-open="true"]  { transform: translateX(0); }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="px-5 pt-7 pb-4 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: '#2C2C2C' }}>
            Mente
          </h1>
          <p className="text-[10px] tracking-[0.2em] uppercase mt-0.5" style={{ color: '#8C8C7A' }}>
            Segundo Cerebro
          </p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden mt-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10"
          style={{ color: '#8C8C7A' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Buscador ── */}
      <div className="px-3 mb-2">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="13" height="13" viewBox="0 0 20 20" fill="none"
          >
            <path
              d="M8.5 3a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 8.5a6.5 6.5 0 1111.436 4.23l3.857 3.857a.75.75 0 11-1.06 1.06l-3.857-3.856A6.5 6.5 0 012 8.5z"
              fill="#8C8C7A"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar en todo..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'rgba(44,44,44,0.06)', color: '#2C2C2C' }}
          />
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <SectionLabel>Vistas</SectionLabel>
        <NavItem active={view === 'todo'} dot="#1A1A1A" label="Todo" count={counts.todo} onClick={() => onViewChange('todo')} />

        <SectionLabel>Tipos</SectionLabel>
        <NavItem active={view === 'ideas'} dot={TYPE_COLORS.idea} label="Ideas" count={counts.ideas} onClick={() => onViewChange('ideas')} />
        <NavItem active={view === 'tareas'} dot={TYPE_COLORS.tarea} label="Tareas" count={counts.tareas} onClick={() => onViewChange('tareas')} />
        <NavItem active={view === 'proyectos'} dot={TYPE_COLORS.proyecto} label="Proyectos" count={counts.proyectos} onClick={() => onViewChange('proyectos')} />
        <NavItem active={view === 'notas'} dot={TYPE_COLORS.nota} label="Notas" count={counts.notas} onClick={() => onViewChange('notas')} />

        <SectionLabel>Tareas</SectionLabel>
        <NavItem active={view === 'pendientes'} dot="#E8924A" label="Pendientes" count={counts.pendientes} onClick={() => onViewChange('pendientes')} />
        <NavItem active={view === 'hechas'} dot={TYPE_COLORS.tarea} label="Hechas" count={counts.hechas} onClick={() => onViewChange('hechas')} />
      </nav>

      {/* ── Stats ── */}
      <div className="mx-3 mb-3 rounded-xl p-4" style={{ backgroundColor: 'rgba(44,44,44,0.05)' }}>
        <div className="flex justify-between text-center">
          <div>
            <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{counts.todo}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: '#8C8C7A' }}>Total</p>
          </div>
          <div className="w-px" style={{ backgroundColor: 'rgba(44,44,44,0.1)' }} />
          <div>
            <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{semana}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: '#8C8C7A' }}>Esta semana</p>
          </div>
          <div className="w-px" style={{ backgroundColor: 'rgba(44,44,44,0.1)' }} />
          <div>
            <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{proyectosActivos}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: '#8C8C7A' }}>Activos</p>
          </div>
        </div>
      </div>

      {/* ── Usuario ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 mx-3 mb-4 rounded-xl cursor-pointer group"
        style={{ backgroundColor: 'rgba(44,44,44,0.05)' }}
        onClick={() => setShowProfile(true)}
        title="Editar perfil"
      >
        {avatarUrlLive ? (
          <img
            src={avatarUrlLive}
            alt={displayNameLive}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
            style={{ backgroundColor: '#1A1A1A', color: '#ECEADE' }}
          >
            {displayNameLive[0].toUpperCase()}
          </div>
        )}
        <span className="flex-1 text-sm truncate" style={{ color: '#2C2C2C' }}>
          {displayNameLive.split(' ')[0]}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); signOut() }}
          title="Cerrar sesión"
          className="text-xs transition-opacity hover:opacity-70 p-1"
          style={{ color: '#8C8C7A' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onUpdated={handleProfileUpdated}
        />
      )}
    </aside>
  )
}
