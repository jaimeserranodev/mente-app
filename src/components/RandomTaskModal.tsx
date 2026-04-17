import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface RandomTask {
  taskId: string
  taskTitle: string
  projectTitle: string
}

interface Props {
  onClose: () => void
}

export default function RandomTaskModal({ onClose }: Props) {
  const [task, setTask] = useState<RandomTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)
  const [marked, setMarked] = useState(false)

  async function pickRandom() {
    setLoading(true)
    setMarked(false)

    const { data: tasks } = await supabase
      .from('project_tasks')
      .select('id, title, project_id, created_at')
      .eq('done', false)
      .order('created_at', { ascending: true })

    if (!tasks || tasks.length === 0) {
      setEmpty(true)
      setTask(null)
      setLoading(false)
      return
    }

    // Keep first pending task per project
    const byProject = new Map<string, typeof tasks[0]>()
    for (const t of tasks) {
      if (!byProject.has(t.project_id)) byProject.set(t.project_id, t)
    }

    const projectIds = Array.from(byProject.keys())
    const randomId = projectIds[Math.floor(Math.random() * projectIds.length)]
    const chosen = byProject.get(randomId)!

    const { data: project } = await supabase
      .from('items')
      .select('title')
      .eq('id', randomId)
      .single()

    setEmpty(false)
    setTask({
      taskId: chosen.id,
      taskTitle: chosen.title,
      projectTitle: project?.title ?? 'Proyecto',
    })
    setLoading(false)
  }

  useEffect(() => { pickRandom() }, [])

  async function handleMarkDone() {
    if (!task) return
    await supabase.from('project_tasks').update({ done: true }).eq('id', task.taskId)
    setMarked(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:w-[420px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ backgroundColor: '#ECEADE', overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎲</span>
            <h2 className="font-semibold text-base" style={{ color: '#1A1A1A' }}>
              Tarea del momento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10"
            style={{ color: '#8C8C7A' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{ borderColor: '#D4A843', borderTopColor: 'transparent' }}
              />
            </div>
          ) : empty ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-medium" style={{ color: '#1A1A1A' }}>
                ¡Sin tareas pendientes!
              </p>
              <p className="text-sm mt-1" style={{ color: '#8C8C7A' }}>
                Todos tus proyectos están al día.
              </p>
            </div>
          ) : task ? (
            <>
              <div
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ backgroundColor: '#FFFFFF', border: '1.5px solid rgba(44,44,44,0.1)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B7FD4' }}>
                  {task.projectTitle}
                </p>
                <p
                  className="text-base font-medium leading-snug"
                  style={{
                    color: marked ? '#B0AD9F' : '#1A1A1A',
                    textDecoration: marked ? 'line-through' : 'none',
                  }}
                >
                  {task.taskTitle}
                </p>
              </div>

              {marked ? (
                <p className="text-center text-sm font-medium" style={{ color: '#4CAF7D' }}>
                  ✓ Marcada como hecha
                </p>
              ) : (
                <button
                  onClick={handleMarkDone}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#4CAF7D', color: '#FFFFFF' }}
                >
                  Marcar como hecha
                </button>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-5 pt-3"
          style={{
            borderTop: '1px solid rgba(44,44,44,0.08)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          {!empty && (
            <button
              onClick={pickRandom}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 flex items-center justify-center gap-1.5"
              style={{ backgroundColor: 'rgba(44,44,44,0.08)', color: '#5C5C4E' }}
            >
              <span>🎲</span>
              Otra tarea
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
