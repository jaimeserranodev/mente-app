import { useState, useEffect } from 'react'
import { ProjectTask, supabase } from '../lib/supabase'

export function useProjectTasks(projectId: string) {
  const [tasks, setTasks] = useState<ProjectTask[]>([])

  useEffect(() => {
    supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('[useProjectTasks] fetch:', error.message)
        else setTasks(data ?? [])
      })
  }, [projectId])

  async function addTask(title: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { console.error('[useProjectTasks] sin sesión'); return }

    const nextPosition = tasks.length > 0
      ? Math.max(...tasks.map((t) => t.position)) + 1
      : 0

    const { data, error } = await supabase
      .from('project_tasks')
      .insert({ project_id: projectId, user_id: session.user.id, title, done: false, position: nextPosition })
      .select()
      .single()

    if (error) console.error('[useProjectTasks] addTask:', error.message)
    else if (data) setTasks((prev) => [...prev, data])
  }

  async function toggleTask(id: string, done: boolean) {
    const { error } = await supabase.from('project_tasks').update({ done }).eq('id', id)
    if (error) console.error('[useProjectTasks] toggleTask:', error.message)
    else setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)))
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('project_tasks').delete().eq('id', id)
    if (error) console.error('[useProjectTasks] deleteTask:', error.message)
    else setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function reorderTasks(orderedIds: string[]) {
    const map = new Map(tasks.map((t) => [t.id, t]))
    const reordered = orderedIds.map((id, i) => ({ ...map.get(id)!, position: i }))
    setTasks(reordered)
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from('project_tasks').update({ position: i }).eq('id', id)
      )
    )
  }

  return { tasks, addTask, toggleTask, deleteTask, reorderTasks }
}
