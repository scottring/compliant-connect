import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function AuthCleaner() {
  useEffect(() => {
    const clearAuth = async () => {
      // Clear all localStorage items that start with 'sb-'
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })
      
      // Force sign out
      await supabase.auth.signOut()
      
      // Clear IndexedDB
      const databases = await window.indexedDB.databases()
      databases.forEach(db => {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name)
        }
      })

      // Force reload to ensure clean state
      window.location.reload()
    }

    clearAuth()
  }, [])

  return null
} 