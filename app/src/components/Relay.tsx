import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { api, supabase } from '../lib/supabase'
import { Logo } from './Backdrop'

type Incoming = { item: Record<string, unknown>; thumb: Blob | null; video: Blob | null }
type ImportResult = { results: { id?: string; created?: boolean; error?: string; uploads: Record<string, { path: string; token: string }> }[] }

const INSTAGRAM = 'https://www.instagram.com'

// Onglet relais ouvert par la synchro depuis instagram.com : il reçoit les enregistrements
// et les range dans ta base avec ta session (aucun secret ne transite par Instagram).
export function Relay() {
  const [log, setLog] = useState<string[]>([])
  const [stats, setStats] = useState({ received: 0, created: 0, media: 0 })
  const [done, setDone] = useState(false)
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    const say = (t: string) => setLog((l) => [t, ...l].slice(0, 40))

    async function handle({ item, thumb, video }: Incoming) {
      const { results } = await api<ImportResult>({
        action: 'import', items: [{ ...item, want_thumb: !!thumb, want_video: !!video }],
      })
      const r = results[0]
      if (!r?.id) { say(`⚠ ${r?.error ?? 'erreur'}`); return }
      let uploaded = 0
      const sent: Record<string, boolean> = {}
      for (const [kind, blob] of [['thumb', thumb], ['video', video]] as const) {
        const u = r.uploads[kind]
        if (!u || !blob) continue
        const { error } = await supabase.storage.from('media').uploadToSignedUrl(u.path, u.token, blob, {
          contentType: kind === 'thumb' ? 'image/jpeg' : 'video/mp4',
        })
        if (!error) { sent[kind] = true; uploaded++ }
      }
      if (uploaded) await api({ action: 'uploaded', id: r.id, ...sent })
      setStats((s) => ({ received: s.received + 1, created: s.created + (r.created ? 1 : 0), media: s.media + uploaded }))
      say(`${r.created ? '＋' : '↻'} @${item.author ?? '?'} — ${String(item.caption ?? '').slice(0, 60)}`)
    }

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== INSTAGRAM) return
      if (e.data?.type === 'memoire-item') {
        queue.current = queue.current.then(() => handle(e.data as Incoming)).catch((err) => say(`⚠ ${(err as Error).message}`))
      } else if (e.data?.type === 'memoire-done') {
        queue.current.then(() => setDone(true))
      }
    }
    window.addEventListener('message', onMessage)
    window.opener?.postMessage({ type: 'memoire-ready' }, INSTAGRAM)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className="relative z-10 mx-auto max-w-lg px-5 py-12">
      <Logo />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass mt-8 rounded-3xl p-6">
        <div className="flex items-center gap-3">
          {done ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : <Loader2 className="h-6 w-6 animate-spin text-pink-400" />}
          <h1 className="text-lg font-semibold">{done ? 'Synchronisation terminée' : 'Synchronisation en cours…'}</h1>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[['reçus', stats.received], ['nouveaux', stats.created], ['médias', stats.media]].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white/[0.04] py-3">
              <div className="font-display text-3xl">{v}</div>
              <div className="text-[12px] text-haze-400">{l}</div>
            </div>
          ))}
        </div>
        <ul className="mt-5 max-h-72 space-y-1.5 overflow-y-auto text-[13px] text-haze-300">
          {log.map((l, i) => <li key={i} className="truncate">{l}</li>)}
        </ul>
        {done && <a href={import.meta.env.BASE_URL} className="btn-primary mt-6 w-full">Voir ma mémoire</a>}
        {!done && <p className="mt-5 text-[12px] text-haze-400">Garde l'onglet Instagram ouvert jusqu'à la fin.</p>}
      </motion.div>
    </div>
  )
}
