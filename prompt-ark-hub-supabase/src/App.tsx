import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, type Prompt } from './lib/supabase'
import {
  Header,
  SearchBar,
  CategoryTabs,
  SortSelect,
  PromptGrid,
  DetailModal,
  Voting,
  ToastProvider,
  useToast,
  Loading,
  Pagination,
} from './components'

type SortOption = 'trending' | 'newest' | 'topRated' | 'quality'

const PAGE_SIZE = 12

function AppContent() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('trending')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const { showToast } = useToast()

  // Get unique categories from prompts
  const categories = useMemo(() => {
    const cats = new Set<string>()
    prompts.forEach(p => { if (p.category) cats.add(p.category) })
    return ['all', ...Array.from(cats).sort()]
  }, [prompts])

  // Load prompts on mount
  useEffect(() => {
    loadPrompts()
  }, [])

  // Open detail when id param present in URL
  useEffect(() => {
    if (prompts.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) {
      const found = prompts.find(p => p.id === id)
      if (found) {
        setSelectedPrompt(found)
      }
    }
  }, [prompts])

  async function loadPrompts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
    
    if (error) {
      console.error('Error loading prompts:', error)
      showToast('Failed to load prompts')
    } else {
      // Sort by created_at descending
      const sorted = (data || []).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setPrompts(sorted)
    }
    setLoading(false)
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [category, search, sort])

  // Filter and sort prompts
  const filteredPrompts = useMemo(() => {
    let list = [...prompts]

    // Category filter (case-insensitive)
    if (category !== 'all') {
      list = list.filter(p => p.category?.toLowerCase() === category.toLowerCase())
    }

    // Search filter (fuzzy: title, category, author, tags)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => 
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.author?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      )
    }

    // Sort
    switch (sort) {
      case 'trending':
        list.sort((a, b) => (b.upvotes + b.install_count) - (a.upvotes + a.install_count))
        break
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'topRated':
        list.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
        break
      case 'quality':
        list.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
        break
    }

    return list
  }, [prompts, category, search, sort])

  // Paginated prompts
  const paginatedPrompts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredPrompts.slice(start, start + PAGE_SIZE)
  }, [filteredPrompts, currentPage])

  const totalPages = Math.ceil(filteredPrompts.length / PAGE_SIZE)

  // Extract variables from content (e.g., {{topic}}, {{lang:EN|ZH}})
  const extractVariables = (content: string): string[] => {
    const vars = (content || '').match(/\{\{([^}]+)\}\}/g) || []
    const uniqueVars = [...new Set(vars.map(v => v.replace(/\{\{|\}\}/g, '').split(/[:=|]/)[0].trim()))]
    return uniqueVars
  }

  // Handle vote - directly update prompts table
  async function handleVote(type: 'up' | 'down') {
    if (!selectedPrompt) return

    const currentUpvotes = selectedPrompt.upvotes || 0
    const currentDownvotes = selectedPrompt.downvotes || 0

    // Optimistic update
    const updated = { 
      ...selectedPrompt,
      upvotes: type === 'up' ? currentUpvotes + 1 : currentUpvotes,
      downvotes: type === 'down' ? currentDownvotes + 1 : currentDownvotes
    }
    setSelectedPrompt(updated)

    // Update local prompts list
    setPrompts(prompts.map(p => 
      p.id === selectedPrompt.id ? updated : p
    ))

    // Save to Supabase
    if (type === 'up') {
      await supabase
        .from('prompts')
        .update({ upvotes: currentUpvotes + 1 })
        .eq('id', selectedPrompt.id)
    } else {
      await supabase
        .from('prompts')
        .update({ downvotes: currentDownvotes + 1 })
        .eq('id', selectedPrompt.id)
    }
  }

  // Handle install - directly update prompts table
  async function handleInstall() {
    if (!selectedPrompt) return

    const currentInstallCount = selectedPrompt.install_count || 0

    // Optimistic update
    const updated = { 
      ...selectedPrompt,
      install_count: currentInstallCount + 1
    }
    setSelectedPrompt(updated)

    // Update local prompts list
    setPrompts(prompts.map(p => 
      p.id === selectedPrompt.id ? updated : p
    ))

    // Check if this is a pack
    const isPack = selectedPrompt.type === 'pack'

    let payload

    if (isPack) {
      // Pack: parse content as JSON array
      try {
        const packItems = JSON.parse(selectedPrompt.content || '[]')
        payload = {
          format: 'prompt-ark',
          version: 1,
          prompts: packItems.map((item: any) => ({
            title: item.title,
            content: item.content,
            category: item.category || '',
            tags: item.tags || [],
            variables: []
          })),
          pack: { title: selectedPrompt.title, count: packItems.length }
        }
      } catch {
        showToast('❌ Failed to parse pack data')
        return
      }
    } else {
      // Single prompt: extract variables
      const uniqueVars = extractVariables(selectedPrompt.content || '')
      payload = {
        format: 'prompt-ark',
        version: 1,
        prompts: [{
          title: selectedPrompt.title,
          content: selectedPrompt.content,
          category: selectedPrompt.category,
          tags: selectedPrompt.tags,
          variables: uniqueVars.map(v => ({ name: v }))
        }]
      }
    }

    window.postMessage({ type: 'PROMPT_ARK_IMPORT', payload }, '*')
    showToast('✅ Prompt sent to Prompt Ark!')

    // Save to Supabase
    await supabase
      .from('prompts')
      .update({ install_count: currentInstallCount + 1 })
      .eq('id', selectedPrompt.id)
  }

  // Handle copy link
  function handleCopyLink() {
    if (!selectedPrompt) return
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${selectedPrompt.id}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('✅ Share link copied!')
    }).catch(() => {
      showToast('❌ Failed to copy link')
    })
  }

  // Handle fork (only for single prompts, not packs)
  function handleFork() {
    if (!selectedPrompt) return
    if (!selectedPrompt.content) {
      showToast('❌ No prompt data to fork')
      return
    }

    // Extract variables from content
    const uniqueVars = extractVariables(selectedPrompt.content || '')

    const payload = {
      format: 'prompt-ark',
      version: 1,
      prompts: [{
        title: `[Fork] ${selectedPrompt.title || 'Untitled'}`,
        content: selectedPrompt.content,
        category: selectedPrompt.category || '',
        tags: [...(selectedPrompt.tags || []), 'forked'],
        variables: uniqueVars.map(v => ({ name: v }))
      }],
    }

    window.postMessage({ type: 'PROMPT_ARK_IMPORT', payload }, '*')
    showToast(`🍴 Forked prompt to Prompt Ark!`)
  }

  const handleCategoryChange = useCallback((cat: string) => {
    setCategory(cat)
    setCurrentPage(1)
  }, [])

  return (
    <div className="hub-container">
      <Header />
      
      <SearchBar value={search} onChange={setSearch} />
      
      <div className="hub-controls">
        <CategoryTabs 
          categories={categories} 
          activeCategory={category} 
          onChange={handleCategoryChange} 
        />
        <SortSelect value={sort} onChange={setSort} />
      </div>
      
      <div className="hub-stats">
        <span className="hub-stats-count">
          <strong>{filteredPrompts.length}</strong> of {prompts.length} prompts
        </span>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <PromptGrid 
            prompts={paginatedPrompts} 
            onPromptClick={setSelectedPrompt} 
          />
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPrompts.length}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <footer className="hub-footer">
        <p>Prompt Ark Hub — Open source community prompt library</p>
        <p><a href="https://github.com/KeyonZeng/prompt_ark" target="_blank">GitHub</a> · Made with ❤️ by the Prompt Ark community</p>
      </footer>

      <DetailModal 
        prompt={selectedPrompt} 
        onClose={() => setSelectedPrompt(null)}
        onCopyLink={handleCopyLink}
        onFork={handleFork}
        onInstall={handleInstall}
      >
        {selectedPrompt && (
          <>
            <Voting 
              upvotes={selectedPrompt.upvotes || 0}
              downvotes={selectedPrompt.downvotes || 0}
              onVote={handleVote}
            />
          </>
        )}
      </DetailModal>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
