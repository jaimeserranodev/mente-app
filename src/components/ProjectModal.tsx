import { useState, useRef, useLayoutEffect, KeyboardEvent } from 'react'
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
        s.replace(/^\s*\d+[.)]\s*/, '').replace(/^\s*[-•*·]\s*/, '').trim()
      )
      .filter(Boolean)
  }
  return text
    .split(/(?<!\S)-\s+/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
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
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-2 group px-1 py-2.5 rounded-xl hover:bg-black/5"
    >
      {/* Drag handle */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
        style={{ color: '#D0CCB8', touchAction: 'none' }}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <circle cx="3" cy="2.5" r="1.5" /><circle cx="7" cy="2.5" r="1.5" />
          <circle cx="3" cy="7" r="1.5" /><circle cx="7" cy="7" r="1.5" />
          <circle cx="3" cy="11.5" r="1.5" /><circle cx="7" cy="11.5" r="1.5" />
        </svg>
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !task.done)}
        className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all"
        style={{
          borderColor: task.done ? '#4CAF7D' : 'rgba(44,44,44,0.2)',
          backgroundColor: task.done ? '#4CAF7D' : 'transparent',
        }}
      >
        {task.done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span
        className="flex-1 text-sm leading-snug"
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
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-black/10"
        style={{ color: '#B0AD9F' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
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

  const descRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { tasks, addTask, toggleTask, deleteTask, reorderTasks } = useProjectTasks(project.id)

  // Auto-resize textarea — useLayoutEffect + rAF ensures DOM is fully painted
  useLayoutEffect(() => {
    const el = descRef.current
    if (!el) return
    requestAnimationFrame(() => autoResize(el))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

  async function commitTaskInput() {
    const lines = parseLines(taskInput)
    if (!lines.length) return
    setTaskInput('')
    for (const line of lines) await addTask(line)
  }

  function handleTaskKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commitTaskInput() }
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

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex((t) => t.id === active.id)
    const newIndex = tasks.findIndex((t) => t.id === over.id)
    reorderTasks(arrayMove(tasks, oldIndex, newIndex).map((t) => t.id))
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
        {/* ── Header ── */}
        <div
          className="flex items-center gap-2 px-4 sm:px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
        >
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[status] }} />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 font-semibold text-base bg-transparent outline-none min-w-0"
            style={{ color: '#1A1A1A' }}
            placeholder="Nombre del proyecto"
          />
          <button
            onClick={() => { onDelete(project.id); onClose() }}
            className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
            style={{ color: '#C0392B' }}
          >
            Eliminar
          </button>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10"
            style={{ color: '#8C8C7A' }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-5 py-4 flex flex-col gap-5">

          {/* Estado */}
          <div className="flex gap-2">
            {PROJECT_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  backgroundColor: status === s.value ? STATUS_COLORS[s.value] + '18' : 'rgba(44,44,44,0.06)',
                  border: `1.5px solid ${status === s.value ? STATUS_COLORS[s.value] : 'transparent'}`,
                  color: status === s.value ? STATUS_COLORS[s.value] : '#8C8C7A',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: status === s.value ? STATUS_COLORS[s.value] : '#B0AD9F' }}
                />
                {s.label}
              </button>
            ))}
          </div>

          {/* Descripción */}
          <textarea
            ref={descRef}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              autoResize(e.target)
            }}
            placeholder="Descripción del proyecto..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1.5px solid rgba(44,44,44,0.15)',
              backgroundColor: '#FFFFFF',
              color: '#2C2C2C',
              fontSize: 15,
              lineHeight: '1.6',
              minHeight: 72,
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
            }}
          />

          {/* Guardar / Descartar */}
          {isDirty && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTitle(project.title)
                  setDescription(project.description ?? '')
                  setStatus(project.status ?? 'activo')
                  setTimeout(() => { if (descRef.current) autoResize(descRef.current) }, 0)
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-70"
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
                }}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ── Tareas ── */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8C8C7A' }}>
                Tareas
              </span>
              {total > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(44,44,44,0.08)', color: '#5C5C4E' }}
                >
                  {done}/{total}
                </span>
              )}
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(44,44,44,0.08)' }} />
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={(e) => setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null)}
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
                    className="flex items-center gap-2 px-1 py-2.5 rounded-xl shadow-lg"
                    style={{ backgroundColor: '#ECEADE', border: '1.5px solid rgba(107,127,212,0.35)' }}
                  >
                    <span className="w-8 h-8 flex items-center justify-center" style={{ color: '#D0CCB8' }}>
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
              className="flex items-center gap-2 mt-2 rounded-xl overflow-hidden"
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
                  padding: '12px 14px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  color: '#2C2C2C',
                }}
              />
              <button
                onClick={commitTaskInput}
                disabled={!taskInput.trim()}
                className="mr-2 w-8 h-8 flex items-center justify-center rounded-lg text-lg font-medium transition-all"
                style={{
                  backgroundColor: taskInput.trim() ? '#1A1A1A' : 'transparent',
                  color: taskInput.trim() ? '#FFFFFF' : '#C8C4B8',
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)', flexShrink: 0 }} />
      </div>
    </div>
  )
}
