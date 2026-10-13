import { useCallback, useEffect, useState } from 'react'
import { supabase, mediaUrls } from './supabase'
import type { Save } from './types'

export function useSaves(enabled: boolean) {
  const [saves, setSaves] = useState<Save[]>([])
  const [loading, setLoading] = useState(true)
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from('saves').select('*').eq('archived', false)
      // Les ajouts récents (sans rang) d'abord, puis l'ordre d'enregistrement d'Instagram.
      .order('save_rank', { ascending: true, nullsFirst: true }).order('saved_at', { ascending: false })
    setSaves((data as Save[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!enabled) return
    load()
    // Mise à jour en direct quand un résumé arrive ou qu'un lien est ajouté depuis le téléphone.
    const ch = supabase.channel('saves')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saves' }, (p) => {
        setSaves((cur) => {
          if (p.eventType === 'DELETE') return cur.filter((s) => s.id !== (p.old as Save).id)
          const row = p.new as Save
          if (row.archived) return cur.filter((s) => s.id !== row.id)
          const i = cur.findIndex((s) => s.id === row.id)
          if (i === -1) return [row, ...cur]
          const next = cur.slice(); next[i] = row; return next
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [enabled, load])

  useEffect(() => {
    const paths = saves.map((s) => s.thumb_path).filter((p): p is string => !!p && !(p in thumbs))
    if (!paths.length) return
    mediaUrls(paths).then((m) => setThumbs((t) => ({ ...t, ...m })))
  }, [saves, thumbs])

  const patch = useCallback(async (id: string, values: Partial<Save>) => {
    setSaves((cur) => cur.map((s) => (s.id === id ? { ...s, ...values } : s)))
    await supabase.from('saves').update(values).eq('id', id)
  }, [])

  return { saves, loading, thumbs, patch, reload: load }
}

export function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; text: string; tone?: 'ok' | 'err' }[]>([])
  const push = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return { toasts, push }
}
