import { motion } from 'framer-motion'
import { Play, Images, Link2, Star, Loader2, FolderGit2 } from 'lucide-react'
import type { Save } from '../lib/types'
import { CATEGORY_HUE, fmtDuration, timeAgo } from '../lib/filters'

export function Thumb({ save, src, className = '' }: { save: Save; src?: string | null; className?: string }) {
  const hue = CATEGORY_HUE[save.category ?? ''] ?? 'from-violet-500/25 to-pink-500/10'
  if (src) return <img src={src} alt="" loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${hue} ${className}`}>
      <span className="px-6 text-center font-display text-2xl italic text-white/80 line-clamp-3">
        {save.title ?? save.author ?? new URL(save.url).hostname}
      </span>
    </div>
  )
}

export function Card({ save, thumb, onOpen, index }: { save: Save; thumb?: string | null; onOpen: () => void; index: number }) {
  const tall = save.media_type === 'video'
  const repo = save.links.find((l) => l.url.includes('github.com'))
  return (
    <motion.button
      layout
      layoutId={`card-${save.id}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.45, delay: Math.min(index, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      onClick={onOpen}
      className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850 text-left shadow-card transition-shadow hover:shadow-glow"
    >
      <div className={`relative overflow-hidden ${tall ? 'aspect-[4/5]' : 'aspect-square'}`}>
        <Thumb save={save} src={thumb} className="transition-transform duration-700 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {save.category && (
            <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">{save.category}</span>
          )}
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {save.favorite && <Star className="h-4 w-4 fill-amber-300 text-amber-300 drop-shadow" />}
          <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] text-white/90 backdrop-blur-md">
            {save.media_type === 'video' ? <><Play className="h-3 w-3 fill-current" />{fmtDuration(save.duration)}</>
              : save.media_type === 'carousel' ? <Images className="h-3 w-3" /> : save.media_type === 'link' ? <Link2 className="h-3 w-3" /> : null}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-[15px] font-semibold leading-snug text-white line-clamp-2">
            {save.title ?? (save.caption?.split('\n')[0] || 'Sans titre')}
          </h3>
        </div>
      </div>
      <div className="space-y-2.5 p-4 pt-3">
        {save.status === 'pending' && !save.summary ? (
          <p className="flex items-center gap-2 text-[13px] text-haze-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Résumé en préparation…</p>
        ) : (
          <p className="text-[13px] leading-relaxed text-haze-300 line-clamp-3">{save.summary ?? save.caption}</p>
        )}
        <div className="flex items-center justify-between text-[12px] text-haze-400">
          <span className="truncate">@{save.author ?? '—'}</span>
          <span className="flex shrink-0 items-center gap-2">
            {repo && <FolderGit2 className="h-3.5 w-3.5" />}
            {timeAgo(save.taken_at ?? save.saved_at)}
          </span>
        </div>
      </div>
    </motion.button>
  )
}

export function CardSkeleton() {
  return (
    <div className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-white/[0.05] bg-ink-850">
      <div className="skeleton aspect-[4/5]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-3 w-4/5 rounded" />
        <div className="skeleton h-3 w-3/5 rounded" />
      </div>
    </div>
  )
}
