import { useState, useRef, KeyboardEvent } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Item, ItemStatus, ProjectTask } from '../lib/supabase'
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

function parseLines(raw: string): string[] {
  const text = raw.trim()
  if (!text) return []
  if (text.includes('\n')) {
    return text
      .split('\n')
      .map((s) =>
        s
          .replace(/^\s*\d+[.)]\s*/, '')
          .replace(/^\s*[-•*·]\s*/, '')
          .trim()
      )
      .filter(Boolean)
  }
  const parts = text
    .split(/(?<!\S)-\s+/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
  return parts
}

function SortableTask({
  task,
  onToggle,
  onDelete,
}: {
  task: ProjectTask
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group px-2 py-2 rounded-lg hover:bg-black/5"
    >
      {/* Drag handle */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        style={{ color: '#C8C4B8', touchAction: 'none' }}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2.5" r="1.5" />
          <circle cx="7" cy="2.5" r="1.5" />
          <circle cx="3" cy="7" r="1.5" />
          <circle cx="7" cy="7" r="1.5" />
          <circle cx="3" cy="11.5" r="1.5" />
          <circle cx="7" cy="11.5" r="1.5" />
        </svg>
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !task.done)}
        className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-all"
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

      {/* Title */}
      <span
        className="flex-1 text-sm"
        style={{
          color: task.done ? '#B0AD9F' : '#2C2C2C',
          textDecoration: task.done ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/10"
        style={{ color: '#8C8C7A' }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

export default function ProjectModal({ project, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description ?? '')
  const [status, setStatus] = useState<ItemStatus>(project.status ?? 'activo')
  const [taskInput, setTaskInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTask, setActiveTask] = useState<ProjectTask | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { tasks, addTask, toggleTask, deleteTask, reorderTasks } = useProjectTasks(project.id)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  async function commitTaskInput() {
    const lines = parseLines(taskInput)
    if (!lines.length) return
    setTaskInput('')
    for (const line of lines) {
      await addTask(line)
    }
  }

  function handleTaskKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitTaskInput()
    }
  }

  function handleTaskPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    const lines = parseLines(pasted)
    if (lines.length > 1) {
      e.preventDefault()
      setTaskInput('')
      lines.forEach((line) => addTask(line))
    }
  }

  function handleDragStart(event: DragEndEvent) {
    const { active } = event
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    reorderTasks(reordered.map((t) => t.id))
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
        style={{ backgroundColor: '#ECEADE', maxHeight: '94svh', overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#6B7FD4' }} />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-semibold text-base bg-transparent outline-none"
              style={{ color: '#1A1A1A', minWidth: 0 }}
              placeholder="Nombre del proyecto"
            />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button
              onClick={handleDeleteProject}
              className="text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-red-100"
              style={{ color: '#C0392B' }}
            >
              Eliminar
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-black/10"
              style={{ color: '#8C8C7A' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 flex flex-col gap-4">

          {/* Estado */}
          <div className="flex gap-2 flex-wrap">
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
            onChange={(e) => {
              setDescription(e.target.value)
              const el = e.target
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
            onFocus={(e) => {
              const el = e.target
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }}
            placeholder="Descripción del proyecto..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid rgba(44,44,44,0.2)',
              backgroundColor: '#FFFFFF',
              color: '#2C2C2C',
              fontSize: 14,
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
            }}
          />

          {/* Guardar cambios */}
          {isDirty && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTitle(project.title)
                  setDescription(project.description ?? '')
                  setStatus(project.status ?? 'activo')
                }}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                style={{ backgroundColor: 'rgba(44,44,44,0.08)', color: '#5C5C4E' }}
              >
                Descartar
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex-1 py-2 rounded-xl text-sm font-medium"
                style={{
                  backgroundColor: title.trim() && !saving ? '#1A1A1A' : 'rgba(44,44,44,0.2)',
                  color: title.trim() && !saving ? '#FFFFFF' : '#8C8C7A',
                  cursor: title.trim() && !saving ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )}

          {/* Separador Tareas */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8C8C7A' }}>
              Tareas
            </span>
            {total > 0 && (
              <span className="text-xs" style={{ color: '#B0AD9F' }}>
                {done}/{total} hechas
              </span>
            )}
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(44,44,44,0.08)' }} />
          </div>

          {/* Lista de tareas con drag & drop */}
          <div className="flex flex-col gap-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((task) => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeTask && (
                  <div
                    className="flex items-center gap-2 px-2 py-2 rounded-lg shadow-lg"
                    style={{ backgroundColor: '#ECEADE', border: '1.5px solid rgba(107,127,212,0.4)' }}
                  >
                    <span className="w-7 h-7 flex items-center justify-center" style={{ color: '#C8C4B8' }}>
                      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                        <circle cx="3" cy="2.5" r="1.5" /><circle cx="7" cy="2.5" r="1.5" />
                        <circle cx="3" cy="7" r="1.5" /><circle cx="7" cy="7" r="1.5" />
                        <circle cx="3" cy="11.5" r="1.5" /><circle cx="7" cy="11.5" r="1.5" />
                      </svg>
                    </span>
                    <span className="text-sm" style={{ color: '#2C2C2C' }}>{activeTask.title}</span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            {/* Input nueva tarea */}
            <div
              className="flex items-center gap-2 mt-1 rounded-xl overflow-hidden"
              style={{ border: '1.5px solid rgba(44,44,44,0.12)', backgroundColor: '#F6F3EC' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={handleTaskKeyDown}
                onPaste={handleTaskPaste}
                placeholder="Añadir tarea o pegar lista..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  color: '#2C2C2C',
                }}
              />
              <button
                onClick={commitTaskInput}
                disabled={!taskInput.trim()}
                className="px-3 py-2 mr-1 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: taskInput.trim() ? '#1A1A1A' : 'transparent',
                  color: taskInput.trim() ? '#FFFFFF' : '#B0AD9F',
                  cursor: taskInput.trim() ? 'pointer' : 'default',
                }}
              >
                +
              </button>
            </div>
            <p className="text-xs px-1 mt-1" style={{ color: '#B0AD9F' }}>
              Pega una lista de ChatGPT y se importarán todas las tareas automáticamente
            </p>
          </div>
        </div>

        {/* Safe area bottom spacer */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)', flexShrink: 0 }} />
      </div>
    </div>
  )
}
