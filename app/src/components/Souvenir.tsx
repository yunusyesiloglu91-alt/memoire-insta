import { AnimatePresence, motion } from 'framer-motion'
import { Shuffle, Check, ArrowUpRight, Sparkles } from 'lucide-react'
import type { Save } from '../lib/types'
import { timeAgo } from '../lib/filters'
import { Thumb } from './Card'

// La carte « Tu te souviens ? » affichée en haut à chaque ouverture.
export function Souvenir({ save, thumb, onOpen, onNext, onSeen }: {
  save: Save | null; thumb?: string | null; onOpen: () => void; onNext: () => void; onSeen: () => void
}) {
  if (!save) return null
  return (
    <section className="relative">
      <div className="mb-3 flex items-center gap-2 text-[13px] text-haze-400">
        <Sparkles className="h-4 w-4 text-pink-400" />
        <span>Tu l'avais enregistré {timeAgo(save.taken_at ?? save.saved_at)}… tu t'en souviens ?</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={save.id}
          initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-ink-900 shadow-glow"
        >
          <div className="absolute inset-0 opacity-40 blur-3xl saturate-150">
            <Thumb save={save} src={thumb} />
          </div>
          <div className="relative grid gap-0 md:grid-cols-[minmax(0,300px)_1fr]">
            <button onClick={onOpen} className="relative aspect-[4/5] overflow-hidden md:aspect-auto md:h-full md:min-h-[360px]">
              <Thumb save={save} src={thumb} className="transition-transform duration-700 hover:scale-[1.03]" />
            </button>
            <div className="flex flex-col justify-between gap-6 bg-gradient-to-br from-ink-900/90 to-ink-900/60 p-6 backdrop-blur-xl md:p-9">
              <div>
                {save.category && <span className="chip pointer-events-none mb-4 !py-1 !text-[12px]">{save.category}</span>}
                <h2 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
                  {save.title ?? save.caption?.slice(0, 80) ?? 'Un trésor oublié'}
                </h2>
                {save.summary && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-haze-200">{save.summary}</p>}
                {save.use_for && (
                  <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-haze-300">
                    <span className="text-aurora font-semibold">Pour toi : </span>{save.use_for}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={onOpen} className="btn-primary">Revoir <ArrowUpRight className="h-4 w-4" /></button>
                <button onClick={onNext} className="btn-ghost"><Shuffle className="h-4 w-4" /> Un autre</button>
                <button onClick={onSeen} className="btn-ghost"><Check className="h-4 w-4" /> Je m'en souviens</button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
