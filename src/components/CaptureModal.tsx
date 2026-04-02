import { useState, KeyboardEvent } from 'react'
import { ItemType, Area, ItemStatus, NewItem, Item } from '../lib/supabase'
import { supabase } from '../lib/supabase'

interface CaptureModalProps {
  onClose: () => void
  onSave: (item: NewItem) => Promise<Item | null>
}

const TYPES: { value: ItemType; label: string; color: string; icon: string }[] = [
  { value: 'idea',     label: 'Idea',     color: '#D4A843', icon: '💡' },
  { value: 'tarea',    label: 'Tarea',    color: '#4CAF7D', icon: '✓'  },
  { value: 'proyecto', label: 'Proyecto', color: '#6B7FD4', icon: '◆'  },
  { value: 'nota',     label: 'Nota',     color: '#C4513A', icon: '✏️' },
]

const AREAS: Area[] = ['Todas', 'Mindset', 'Finanzas', 'Bienestar', 'Pasiones', 'Relaciones']

const TASK_STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'pendiente',  label: 'Pendiente'   },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'hecha',      label: 'Hecha'        },
]

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#8C8C7A',
  marginBottom: 8,
  display: 'block' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(44,44,44,0.1)',
  backgroundColor: '#F6F3EC',
  color: '#2C2C2C',
  fontSize: 14,
  outline: 'none',
}

