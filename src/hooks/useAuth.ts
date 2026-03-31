import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // Detectar errores OAuth en la URL
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get('error_description') ?? params.get('error')
    if (urlError) {
      setAuthError(decodeURIComponent(urlError.replace(/\+/g, ' ')))
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // En Supabase v2 moderno, onAuthStateChange dispara INITIAL_SESSION
    // inmediatamente con la sesión actual — no hace falta getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    setAuthError(null)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/mente-app/auth/callback',
        skipBrowserRedirect: true,
      },
    })
    if (error) {
      setAuthError(error.message)
      return
    }
    if (data?.url) {
      console.log('[Auth] URL generada por Supabase:', data.url)
      window.location.href = data.url
    } else {
      setAuthError(`Sin URL de redirección. Respuesta: ${JSON.stringify(data)}`)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, loading, authError, signInWithGoogle, signOut }
}
