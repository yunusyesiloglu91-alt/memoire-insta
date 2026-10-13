import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search, Settings2, X, Command } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { api, supabase } from './lib/supabase'
import { useSaves, useToasts } from './lib/store'
import { FILTERS, pickSouvenir, searchText } from './lib/filters'
import type { Save } from './lib/types'
import { Backdrop, Logo } from './components/Backdrop'
import { Login } from './components/Login'
import { Card, CardSkeleton } from './components/Card'
import { Souvenir } from './components/Souvenir'
import { Detail } from './components/Detail'
import { AddSheet } from './components/AddSheet'
import { Settings } from './components/Settings'
import { Relay } from './components/Relay'

// Chemin de la page sans le préfixe d'hébergement (ex. /memoire-insta/relay -> /relay).
const BASE = import.meta.env.BASE_URL
const route = () => '/' + location.pathname.slice(BASE.length).replace(/\/$/, '')

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <>
      <Backdrop />
      {session === undefined ? null : !session ? <Login /> : route() === '/relay' ? <Relay /> : <Home session={session} />}
    </>
  )
}

function Home({ session }: { session: Session }) {
  const { saves, loading, thumbs, patch } = useSaves(true)
  const { toasts, push } = useToasts()
  const [filter, setFilter] = useState('all')
  const [account, setAccount] = useState('')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [settings, setSettings] = useState(false)
  const [souvenirId, setSouvenirId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const accounts = useMemo(() => [...new Set(saves.map((s) => s.account).filter(Boolean))] as string[], [saves])
  const souvenir = saves.find((s) => s.id === souvenirId) ?? null
  const open = saves.find((s) => s.id === openId) ?? null

  useEffect(() => {
    if (!souvenirId && saves.length) setSouvenirId(pickSouvenir(saves)?.id ?? null)
  }, [saves, souvenirId])

  const add = useCallback(async (text: string) => {
    try {
      const r = await api<{ duplicate?: boolean; title?: string }>({ action: 'add', text })
      push(r.duplicate ? `Déjà dans ta mémoire${r.title ? ` : ${r.title}` : ''}` : 'Enregistré ✦ le résumé arrive')
      return true
    } catch (e) { push((e as Error).message, 'err'); return false }
  }, [push])

  // Partage depuis le téléphone (PWA) : /share?url=…&text=…
  useEffect(() => {
    if (route() !== '/share') return
    const p = new URLSearchParams(location.search)
    const text = [p.get('url'), p.get('text'), p.get('title')].filter(Boolean).join(' ')
    history.replaceState(null, '', BASE)
    if (text) add(text)
  }, [add])

  // Coller un lien n'importe où = enregistré. ⌘K / Ctrl+K = recherche.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, [contenteditable]')) return
      const t = e.clipboardData?.getData('text') ?? ''
      if (/https?:\/\//.test(t)) { e.preventDefault(); add(t) }
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('paste', onPaste); window.removeEventListener('keydown', onKey) }
  }, [add])

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return saves.filter((s) => f.test(s) && (!account || s.account === account) && words.every((w) => searchText(s).includes(w)))
  }, [saves, filter, account, query])

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, saves.filter(f.test).length])), [saves])

  function nextSouvenir() { setSouvenirId(pickSouvenir(saves, souvenirId ?? undefined)?.id ?? null) }
  function seenSouvenir(s: Save) {
    patch(s.id, { seen_count: s.seen_count + 1, last_seen: new Date().toISOString() })
    nextSouvenir()
  }

  return (
    <div className="relative z-10">
      <header className="sticky top-0 z-30 border-b border-white/[0.05] bg-ink-950/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8">
          <Logo className="shrink-0" />
          <div className="relative ml-auto flex max-w-md flex-1 items-center md:ml-8">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-haze-400" />
            <input
              ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un outil, un prompt, un repo…"
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] py-2.5 pl-10 pr-16 text-[14px] outline-none placeholder:text-haze-400 focus:border-pink-500/40 focus:bg-white/[0.06]"
            />
            {query ? (
              <button onClick={() => setQuery('')} className="absolute right-3 text-haze-400 hover:text-white" aria-label="Effacer"><X className="h-4 w-4" /></button>
            ) : (
              <kbd className="absolute right-3 hidden items-center gap-0.5 rounded-md border border-white/10 px-1.5 py-0.5 text-[11px] text-haze-400 md:flex"><Command className="h-3 w-3" />K</kbd>
            )}
          </div>
          <button onClick={() => setAdding(true)} className="btn-primary !px-3 md:!px-4" aria-label="Ajouter"><Plus className="h-4 w-4" /><span className="hidden md:inline">Ajouter</span></button>
          <button onClick={() => setSettings(true)} className="btn-ghost !px-3" aria-label="Réglages"><Settings2 className="h-4 w-4" /></button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 md:px-8">
        {!query && filter === 'all' && (
          <div className="mb-12">
            <Souvenir
              save={souvenir} thumb={souvenir?.thumb_path ? thumbs[souvenir.thumb_path] : null}
              onOpen={() => souvenir && setOpenId(souvenir.id)} onNext={nextSouvenir} onSeen={() => souvenir && seenSouvenir(souvenir)}
            />
          </div>
        )}

        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">
              {query ? <>Résultats pour <em className="text-aurora">« {query} »</em></> : <>Ton fil <em className="text-aurora">mémoire</em></>}
            </h1>
            <p className="mt-1 text-sm text-haze-400">{shown.length} enregistrement{shown.length > 1 ? 's' : ''}</p>
          </div>
          {accounts.length > 1 && (
            <select value={account} onChange={(e) => setAccount(e.target.value)} className="chip !bg-ink-850 outline-none">
              <option value="">Tous les comptes</option>
              {accounts.map((a) => <option key={a} value={a}>@{a}</option>)}
            </select>
          )}
        </div>

        <nav className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {FILTERS.filter((f) => f.id === 'all' || counts[f.id] > 0).map((f) => {
            const active = filter === f.id
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} className={`chip relative ${active ? '!text-white !border-transparent' : ''}`}>
                {active && <motion.span layoutId="chip-bg" className="absolute inset-0 -z-10 rounded-full bg-aurora shadow-glow" transition={{ type: 'spring', damping: 26, stiffness: 300 }} />}
                <f.icon className="h-3.5 w-3.5" /> {f.label}
                <span className={`text-[11px] ${active ? 'text-white/80' : 'text-haze-400'}`}>{counts[f.id]}</span>
              </button>
            )
          })}
        </nav>

        {loading ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">{Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)}</div>
        ) : shown.length ? (
          <motion.div layout className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            <AnimatePresence mode="popLayout">
              {shown.map((s, i) => (
                <Card key={s.id} save={s} index={i} thumb={s.thumb_path ? thumbs[s.thumb_path] : null} onOpen={() => setOpenId(s.id)} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <Empty onAdd={() => setAdding(true)} searching={!!query} />
        )}
      </main>

      <button
        onClick={() => setAdding(true)} aria-label="Ajouter"
        className="fixed bottom-6 right-5 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-aurora text-white shadow-glow transition-transform active:scale-95 md:hidden"
      ><Plus className="h-6 w-6" /></button>

      <AnimatePresence>
        {open && <Detail key={open.id} save={open} thumb={open.thumb_path ? thumbs[open.thumb_path] : null} onClose={() => setOpenId(null)} patch={patch} toast={push} />}
        {adding && <AddSheet key="add" onClose={() => setAdding(false)} onAdd={add} />}
        {settings && <Settings key="settings" onClose={() => setSettings(false)} email={session.user.email} />}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 md:bottom-8">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className={`glass rounded-full px-5 py-2.5 text-sm shadow-glow ${t.tone === 'err' ? '!border-rose-500/30 text-rose-200' : 'text-white'}`}
            >{t.text}</motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Empty({ onAdd, searching }: { onAdd: () => void; searching: boolean }) {
  return (
    <div className="glass mx-auto max-w-md rounded-3xl p-10 text-center">
      <p className="font-display text-3xl">{searching ? 'Rien trouvé' : 'Ta mémoire est vide'}</p>
      <p className="mt-2 text-sm text-haze-400">{searching ? 'Essaie un autre mot-clé.' : 'Ajoute un lien ou synchronise Instagram depuis les réglages.'}</p>
      {!searching && <button onClick={onAdd} className="btn-primary mt-6"><Plus className="h-4 w-4" /> Ajouter un lien</button>}
    </div>
  )
}