export default function CaptureModal({ onClose, onSave }: CaptureModalProps) {
  const [type, setType]               = useState<ItemType>('idea')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [area, setArea]               = useState<Area>('Todas')
  const [status, setStatus]           = useState<ItemStatus>('pendiente')
  const [saving, setSaving]           = useState(false)

  // subtareas pendientes (solo para proyectos)
  const [subtaskInput, setSubtaskInput] = useState('')
  const [subtasks, setSubtasks]         = useState<string[]>([])

  function parseSubtasks(raw: string): string[] {
    const text = raw.trim()
    if (!text) return []
    // Multiline: split by newlines (ChatGPT, numbered, bullets…)
    if (text.includes('\n')) {
      return text
        .split('\n')
        .map((s) =>
          s
            .replace(/^\s*\d+[.)]\s*/, '')   // "1. " or "1) "
            .replace(/^\s*[-•*·]\s*/, '')    // "- " or "• " or "* "
            .trim()
        )
        .filter(Boolean)
    }
    // Single line with inline dash separators
    return text
      .split(/(?<!\S)-\s+/)
      .map((s) => s.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
  }

  function addSubtask(raw: string) {
    const parts = parseSubtasks(raw)
    if (!parts.length) return
    setSubtasks((prev) => [...prev, ...parts])
    setSubtaskInput('')
  }

  function removeSubtask(i: number) {
    setSubtasks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleSubtaskKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSubtask(subtaskInput)
    }
  }

  function handleSubtaskPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    // Always intercept — input[type=text] strips newlines before onChange
    const pasted = e.clipboardData.getData('text')
    const parts = parseSubtasks(pasted)
    if (parts.length > 1) {
      // Multi-task paste: import all at once
      e.preventDefault()
      setSubtasks((prev) => [...prev, ...parts])
      setSubtaskInput('')
    }
    // Single item: let it paste normally so user can edit before adding
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)

    const newItem: NewItem = {
      type,
      title: title.trim(),
      description: description.trim() || null,
      area,
      status: type === 'tarea' || type === 'proyecto' ? status : null,
    }

    const created = await onSave(newItem)

    // Guardar subtareas si es un proyecto y hay alguna
    if (created && type === 'proyecto' && subtasks.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('project_tasks').insert(
          subtasks.map((title) => ({
            project_id: created.id,
            user_id: user.id,
            title,
            done: false,
          }))
        )
      }
    }

    setSaving(false)
    onClose()
  }

  const currentType = TYPES.find((t) => t.value === type)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:w-[540px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ backgroundColor: '#FFFFFF', maxHeight: '94svh', overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
        >
          <h2 className="font-semibold text-base" style={{ color: '#1A1A1A' }}>
            Nueva captura
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/10"
            style={{ color: '#8C8C7A' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Tipo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setType(t.value)
                  setStatus(t.value === 'proyecto' ? 'activo' : 'pendiente')
                  setSubtasks([])
                }}
                className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-sm transition-all"
                style={{
                  backgroundColor: type === t.value ? t.color + '15' : 'rgba(44,44,44,0.04)',
                  border: `1.5px solid ${type === t.value ? t.color : 'transparent'}`,
                  color: type === t.value ? t.color : '#5C5C4E',
                  fontWeight: type === t.value ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Título */}
          <div>
            <label style={labelStyle}>
              {type === 'proyecto' ? 'Nombre del proyecto' : `Título`}
            </label>
            <input
              type="text"
              placeholder={
                type === 'proyecto'
                  ? 'Ej: Rediseño web Caleta Creativa'
                  : `Nombre de la ${currentType.label.toLowerCase()}...`
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Descripción */}
          {(type === 'idea' || type === 'proyecto' || type === 'nota') && (
            <div>
              <label style={labelStyle}>
                {type === 'proyecto' ? 'Descripción / Objetivo' : type === 'nota' ? 'Contenido' : 'Descripción'}
              </label>
              <textarea
                placeholder={
                  type === 'proyecto'
                    ? '¿Qué quieres conseguir con este proyecto?'
                    : type === 'nota'
                    ? 'Escribe tu nota...'
                    : 'Añade más detalles...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={type === 'nota' ? 5 : 3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          )}

          {/* Estado (solo tareas) */}
          {type === 'tarea' && (
            <div>
              <label style={labelStyle}>Estado</label>
              <div className="flex gap-2">
                {TASK_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className="flex-1 py-2 rounded-lg text-sm transition-all"
                    style={{
                      backgroundColor: status === s.value ? 'rgba(44,44,44,0.12)' : 'rgba(44,44,44,0.05)',
                      border: `1.5px solid ${status === s.value ? 'rgba(44,44,44,0.3)' : 'transparent'}`,
                      color: status === s.value ? '#1A1A1A' : '#5C5C4E',
                      fontWeight: status === s.value ? 600 : 400,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Área */}
          <div>
            <label style={labelStyle}>Área</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as Area)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {AREAS.map((a) => (
                <option key={a} value={a}>{a === 'Todas' ? 'Sin área' : a}</option>
              ))}
            </select>
          </div>

          {/* Subtareas (solo proyectos) */}
          {type === 'proyecto' && (
            <div>
              <label style={labelStyle}>Subtareas</label>

              {/* Lista de subtareas añadidas */}
              {subtasks.length > 0 && (
                <div className="flex flex-col gap-1 mb-2">
                  {subtasks.map((task, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg group"
                      style={{ backgroundColor: 'rgba(44,44,44,0.04)' }}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded border flex-shrink-0"
                        style={{ borderColor: 'rgba(44,44,44,0.2)' }}
                      />
                      <span className="flex-1 text-sm" style={{ color: '#2C2C2C' }}>{task}</span>
                      <button
                        onClick={() => removeSubtask(i)}
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center"
                        style={{ color: '#8C8C7A', fontSize: 16, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input nueva subtarea */}
              <div
                className="flex gap-2"
                style={{
                  border: '1px solid rgba(44,44,44,0.1)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  backgroundColor: '#F6F3EC',
                }}
              >
                <input
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={handleSubtaskKeyDown}
                  onPaste={handleSubtaskPaste}
                  placeholder="Añadir subtarea..."
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    color: '#2C2C2C',
                  }}
                />
                <button
                  onClick={() => addSubtask(subtaskInput)}
                  className="px-4 text-sm font-medium transition-colors hover:bg-black/10"
                  style={{ color: '#5C5C4E' }}
                >
                  Añadir
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#B0AD9F' }}>
                Pulsa Enter o escribe - para añadir rápido
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-6 pt-4 flex-shrink-0"
          style={{
            borderTop: '1px solid rgba(44,44,44,0.08)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity"
            style={{
              backgroundColor: title.trim() && !saving ? '#1A1A1A' : 'rgba(44,44,44,0.2)',
              color: title.trim() && !saving ? '#FFFFFF' : '#8C8C7A',
              cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'rgba(44,44,44,0.08)', color: '#5C5C4E' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
