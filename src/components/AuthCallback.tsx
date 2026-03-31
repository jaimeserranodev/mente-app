import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const exchanged = useRef(false)

  useEffect(() => {
    // StrictMode monta el efecto dos veces en desarrollo.
    // El código PKCE solo es válido una vez, así que bloqueamos el segundo intento.
    if (exchanged.current) return
    exchanged.current = true

    // Flujo implicit: tokens en el hash (#access_token=...)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')

    // Flujo PKCE: código en query params (?code=...)
    const query = new URLSearchParams(window.location.search)
    const code = query.get('code')
    const error = query.get('error')

    if (error) {
      navigate('/?error=' + encodeURIComponent(query.get('error_description') ?? error), { replace: true })
      return
    }

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            navigate('/?error=' + encodeURIComponent(error.message), { replace: true })
          } else {
            navigate('/', { replace: true })
          }
        })
    } else if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            navigate('/?error=' + encodeURIComponent(error.message), { replace: true })
          } else {
            navigate('/', { replace: true })
          }
        })
    } else {
      navigate('/', { replace: true })
    }
  }, [navigate])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#ECEADE' }}
    >
      <p
        className="font-serif text-2xl font-bold animate-pulse"
        style={{ color: '#8C8C7A' }}
      >
        Mente
      </p>
    </div>
  )
}
