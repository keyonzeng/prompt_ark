import { createClient } from '@supabase/supabase-js'

// Environment variables must be provided
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// Database types
export interface Prompt {
  id: string
  title: string
  description: string | null
  content: string
  category: string
  tags: string[]
  author: string
  author_id: string | null
  author_avatar: string | null
  quality_score: number | null
  language: string
  variable_count: number | null
  token_estimate: number | null
  type: 'prompt' | 'pack'
  pack_count: number | null
  upvotes: number
  downvotes: number
  install_count: number
  visibility: 'public' | 'unlisted' | 'private'
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  prompt_id: string
  user_id: string
  vote_type: 'up' | 'down'
  created_at: string
}

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  updated_at: string
}

// Helper to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
