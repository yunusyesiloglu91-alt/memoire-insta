import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Smartphone, RefreshCw, LogOut, Copy, Check, Camera, Apple, Bookmark } from 'lucide-react'
import { supabase, API_URL } from '../lib/supabase'
import { bookmarklet } from '../lib/syncScript'

export function Settings({ onClose, email }: { onClose: () => void; email?: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    supabase.from('ingest_tokens').select('token').maybeSingle().then(({ data }) => setToken(data?.token ?? null))
  }, [])

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(''), 1500)
  }
  async function rotate() {
    const { data } = await supabase.rpc('rotate_ingest_token')
    if (data) setToken(data as string)
  }

  const shortcutUrl = token ? `${API_URL}?token=${token}&url=` : ''

  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.aside
        initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/[0.08] bg-ink-900 p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl">Réglages</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06]" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-sm text-haze-400">Connecté en tant que {email}</p>

        <Section icon={Camera} title="Synchroniser Instagram">
          <p>Glisse ce bouton dans ta barre de favoris. Ensuite, sur instagram.com (sur l'ordi), clique dessus : tes derniers enregistrements arrivent ici avec leur résumé. Tu peux le faire pour tes deux comptes.</p>
          <a
            href={bookmarklet(window.location.origin + import.meta.env.BASE_URL)} onClick={(e) => e.preventDefault()} draggable
            className="btn-primary mt-3 w-full cursor-grab"
          ><Bookmark className="h-4 w-4" /> Synchroniser Mémoire</a>
          <p className="mt-2 text-[12px]">Il utilise la même lecture que la page « Enregistrements » quand tu défiles, à un rythme humain. Aucun mot de passe, aucune action sur ton compte.</p>
        </Section>

        <Section icon={Smartphone} title="Android : partager vers Mémoire">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Ouvre ce site dans Chrome sur ton téléphone et connecte-toi.</li>
            <li>Menu ⋮ → « Installer l'application ».</li>
            <li>Dans Instagram : Partager → Mémoire. C'est enregistré.</li>
          </ol>
        </Section>

        <Section icon={Apple} title="iPhone : raccourci « Mémoire »">
          <ol className="list-decimal space-y-1 pl-5">
            <li>App Raccourcis → nouveau raccourci, active « Afficher dans la feuille de partage » (type : URL et texte).</li>
            <li>Action « Obtenir le contenu de l'URL » avec l'adresse ci-dessous suivie de l'entrée du raccourci.</li>
            <li>Dans Instagram : Partager → Mémoire.</li>
          </ol>
          {token ? (
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-black/30 p-3">
              <code className="block break-all text-[11px] text-haze-300">{shortcutUrl}</code>
              <div className="mt-2 flex gap-2">
                <button onClick={() => copy(shortcutUrl, 'url')} className="btn-ghost !px-3 !py-1.5 !text-[12px]">
                  {copied === 'url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copier
                </button>
                <button onClick={rotate} className="btn-ghost !px-3 !py-1.5 !text-[12px]"><RefreshCw className="h-3.5 w-3.5" /> Nouveau jeton</button>
              </div>
              <p className="mt-2 text-[11px] text-haze-400">Ce lien contient ton jeton personnel : ne le partage pas. « Nouveau jeton » désactive l'ancien.</p>
            </div>
          ) : (
            <button onClick={rotate} className="btn-ghost mt-3">Créer mon jeton</button>
          )}
        </Section>

        <button onClick={() => supabase.auth.signOut()} className="btn-ghost mt-10 w-full !text-rose-300"><LogOut className="h-4 w-4" /> Se déconnecter</button>
      </motion.aside>
    </motion.div>
  )
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="mb-2 flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-pink-400" /> {title}</h3>
      <div className="text-[13.5px] leading-relaxed text-haze-300">{children}</div>
    </section>
  )
}
