import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Item, NewItem } from '../lib/supabase'

export function useItems(user: User | null) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    fetchItems()
  }, [user])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setItems(data ?? [])
    setLoading(false)
  }

  async function createItem(newItem: NewItem): Promise<Item | null> {
    const { data, error } = await supabase
      .from('items')
      .insert([{ ...newItem, user_id: user!.id }])
      .select()
      .single()

    if (error) {
      console.error('Error creando item:', error)
      return null
    }

    setItems((prev) => [data, ...prev])
    return data
  }

  async function updateItem(id: string, updates: Partial<Item>): Promise<Item | null> {
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error actualizando item:', error)
      return null
    }

    setItems((prev) => prev.map((item) => (item.id === id ? data : item)))
    return data
  }

  async function deleteItem(id: string): Promise<boolean> {
    const { error } = await supabase.from('items').delete().eq('id', id)

    if (error) {
      console.error('Error borrando item:', error)
      return false
    }

    setItems((prev) => prev.filter((item) => item.id !== id))
    return true
  }

  return { items, loading, createItem, updateItem, deleteItem }
}
