import { useState } from 'react'
import { Item, Area } from '../lib/supabase'
import { View } from './Sidebar'
import ProjectModal from './ProjectModal'

interface MainAreaProps {
  items: Item[]
  view: View
  area: Area
  onAreaChange: (a: Area) => void
  onCapture: () => void
  onUpdateItem: (id: string, updates: Partial<Item>) => Promise<unknown>
  onDeleteItem: (id: string) => Promise<unknown>
}

const VIEW_LABELS: Record<View, string> = {
  todo: 'Todo',
  ideas: 'Ideas',
  tareas: 'Tareas',
  proyectos: 'Proyectos',
  notas: 'Notas',
  pendientes: 'Pendientes',
  hechas: 'Hechas',
}

const AREAS: Area[] = [
  'Todas',
  'Mindset',
  'Finanzas',
  'Bienestar',
  'Pasiones',
  'Relaciones',
]

const TYPE_COLORS: Record<string, string> = {
  idea: '#D4A843',
  tarea: '#4CAF7D',
  proyecto: '#6B7FD4',
  nota: '#C4513A',
}

const TYPE_LABELS: Record<string, string> = {
  idea: 'Idea',
  tarea: 'Tarea',
  proyecto: 'Proyecto',
  nota: 'Nota',
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  hecha: 'Hecha',
  activo: 'Activo',
  pausado: 'Pausado',
  completado: 'Completado',
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: '#E8924A',
  en_progreso: '#D4A843',
  hecha: '#4CAF7D',
  activo: '#6B7FD4',
  pausado: '#8C8C7A',
  completado: '#4CAF7D',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function ItemCard({
  item,
  onDelete,
  onUpdateStatus,
  onOpenProject,
}: {
  item: Item
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: string) => void
  onOpenProject: (item: Item) => void
}) {
  const color = TYPE_COLORS[item.type]

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 group relative"
      onClick={() => item.type === 'proyecto' && onOpenProject(item)}
      style={{
        backgroundColor: '#F2EFE8',
        border: '1px solid rgba(44,44,44,0.06)',
        cursor: item.type === 'proyecto' ? 'pointer' : 'default',
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
            {item.title}
          </span>
        </div>

        {/* Delete button (visible on hover) */}
        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/10 flex-shrink-0"
          style={{ color: '#8C8C7A' }}
          title="Eliminar"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Description */}
      {item.description && (
        <p
          className="text-sm leading-relaxed pl-4"
          style={{ color: '#5C5C4E' }}
        >
          {item.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 flex-wrap pl-4 mt-1">
        {/* Type pill */}
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{
            backgroundColor: color + '18',
            color: color,
          }}
        >
          {TYPE_LABELS[item.type]}
        </span>

        {/* Area pill */}
        {item.area && item.area !== 'Todas' && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'rgba(44,44,44,0.07)',
              color: '#5C5C4E',
            }}
          >
            {item.area}
          </span>
        )}

        {/* Status pill (for tasks and projects) */}
        {item.status && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              backgroundColor: STATUS_COLORS[item.status] + '18',
              color: STATUS_COLORS[item.status],
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[item.status] }}
            />
            {STATUS_LABELS[item.status]}
          </span>
        )}

        {/* Date */}
        <span
          className="ml-auto text-[10px]"
          style={{ color: '#B0AD9F' }}
        >
          {formatDate(item.created_at)}
        </span>
      </div>

      {/* Quick status toggle for tasks */}
      {item.type === 'tarea' && item.status !== 'hecha' && (
        <button
          onClick={() => onUpdateStatus(item.id, 'hecha')}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] pl-4 text-left hover:underline"
          style={{ color: '#4CAF7D' }}
        >
          Marcar como hecha →
        </button>
      )}
    </div>
  )
}

export default function MainArea({
  items,
  view,
  area,
  onAreaChange,
  onCapture,
  onUpdateItem,
  onDeleteItem,
}: MainAreaProps) {
  const title = VIEW_LABELS[view]
  const [selectedProject, setSelectedProject] = useState<Item | null>(null)

  return (
    <main
      className="flex-1 flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: '#ECEADE' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-8 py-6 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
      >
        <h2 className="text-xl font-semibold" style={{ color: '#1A1A1A' }}>
          {title}
          <span className="text-sm font-normal ml-2" style={{ color: '#B0AD9F' }}>
            {items.length > 0 ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : ''}
          </span>
        </h2>

        <button
          onClick={onCapture}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
        >
          <span className="text-base leading-none">+</span>
          Capturar
        </button>
      </div>

      {/* ── Area tabs ── */}
      <div
        className="flex items-center gap-1 px-8 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
      >
        {AREAS.map((a) => (
          <button
            key={a}
            onClick={() => onAreaChange(a)}
            className="relative py-3 px-3 text-sm transition-colors"
            style={{
              color: area === a ? '#1A1A1A' : '#8C8C7A',
              fontWeight: area === a ? 500 : 400,
            }}
          >
            {a}
            {area === a && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: '#1A1A1A' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <span className="text-5xl" style={{ color: '#C8C4B8' }}>
              ∅
            </span>
            <p
              className="text-base italic"
              style={{ color: '#8C8C7A' }}
            >
              Nada aquí todavía. Pulsa + Capturar para empezar.
            </p>
          </div>
        ) : (
          /* Items grid */
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            }}
          >
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={onDeleteItem}
                onUpdateStatus={(id, status) =>
                  onUpdateItem(id, { status: status as Item['status'] })
                }
                onOpenProject={setSelectedProject}
              />
            ))}
          </div>
        )}
      </div>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={(id, updates) => {
            setSelectedProject((p) => p ? { ...p, ...updates } : p)
            return onUpdateItem(id, updates)
          }}
          onDelete={onDeleteItem}
        />
      )}
    </main>
  )
}
