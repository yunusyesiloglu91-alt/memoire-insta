import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardPaste, Loader2, Plus, X } from 'lucide-react'

export function AddSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (text: string) => Promise<boolean> }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { input.current?.focus() }, [])

  async function submit(text = value) {
    if (!text.trim()) return
    setBusy(true)
    const ok = await onAdd(text)
    setBusy(false)
    if (ok) onClose()
  }

  async function fromClipboard() {
    try {
      const t = await navigator.clipboard.readText()
      setValue(t)
      if (/https?:\/\//.test(t)) submit(t)
    } catch { input.current?.focus() }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-start md:pt-[14vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ y: 30, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-xl rounded-t-[28px] border border-white/[0.08] bg-ink-900 p-6 shadow-2xl md:rounded-[28px]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl">Ajouter à ta mémoire</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] hover:bg-white/[0.1]" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-sm text-haze-400">Colle un lien Instagram, TikTok, YouTube, GitHub ou n'importe quel site. Le résumé arrive tout seul.</p>
        <textarea
          ref={input} value={value} onChange={(e) => setValue(e.target.value)} rows={3}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="https://www.instagram.com/reel/…"
          className="mt-5 w-full resize-none rounded-2xl border border-white/[0.08] bg-black/30 p-4 font-mono text-[13px] outline-none placeholder:text-haze-400 focus:border-pink-500/50"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={fromClipboard} className="btn-ghost"><ClipboardPaste className="h-4 w-4" /> Coller</button>
          <button onClick={() => submit()} disabled={busy || !value.trim()} className="btn-primary flex-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Enregistrer
          </button>
        </div>
        <p className="mt-4 text-[12px] text-haze-400">Astuce : n'importe où dans l'appli, fais simplement Ctrl+V avec un lien.</p>
      </motion.div>
    </motion.div>
  )
}
