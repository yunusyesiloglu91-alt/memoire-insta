// Halo lumineux animé derrière toute l'appli.
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-fuchsia-600/20 blur-[120px] animate-drift" />
      <div className="absolute top-1/3 -right-40 h-[560px] w-[560px] rounded-full bg-orange-500/10 blur-[140px] animate-drift [animation-delay:-6s]" />
      <div className="absolute -bottom-52 left-1/4 h-[480px] w-[480px] rounded-full bg-violet-700/20 blur-[130px] animate-drift [animation-delay:-11s]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,#060609_70%)]" />
    </div>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-aurora shadow-glow">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
          <path d="M12 7.5l1.1 2.3 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <span className="font-display text-[26px] leading-none tracking-tight">Mémoire</span>
    </div>
  )
}
