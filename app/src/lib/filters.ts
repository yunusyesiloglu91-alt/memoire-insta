import {
  Sparkles, Clapperboard, Image as ImageIcon, Code2, MessageSquareQuote, Wrench, Box, Palette, Briefcase, Star, Bot, GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import type { Save } from './types'

export type Filter = { id: string; label: string; icon: LucideIcon; test: (s: Save) => boolean }

const cat = (...names: string[]) => (s: Save) => !!s.category && names.includes(s.category)

export const FILTERS: Filter[] = [
  { id: 'all', label: 'Tout', icon: Sparkles, test: () => true },
  { id: 'video', label: 'Vidéos', icon: Clapperboard, test: (s) => s.media_type === 'video' },
  { id: 'image', label: 'Images', icon: ImageIcon, test: (s) => s.media_type === 'image' || s.media_type === 'carousel' },
  { id: 'code', label: 'Code & GitHub', icon: Code2, test: (s) => cat('Repo GitHub', 'Code & Dev')(s) || s.links.some((l) => l.url.includes('github.com')) },
  { id: 'prompts', label: 'Prompts', icon: MessageSquareQuote, test: (s) => cat('Prompts')(s) || s.prompts.length > 0 },
  { id: 'tools', label: 'Outils IA', icon: Wrench, test: cat('Outil IA', 'Vidéo IA', 'Image IA') },
  { id: 'agents', label: 'Agents', icon: Bot, test: cat('Agent & Automatisation') },
  { id: '3d', label: '3D', icon: Box, test: cat('3D') },
  { id: 'design', label: 'Design', icon: Palette, test: cat('Design & UI') },
  { id: 'business', label: 'Business', icon: Briefcase, test: cat('Business') },
  { id: 'learn', label: 'Apprendre', icon: GraduationCap, test: cat('Apprendre') },
  { id: 'fav', label: 'Favoris', icon: Star, test: (s) => s.favorite },
]

export const CATEGORY_HUE: Record<string, string> = {
  'Outil IA': 'from-fuchsia-500/30 to-violet-500/10',
  'Repo GitHub': 'from-emerald-500/30 to-teal-500/10',
  Prompts: 'from-amber-500/30 to-orange-500/10',
  'Vidéo IA': 'from-rose-500/30 to-pink-500/10',
  'Image IA': 'from-sky-500/30 to-indigo-500/10',
  '3D': 'from-cyan-500/30 to-blue-500/10',
  'Agent & Automatisation': 'from-violet-500/30 to-purple-500/10',
  'Code & Dev': 'from-lime-500/30 to-emerald-500/10',
  'Design & UI': 'from-pink-500/30 to-rose-500/10',
  Business: 'from-yellow-500/30 to-amber-500/10',
  Apprendre: 'from-blue-500/30 to-sky-500/10',
}

export function searchText(s: Save) {
  return [s.title, s.summary, s.use_for, s.caption, s.author, s.category, s.note, ...s.tags, ...s.prompts, s.transcript]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export const fmtDuration = (sec: number | null) =>
  sec ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}` : ''

export function timeAgo(iso: string | null) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 86400000
  if (d < 1) return "aujourd'hui"
  if (d < 2) return 'hier'
  if (d < 30) return `il y a ${Math.floor(d)} j`
  if (d < 365) return `il y a ${Math.floor(d / 30)} mois`
  const y = Math.floor(d / 365)
  return `il y a ${y} an${y > 1 ? 's' : ''}`
}

// Choisit un souvenir : favorise les vieux enregistrements jamais revus, les favoris et l'IA.
export function pickSouvenir(saves: Save[], exclude?: string) {
  const pool = saves.filter((s) => !s.archived && s.id !== exclude)
  if (!pool.length) return null
  const now = Date.now()
  const w = pool.map((s) => {
    const ref = new Date(s.last_seen ?? s.saved_at).getTime()
    const ageDays = Math.max(1, (now - ref) / 86400000)
    return Math.sqrt(ageDays) * (s.is_ai ? 2 : 1) * (s.favorite ? 1.5 : 1) * (s.summary ? 1.5 : 1) / (1 + s.seen_count)
  })
  let r = Math.random() * w.reduce((a, b) => a + b, 0)
  return pool[w.findIndex((x) => (r -= x) < 0)] ?? pool[0]
}
