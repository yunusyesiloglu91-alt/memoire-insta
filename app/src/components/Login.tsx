import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Lock, MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Logo } from './Backdrop'

export function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) {
      setError(/fermée|closed|Database error/i.test(error.message) ? "Cet espace est privé : cet email n'est pas autorisé." : error.message)
      setState('error')
    } else setState('sent')
  }

  return (
    <div className="relative z-10 grid min-h-dvh place-items-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <Logo className="mb-10 justify-center" />
        <h1 className="text-center font-display text-5xl leading-[1.05] tracking-tight">
          Tout ce que tu as <em className="text-aurora pr-1">enregistré</em>,<br />enfin retrouvé.
        </h1>
        <p className="mt-4 text-center text-haze-400">Ton espace privé. Toi seul peux y entrer.</p>

        {state === 'sent' ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass mt-10 rounded-2xl p-6 text-center">
            <MailCheck className="mx-auto h-8 w-8 text-pink-400" />
            <p className="mt-3 font-medium">Lien envoyé à {email}</p>
            <p className="mt-1 text-sm text-haze-400">Ouvre-le sur cet appareil pour entrer.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-3">
            <input
              type="email" required autoComplete="email" placeholder="ton@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass w-full rounded-xl px-4 py-3.5 text-[15px] outline-none placeholder:text-haze-400 focus:border-pink-500/50"
            />
            <button className="btn-primary w-full py-3.5" disabled={state === 'sending'}>
              {state === 'sending' ? 'Envoi…' : 'Recevoir mon lien de connexion'} <ArrowRight className="h-4 w-4" />
            </button>
            {state === 'error' && <p className="text-center text-sm text-rose-400">{error}</p>}
          </form>
        )}
        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-haze-400">
          <Lock className="h-3 w-3" /> Aucun mot de passe. Aucune connexion à Instagram.
        </p>
      </motion.div>
    </div>
  )
}
