import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  X, Star, ExternalLink, Download, Copy, Check, RefreshCw, Trash2, Lightbulb, ListChecks, Link as LinkIcon, MessageSquareQuote, StickyNote, Loader2,
} from 'lucide-react'
import type { Save } from '../lib/types'
import { api, mediaUrl } from '../lib/supabase'
import { fmtDuration, timeAgo } from '../lib/filters'
import { Thumb } from './Card'

export function Detail({ save, thumb, onClose, patch, toast }: {
  save: Save; thumb?: string | null; onClose: () => void
  patch: (id: string, v: Partial<Save>) => Promise<void>; toast: (t: string, tone?: 'ok' | 'err') => void
}) {
  const [video, setVideo] = useState<string | null>(null)
  const [note, setNote] = useState(save.note)
  const [copied, setCopied] = useState<number | null>(null)
  const [busy, setBusy] = useState<'dl' | 'enrich' | null>(null)
  const noteTimer = useRef<number>(0)

  useEffect(() => { mediaUrl(save.video_path).then(setVideo) }, [save.video_path])
  useEffect(() => {
    // Compte la consultation pour que le souvenir ne revienne pas trop vite.
    patch(save.id, { seen_count: save.seen_count + 1, last_seen: new Date().toISOString() })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.id])

  function onNote(v: string) {
    setNote(v)
    clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => patch(save.id, { note: v }), 600)
  }

  async function copy(text: string, i: number) {
    await navigator.clipboard.writeText(text)
    setCopied(i); setTimeout(() => setCopied(null), 1400)
  }

  async function download() {
    if (!video) return
    setBusy('dl')
    try {
      const blob = await (await fetch(video)).blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(save.title ?? save.shortcode ?? 'video').replace(/[^\w\- ]+/g, '').trim() || 'video'}.mp4`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    } catch { toast('Téléchargement impossible', 'err') }
    setBusy(null)
  }

  async function regenerate() {
    setBusy('enrich')
    try { await api({ action: 'enrich', id: save.id }); toast('Nouveau résumé en préparation…') }
    catch (e) { toast((e as Error).message, 'err') }
    setBusy(null)
  }

  const embed = save.source === 'instagram' && save.shortcode
    ? `https://www.instagram.com/${save.url.includes('/reel/') ? 'reel' : 'p'}/${save.shortcode}/embed/` : null

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.article
        layoutId={`card-${save.id}`}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative z-10 flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] border border-white/[0.08] bg-ink-900 shadow-2xl md:flex-row md:rounded-[28px]"
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>

        <div className="relative shrink-0 bg-black md:w-[400px]">
          {video ? (
            <video src={video} poster={thumb ?? undefined} controls autoPlay playsInline loop className="max-h-[52dvh] w-full object-contain md:h-full md:max-h-none" />
          ) : embed ? (
            <iframe src={embed} title="Publication Instagram" className="h-[52dvh] w-full bg-white md:h-full" loading="lazy" allow="autoplay; encrypted-media" />
          ) : (
            <div className="aspect-video md:h-full"><Thumb save={save} src={thumb} /></div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 pr-10 text-[12px] text-haze-400">
            {save.category && <span className="chip pointer-events-none !py-0.5 !text-[11px]">{save.category}</span>}
            <span>@{save.author}</span><span>·</span><span>{timeAgo(save.taken_at ?? save.saved_at)}</span>
            {save.duration ? <><span>·</span><span>{fmtDuration(save.duration)}</span></> : null}
            {save.account && <><span>·</span><span>via {save.account}</span></>}
          </div>
          <h2 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight">{save.title ?? 'Sans titre'}</h2>

          {save.status === 'pending' && !save.summary && (
            <p className="mt-4 flex items-center gap-2 text-sm text-haze-400"><Loader2 className="h-4 w-4 animate-spin" /> Le résumé IA arrive…</p>
          )}
          {save.summary && <p className="mt-4 text-[15px] leading-relaxed text-haze-200">{save.summary}</p>}

          {save.use_for && (
            <Block icon={Lightbulb} title="À quoi ça te sert">
              <p className="text-[14px] leading-relaxed text-haze-200">{save.use_for}</p>
            </Block>
          )}

          {save.how_to.length > 0 && (
            <Block icon={ListChecks} title="Comment l'utiliser">
              <ol className="space-y-2">
                {save.how_to.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-haze-200">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[12px] font-semibold text-pink-300">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </Block>
          )}

          {save.links.length > 0 && (
            <Block icon={LinkIcon} title="Liens">
              <div className="flex flex-wrap gap-2">
                {save.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="chip !text-[13px] hover:!border-pink-500/40">
                    {l.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </Block>
          )}

          {save.prompts.length > 0 && (
            <Block icon={MessageSquareQuote} title="Prompts">
              <div className="space-y-2">
                {save.prompts.map((p, i) => (
                  <div key={i} className="group relative rounded-xl border border-white/[0.06] bg-black/30 p-3 pr-11 font-mono text-[12.5px] leading-relaxed text-haze-200">
                    {p}
                    <button onClick={() => copy(p, i)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12]" aria-label="Copier">
                      {copied === i ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {save.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {save.tags.map((t) => <span key={t} className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[12px] text-haze-300">#{t}</span>)}
            </div>
          )}

          <Block icon={StickyNote} title="Ta note">
            <textarea
              value={note} onChange={(e) => onNote(e.target.value)} placeholder="Pourquoi tu l'as gardé, ce que tu veux en faire…"
              className="min-h-[80px] w-full resize-y rounded-xl border border-white/[0.07] bg-black/30 p-3 text-[14px] outline-none placeholder:text-haze-400 focus:border-pink-500/40"
            />
          </Block>

          {save.caption && (
            <details className="mt-6 text-[13px] text-haze-400">
              <summary className="cursor-pointer select-none hover:text-haze-200">Légende originale</summary>
              <p className="mt-2 whitespace-pre-line leading-relaxed">{save.caption}</p>
            </details>
          )}

          <div className="sticky bottom-0 -mx-6 mt-8 flex flex-wrap gap-2 border-t border-white/[0.06] bg-ink-900/95 px-6 py-4 backdrop-blur-xl md:-mx-8 md:px-8">
            <button onClick={() => patch(save.id, { favorite: !save.favorite })} className="btn-ghost">
              <Star className={`h-4 w-4 ${save.favorite ? 'fill-amber-300 text-amber-300' : ''}`} /> {save.favorite ? 'Favori' : 'Mettre en favori'}
            </button>
            {video && (
              <button onClick={download} className="btn-ghost" disabled={busy === 'dl'}>
                {busy === 'dl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Télécharger
              </button>
            )}
            <a href={save.url} target="_blank" rel="noopener noreferrer" className="btn-ghost"><ExternalLink className="h-4 w-4" /> Ouvrir</a>
            <button onClick={regenerate} className="btn-ghost" disabled={busy === 'enrich'}>
              <RefreshCw className={`h-4 w-4 ${busy === 'enrich' ? 'animate-spin' : ''}`} /> Résumer à nouveau
            </button>
            <button
              onClick={() => { patch(save.id, { archived: true }); onClose(); toast('Retiré de ta mémoire') }}
              className="btn-ghost ml-auto !text-rose-300 hover:!bg-rose-500/10" aria-label="Retirer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.article>
    </motion.div>
  )
}

function Block({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h4 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-haze-400">
        <Icon className="h-3.5 w-3.5 text-pink-400" /> {title}
      </h4>
      {children}
    </section>
  )
}
