import { useState, useRef, KeyboardEvent } from 'react'
import { Item, ItemStatus } from '../lib/supabase'
import { useProjectTasks } from '../hooks/useProjectTasks'

interface Props {
  project: Item
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Item>) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}

const PROJECT_STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'completado', label: 'Completado' },
]

const STATUS_COLORS: Record<string, string> = {
  activo: '#6B7FD4',
  pausado: '#8C8C7A',
  completado: '#4CAF7D',
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(44,44,44,0.12)',
  backgroundColor: '#F6F3EC',
  color: '#2C2C2C',
  fontSize: 14,
  outline: 'none',
}

export default function ProjectModal({ project, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description ?? '')
  const [status, setStatus] = useState<ItemStatus>(project.status ?? 'activo')
  const [taskInput, setTaskInput] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { tasks, addTask, toggleTask, deleteTask } = useProjectTasks(project.id)

  const isDirty =
    title !== project.title ||
    description !== (project.description ?? '') ||
    status !== project.status

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await onUpdate(project.id, {
      title: title.trim(),
      description: description.trim() || null,
      status,
    })
    setSaving(false)
  }

  async function handleDeleteProject() {
    await onDelete(project.id)
    onClose()
  }

  function parseAndAdd(raw: string) {
    const parts = raw
      .split(/(?<!\S)-\s+/)  // split on " - " separators
      .map((s) => s.replace(/^-\s*/, '').trim())
      .filter(Boolean)
    parts.forEach((t) => addTask(t))
    setTaskInput('')
  }

  function handleTaskKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (taskInput.trim()) parseAndAdd(taskInput)
  }

  function handleTaskPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    if (pasted.includes('-')) {
      e.preventDefault()
      parseAndAdd(pasted)
    }
  }

  const done = tasks.filter((t) => t.done).length
  const total = tasks.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:w-[560px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{
          backgroundColor: '#ECEADE',
          maxHeight: '92vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#6B7FD4' }} />
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#6B7FD4' }}>
              Proyecto
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteProject}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-red-100"
              style={{ color: '#C0392B' }}
            >
              Eliminar
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/10"
              style={{ color: '#8C8C7A' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">

          {/* Título */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              ...inputStyle,
              fontSize: 18,
              fontWeight: 600,
              padding: '10px 12px',
              color: '#1A1A1A',
            }}
            placeholder="Nombre del proyecto"
          />

          {/* Estado */}
          <div className="flex gap-2">
            {PROJECT_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: status === s.value ? STATUS_COLORS[s.value] + '20' : 'rgba(44,44,44,0.05)',
                  border: `1.5px solid ${status === s.value ? STATUS_COLORS[s.value] : 'transparent'}`,
                  color: status === s.value ? STATUS_COLORS[s.value] : '#5C5C4E',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: status === s.value ? STATUS_COLORS[s.value] : '#8C8C7A' }}
                />
                {s.label}
              </button>
            ))}
          </div>

          {/* Descripción */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del proyecto..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          {/* Separador To-Do */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8C8C7A' }}>
              Tareas
            </span>
            {total > 0 && (
              <span className="text-xs" style={{ color: '#B0AD9F' }}>
                {done}/{total} completadas
              </span>
            )}
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(44,44,44,0.08)' }} />
          </div>

          {/* Lista de tareas */}
          <div className="flex flex-col gap-1.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 group px-2 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
              >
                <button
                  onClick={() => toggleTask(task.id, !task.done)}
                  className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all"
                  style={{
                    borderColor: task.done ? '#4CAF7D' : 'rgba(44,44,44,0.25)',
                    backgroundColor: task.done ? '#4CAF7D' : 'transparent',
                  }}
                >
                  {task.done && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span
                  className="flex-1 text-sm"
                  style={{
                    color: task.done ? '#B0AD9F' : '#2C2C2C',
                    textDecoration: task.done ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded"
                  style={{ color: '#8C8C7A' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Input nueva tarea */}
            <div className="flex items-center gap-3 px-2 py-1.5">
              <span
                className="w-4 h-4 rounded border flex-shrink-0"
                style={{ borderColor: 'rgba(44,44,44,0.15)' }}
              />
              <input
                ref={inputRef}
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={handleTaskKeyDown}
                onPaste={handleTaskPaste}
                placeholder="Añadir tarea… (pega - tarea1 - tarea2 para varias)"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  color: '#2C2C2C',
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        {isDirty && (
          <div
            className="flex gap-3 px-6 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(44,44,44,0.08)' }}
          >
            <button
              onClick={() => {
                setTitle(project.title)
                setDescription(project.description ?? '')
                setStatus(project.status ?? 'activo')
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
              style={{ backgroundColor: 'rgba(44,44,44,0.08)', color: '#5C5C4E' }}
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: title.trim() && !saving ? '#1A1A1A' : 'rgba(44,44,44,0.2)',
                color: title.trim() && !saving ? '#FFFFFF' : '#8C8C7A',
                cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
