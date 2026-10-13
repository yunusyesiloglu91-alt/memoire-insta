import { createClient } from '@supabase/supabase-js'

// Clés publiques (faites pour le navigateur) : l'accès aux données est verrouillé par les règles RLS côté base.
export const SUPABASE_URL = 'https://ysybtxxngygsaaxfqtdn.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable__kSUy3lis6Bc80UAVcXPLA_I8P60H73'

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export const API_URL = `${SUPABASE_URL}/functions/v1/api`

export async function api<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`)
  return json as T
}

// URLs signées mises en cache : les médias sont privés, le lien expire au bout d'une heure.
const signed = new Map<string, { url: string; exp: number }>()

export async function mediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  const hit = signed.get(path)
  if (hit && hit.exp > Date.now()) return hit.url
  const { data } = await supabase.storage.from('media').createSignedUrl(path, 3600)
  if (!data) return null
  signed.set(path, { url: data.signedUrl, exp: Date.now() + 3300_000 })
  return data.signedUrl
}

export async function mediaUrls(paths: string[]) {
  const missing = paths.filter((p) => (signed.get(p)?.exp ?? 0) <= Date.now())
  if (missing.length) {
    const { data } = await supabase.storage.from('media').createSignedUrls(missing, 3600)
    data?.forEach((d) => d.signedUrl && d.path && signed.set(d.path, { url: d.signedUrl, exp: Date.now() + 3300_000 }))
  }
  return Object.fromEntries(paths.map((p) => [p, signed.get(p)?.url ?? null]))
}
