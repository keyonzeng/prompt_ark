-- ============================================
-- Prompt Ark Hub - Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PROMPTS TABLE
-- ============================================
DROP TABLE IF EXISTS public.prompts CASCADE;

CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  author TEXT NOT NULL DEFAULT 'anonymous',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_avatar TEXT,
  quality_score INTEGER,
  language TEXT DEFAULT 'en',
  variable_count INTEGER,
  token_estimate INTEGER,
  type TEXT NOT NULL DEFAULT 'prompt' CHECK (type IN ('prompt', 'pack')),
  pack_count INTEGER,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
DROP INDEX IF EXISTS idx_prompts_category;
CREATE INDEX idx_prompts_category ON public.prompts(category);

DROP INDEX IF EXISTS idx_prompts_created_at;
CREATE INDEX idx_prompts_created_at ON public.prompts(created_at DESC);

DROP INDEX IF EXISTS idx_prompts_quality_score;
CREATE INDEX idx_prompts_quality_score ON public.prompts(quality_score DESC);

DROP INDEX IF EXISTS idx_prompts_visibility;
CREATE INDEX idx_prompts_visibility ON public.prompts(visibility) WHERE visibility = 'public';

-- Enable Realtime for prompts table
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prompts;

-- ============================================
-- VOTES TABLE
-- ============================================
DROP TABLE IF EXISTS public.votes CASCADE;

CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, user_id)
);

DROP INDEX IF EXISTS idx_votes_prompt_id;
CREATE INDEX idx_votes_prompt_id ON public.votes(prompt_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Prompts policies
-- Read: public visible to all, unlisted visible to knowing the ID, private only to owner
DROP POLICY IF EXISTS "Anyone can view public and unlisted prompts" ON public.prompts;
CREATE POLICY "Anyone can view public and unlisted prompts" ON public.prompts FOR SELECT 
  USING (visibility IN ('public', 'unlisted') OR auth.uid() = author_id);

-- Insert: requires authentication
DROP POLICY IF EXISTS "Authenticated users can insert prompts" ON public.prompts;
CREATE POLICY "Authenticated users can insert prompts" ON public.prompts FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Update: only author can update
DROP POLICY IF EXISTS "Authors can update own prompts" ON public.prompts;
CREATE POLICY "Authors can update own prompts" ON public.prompts FOR UPDATE 
  USING (auth.uid() = author_id OR author_id IS NULL);

-- Delete: only author can delete
DROP POLICY IF EXISTS "Authors can delete own prompts" ON public.prompts;
CREATE POLICY "Authors can delete own prompts" ON public.prompts FOR DELETE 
  USING (auth.uid() = author_id OR author_id IS NULL);

-- Votes policies
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON public.votes;
CREATE POLICY "Authenticated users can insert votes" ON public.votes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own votes" ON public.votes;
CREATE POLICY "Users can update own votes" ON public.votes FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own votes" ON public.votes;
CREATE POLICY "Users can delete own votes" ON public.votes FOR DELETE 
  USING (auth.uid() = user_id);
