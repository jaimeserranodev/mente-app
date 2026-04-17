import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ── Types ──────────────────────────────────────────────────────────

export type ItemType = 'idea' | 'tarea' | 'proyecto' | 'nota'

export type Area =
  | 'Todas'
  | 'Mindset'
  | 'Finanzas'
  | 'Bienestar'
  | 'Pasiones'
  | 'Relaciones'

export type ItemStatus =
  | 'pendiente'
  | 'en_progreso'
  | 'hecha'
  | 'activo'
  | 'pausado'
  | 'completado'

export interface Item {
  id: string
  user_id: string
  type: ItemType
  title: string
  description: string | null
  area: string
  status: ItemStatus | null
  created_at: string
  updated_at: string
}

export type NewItem = Omit<Item, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export interface ProjectTask {
  id: string
  project_id: string
  user_id: string
  title: string
  done: boolean
  position: number
  created_at: string
}
