import { useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Props {
  user: User
  onClose: () => void
  onUpdated: () => void
}

export default function ProfileModal({ user, onClose, onUpdated }: Props) {
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''

  const [name, setName] = useState(fullName)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    let newAvatarUrl = avatarUrl

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        setError('Error al subir imagen: ' + uploadError.message)
        setSaving(false)
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      newAvatarUrl = data.publicUrl + '?t=' + Date.now()
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: name.trim(), avatar_url: newAvatarUrl },
    })

    if (updateError) {
      setError('Error al guardar: ' + updateError.message)
    } else {
      onUpdated()
      onClose()
    }

    setSaving(false)
  }

  const currentAvatar = preview ?? avatarUrl
  const initials = (name || user.email || '?')[0].toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl shadow-2xl flex flex-col"
        style={{ backgroundColor: '#ECEADE', width: 400, overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(44,44,44,0.08)' }}
        >
          <h2 className="font-semibold text-base" style={{ color: '#1A1A1A' }}>
            Editar perfil
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10"
            style={{ color: '#8C8C7A' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium"
                  style={{ backgroundColor: '#1A1A1A', color: '#ECEADE' }}
                >
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
                title="Cambiar foto"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: '#8C8C7A' }}
            >
              Cambiar foto de perfil
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nombre */}
          <div>
            <label
              style={{
                fontSize: 11, fontWeight: 600, color: '#8C8C7A',
                display: 'block', marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}
            >
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(44,44,44,0.1)', backgroundColor: '#F6F3EC',
                color: '#2C2C2C', fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Email (solo lectura) */}
          <div>
            <label
              style={{
                fontSize: 11, fontWeight: 600, color: '#8C8C7A',
                display: 'block', marginBottom: 8,
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}
            >
              Email
            </label>
            <p className="text-sm" style={{ color: '#5C5C4E' }}>{user.email}</p>
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: '#C0392B' }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-6 py-4"
          style={{ borderTop: '1px solid rgba(44,44,44,0.08)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-70"
            style={{ backgroundColor: 'rgba(44,44,44,0.08)', color: '#5C5C4E' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: saving ? 'rgba(44,44,44,0.2)' : '#1A1A1A',
              color: saving ? '#8C8C7A' : '#FFFFFF',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
