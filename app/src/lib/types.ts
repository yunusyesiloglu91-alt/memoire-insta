export type Save = {
  id: string
  url: string
  source: string
  shortcode: string | null
  account: string | null
  media_type: 'video' | 'image' | 'carousel' | 'link'
  author: string | null
  author_name: string | null
  caption: string | null
  transcript: string | null
  thumb_path: string | null
  video_path: string | null
  duration: number | null
  taken_at: string | null
  saved_at: string
  save_rank: number | null
  is_ai: boolean
  category: string | null
  title: string | null
  summary: string | null
  use_for: string | null
  how_to: string[]
  links: { label: string; url: string }[]
  prompts: string[]
  tags: string[]
  status: 'pending' | 'ready' | 'error'
  note: string
  favorite: boolean
  seen_count: number
  last_seen: string | null
  archived: boolean
  created_at: string
}
