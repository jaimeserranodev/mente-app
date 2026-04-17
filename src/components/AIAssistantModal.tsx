import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onProjectCreated: () => void
}

interface GeneratedProject {
  title: string
  description: string
  tasks: string[]
}

const API_KEY = import.meta.env.VITE_OPENAI_KEY as string

export default function AIAssistantModal({ onClose, onProjectCreated }: Props) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<GeneratedProject | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleGenerate() {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setPreview(null)

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'Eres un experto en gestión de proyectos. El usuario te describirá un proyecto. Responde ÚNICAMENTE con JSON válido (sin markdown, sin backticks) en este formato exacto: {"title":"...","description":"...","tasks":["tarea1","tarea2",...]}. Genera entre 6 y 10 tareas específicas y accionables en español.',
            },
            { role: 'user', content: description.trim() },
          ],
          temperature: 0.7,
          max_tokens: 1200,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message ?? `Error de API (${res.status})`)
      }

      const data = await res.json()
      const content: string = data.choices?.[0]?.message?.content ?? ''
      const parsed: GeneratedProject = JSON.parse(content)

      if (!parsed.title || !Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
        throw new Error('Respuesta inesperada de ChatGPT')
      }

      setPreview(parsed)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!preview) return
    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const { data: project } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        type: 'proyecto',
        title: preview.title,
        description: preview.description,
        area: 'Todas',
        status: 'activo',
      })
      .select()
      .single()

    if (project) {
      await supabase.from('project_tasks').insert(
        preview.tasks.map((title) => ({
          project_id: project.id,
          user_id: user.id,
          title,
          done: false,
        }))
      )
    }

    setSaving(false)
    onProjectCreated()
    onClose()
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#8C8C7A',
    marginBottom: 6,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  }

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
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="font-semibold text-base" style={{ color: '#1A1A1A' }}>
              Crear proyecto con IA
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
        <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Describe tu proyecto</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Quiero crear una tienda online de ropa sostenible. Necesito vender en Instagram y tener web propia..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(44,44,44,0.15)',
                backgroundColor: '#F6F3EC',
                color: '#2C2C2C',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#C0392B' }}>
              {error}
            </p>
          )}

          {preview && (
            <div
              className="flex flex-col gap-3 rounded-xl p-4"
              style={{ backgroundColor: '#F6F3EC', border: '1.5px solid rgba(44,44,44,0.1)' }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7FD4' }}>
                  Proyecto generado
                </p>
                <p className="font-semibold text-base" style={{ color: '#1A1A1A' }}>
                  {preview.title}
                </p>
                {preview.description && (
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: '#5C5C4E' }}>
                    {preview.description}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8C8C7A' }}>
                  {preview.tasks.length} tareas
                </p>
                <div className="flex flex-col gap-1">
                  {preview.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span
                        className="w-4 h-4 rounded border flex-shrink-0 mt-0.5"
                        style={{ borderColor: 'rgba(44,44,44,0.2)' }}
                      />
                      <span className="text-sm" style={{ color: '#2C2C2C' }}>
                        {task}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-5 pt-4 flex-shrink-0"
          style={{
            borderTop: '1px solid rgba(44,44,44,0.08)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          {preview ? (
            <>
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                style={{ backgroundColor: 'rgba(44,44,44,0.08)', color: '#5C5C4E' }}
              >
                Regenerar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  backgroundColor: saving ? 'rgba(44,44,44,0.2)' : '#1A1A1A',
                  color: saving ? '#8C8C7A' : '#FFFFFF',
                }}
              >
                {saving ? 'Creando…' : 'Crear proyecto'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                style={{ backgroundColor: 'rgba(44,44,44,0.08)', color: '#5C5C4E' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !description.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  backgroundColor: !loading && description.trim() ? '#1A1A1A' : 'rgba(44,44,44,0.2)',
                  color: !loading && description.trim() ? '#FFFFFF' : '#8C8C7A',
                }}
              >
                {loading ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
                      style={{ borderColor: '#8C8C7A', borderTopColor: 'transparent' }}
                    />
                    Generando…
                  </>
                ) : (
                  <>✨ Generar</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
