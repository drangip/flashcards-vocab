# VocabMemo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack spaced-repetition flashcard web app (English↔French) with thematic grouping and AI card generation via Claude.

**Architecture:** React/Vite frontend (Vercel) → Supabase for auth (Google OAuth), PostgreSQL, and a Deno Edge Function that proxies Anthropic API calls. All user data is isolated via Row Level Security.

**Tech Stack:** React 18, Vite, TailwindCSS 3, React Router 6, Supabase JS v2, Vitest, @testing-library/react, Supabase CLI, Anthropic Claude API (via Edge Function)

---

## File Map

```
vocabmemo/
├── .env.example
├── .env.local                        # Supabase keys (git-ignored)
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── lib/
│   │   ├── supabase.js               # Supabase client singleton
│   │   └── leitner.js                # Pure interval logic
│   ├── hooks/
│   │   ├── useAuth.js                # Auth state + Google sign-in/out
│   │   ├── useThemes.js              # CRUD themes
│   │   ├── useCards.js               # CRUD cards + filter by theme
│   │   └── useReview.js              # Fetch due cards, record answers
│   ├── components/
│   │   ├── ProtectedRoute.jsx        # Redirect to /login if not authed
│   │   ├── Layout.jsx                # Sidebar + main area shell
│   │   ├── Sidebar.jsx               # Nav links + user info
│   │   ├── FlipCard.jsx              # Animated 3D flip card
│   │   ├── CardForm.jsx              # Add/edit card modal form
│   │   └── ThemeForm.jsx             # Add/edit theme form + AI slider
│   └── pages/
│       ├── LoginPage.jsx
│       ├── DashboardPage.jsx
│       ├── ThemesPage.jsx
│       ├── CardsPage.jsx
│       └── ReviewPage.jsx
├── src/lib/leitner.test.js
├── supabase/
│   ├── migrations/
│   │   └── 20260607000000_initial_schema.sql
│   └── functions/
│       └── generate-cards/
│           └── index.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `.env.example`

- [ ] **Step 1: Scaffold Vite + React project**

```bash
npm create vite@latest . -- --template react
npm install
```

Expected: `src/App.jsx`, `src/main.jsx` created by Vite.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom
npm install -D tailwindcss@3 postcss autoprefixer vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#1a1a2e',
          800: '#16213e',
          700: '#0f3460',
        },
        accent: '#e94560',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Configure Vitest**

Replace `vite.config.js`:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```

Create `src/test-setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Set up global CSS**

Replace `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  @apply bg-navy-900 text-gray-100 min-h-screen;
  font-family: system-ui, -apple-system, sans-serif;
}

/* 3D flip card */
.flip-card-inner {
  transition: transform 0.5s;
  transform-style: preserve-3d;
}
.flip-card-inner.flipped {
  transform: rotateY(180deg);
}
.flip-card-front,
.flip-card-back {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.flip-card-back {
  transform: rotateY(180deg);
}
```

- [ ] **Step 6: Create .env.example**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Copy to `.env.local` and fill in your Supabase project values (create a project at supabase.com first).

- [ ] **Step 7: Replace src/main.jsx**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 8: Replace src/App.jsx with placeholder**

```jsx
export default function App() {
  return <div className="p-8 text-white">VocabMemo — scaffold OK</div>
}
```

- [ ] **Step 9: Verify it runs**

```bash
npm run dev
```

Expected: browser shows "VocabMemo — scaffold OK" on dark background at http://localhost:5173

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: project scaffold — Vite + React + Tailwind + Vitest"
```

---

## Task 2: Supabase Schema + RLS

**Files:**
- Create: `supabase/migrations/20260607000000_initial_schema.sql`

Prerequisites: install Supabase CLI (`npm install -g supabase`) and link your project (`supabase login && supabase link`).

- [ ] **Step 1: Create migration file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/20260607000000_initial_schema.sql`:

```sql
-- Themes
CREATE TABLE themes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  emoji      text NOT NULL DEFAULT '📚',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cards
CREATE TABLE cards (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id   uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front      text NOT NULL,
  back       text NOT NULL,
  example    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Card progress (Leitner state)
CREATE TABLE card_progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level          int NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 6),
  next_review_at timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id)
);

-- Index for due-cards query
CREATE INDEX idx_card_progress_user_due
  ON card_progress (user_id, next_review_at);

-- RLS
ALTER TABLE themes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their themes"
  ON themes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own their cards"
  ON cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own their progress"
  ON card_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration to Supabase**

```bash
supabase db push
```

Expected: migration applied, tables visible in Supabase dashboard → Table Editor.

- [ ] **Step 3: Enable Google OAuth in Supabase**

In Supabase dashboard → Authentication → Providers → Google:
1. Enable Google provider
2. Add your Google OAuth Client ID + Secret (from console.cloud.google.com)
3. Set Redirect URL to `https://your-project.supabase.co/auth/v1/callback`

Add `http://localhost:5173` to the allowed redirect URLs in Authentication → URL Configuration.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: Supabase schema — themes, cards, card_progress + RLS"
```

---

## Task 3: Leitner Utility (TDD)

**Files:**
- Create: `src/lib/leitner.js`, `src/lib/leitner.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/lib/leitner.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextLevel, nextReviewDate, isDue, sortByDue, INTERVALS_DAYS } from './leitner'

describe('INTERVALS_DAYS', () => {
  it('has 7 entries matching the Leitner spec', () => {
    expect(INTERVALS_DAYS).toEqual([0, 1, 4, 7, 14, 60, 180])
  })
})

describe('nextLevel', () => {
  it('increments level on correct answer', () => {
    expect(nextLevel(0, true)).toBe(1)
    expect(nextLevel(3, true)).toBe(4)
  })
  it('caps at 6 on correct answer at max level', () => {
    expect(nextLevel(6, true)).toBe(6)
  })
  it('resets to 0 on wrong answer regardless of level', () => {
    expect(nextLevel(5, false)).toBe(0)
    expect(nextLevel(0, false)).toBe(0)
  })
})

describe('nextReviewDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns a date INTERVALS_DAYS[level] days from now', () => {
    const result = nextReviewDate(2) // 4 days
    const d = new Date(result)
    expect(d.toISOString()).toBe('2026-01-05T12:00:00.000Z')
  })
  it('returns now for level 0 (interval = 0 days)', () => {
    const result = nextReviewDate(0)
    expect(new Date(result).toISOString()).toBe('2026-01-01T12:00:00.000Z')
  })
  it('returns 180 days for level 6', () => {
    const result = nextReviewDate(6)
    // 2026-01-01 + 180 days = 2026-06-30
    expect(new Date(result).toISOString()).toBe('2026-06-30T12:00:00.000Z')
  })
})

describe('isDue', () => {
  it('returns true for null (new card, no progress)', () => {
    expect(isDue(null)).toBe(true)
    expect(isDue(undefined)).toBe(true)
  })
  it('returns true for a past date', () => {
    expect(isDue('2020-01-01T00:00:00Z')).toBe(true)
  })
  it('returns false for a future date', () => {
    expect(isDue('2099-01-01T00:00:00Z')).toBe(false)
  })
})

describe('sortByDue', () => {
  it('puts new cards (null next_review_at) first', () => {
    const cards = [
      { id: 'a', next_review_at: '2026-01-10T00:00:00Z' },
      { id: 'b', next_review_at: null },
    ]
    expect(sortByDue(cards)[0].id).toBe('b')
  })
  it('sorts oldest due date before more recent ones', () => {
    const cards = [
      { id: 'a', next_review_at: '2026-06-10T00:00:00Z' },
      { id: 'b', next_review_at: '2026-01-01T00:00:00Z' },
    ]
    expect(sortByDue(cards)[0].id).toBe('b')
  })
  it('does not mutate the original array', () => {
    const cards = [{ id: 'a', next_review_at: null }]
    const sorted = sortByDue(cards)
    expect(sorted).not.toBe(cards)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test -- --run
```

Expected: FAIL with "Cannot find module './leitner'"

- [ ] **Step 3: Implement leitner.js**

Create `src/lib/leitner.js`:

```js
export const INTERVALS_DAYS = [0, 1, 4, 7, 14, 60, 180]
export const MAX_LEVEL = 6

/**
 * Returns the next Leitner level after an answer.
 * @param {number} currentLevel  0–6
 * @param {boolean} correct
 * @returns {number} 0–6
 */
export function nextLevel(currentLevel, correct) {
  if (!correct) return 0
  return Math.min(currentLevel + 1, MAX_LEVEL)
}

/**
 * Returns an ISO string for the next review date given a level.
 * @param {number} level  0–6
 * @returns {string} ISO date string
 */
export function nextReviewDate(level) {
  const days = INTERVALS_DAYS[level]
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

/**
 * Returns true if the card is due for review now.
 * Cards with no progress record (null/undefined) are always due.
 * @param {string|null|undefined} nextReviewAt
 * @returns {boolean}
 */
export function isDue(nextReviewAt) {
  if (nextReviewAt == null) return true
  return new Date(nextReviewAt) <= new Date()
}

/**
 * Returns a new array sorted by due date (most overdue first, new cards first).
 * @param {Array<{next_review_at: string|null}>} cards
 */
export function sortByDue(cards) {
  return [...cards].sort((a, b) => {
    if (a.next_review_at == null) return -1
    if (b.next_review_at == null) return 1
    return new Date(a.next_review_at) - new Date(b.next_review_at)
  })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test -- --run
```

Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/leitner.js src/lib/leitner.test.js
git commit -m "feat: Leitner utility — level progression + interval dates (TDD)"
```

---

## Task 4: Supabase Client + Auth Hook

**Files:**
- Create: `src/lib/supabase.js`, `src/hooks/useAuth.js`

- [ ] **Step 1: Create Supabase client singleton**

Create `src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Create useAuth hook**

Create `src/hooks/useAuth.js`:

```js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns { session, user, loading, signInWithGoogle, signOut }
 * session: Supabase session object or null
 * user: auth.users row or null
 * loading: true until the initial session is resolved
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    signInWithGoogle,
    signOut,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.js src/hooks/useAuth.js
git commit -m "feat: Supabase client + useAuth hook (Google OAuth)"
```

---

## Task 5: Data Hooks

**Files:**
- Create: `src/hooks/useThemes.js`, `src/hooks/useCards.js`, `src/hooks/useReview.js`

- [ ] **Step 1: Create useThemes hook**

Create `src/hooks/useThemes.js`:

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns { themes, loading, error, createTheme, updateTheme, deleteTheme, refetch }
 * themes: Array<{ id, name, emoji, created_at, card_count, due_count }>
 *   card_count and due_count are enriched client-side after fetching cards + progress.
 */
export function useThemes(userId) {
  const [themes, setThemes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchThemes = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      // Fetch themes
      const { data: themesData, error: tErr } = await supabase
        .from('themes')
        .select('*')
        .order('created_at', { ascending: true })
      if (tErr) throw tErr

      // Fetch card counts per theme
      const { data: cardsData, error: cErr } = await supabase
        .from('cards')
        .select('id, theme_id')
      if (cErr) throw cErr

      // Fetch due counts (card_progress where next_review_at <= now)
      const now = new Date().toISOString()
      const { data: dueData, error: dErr } = await supabase
        .from('card_progress')
        .select('card_id')
        .lte('next_review_at', now)
      if (dErr) throw dErr

      const dueCardIds = new Set((dueData || []).map(p => p.card_id))

      // Enrich themes
      const enriched = (themesData || []).map(theme => {
        const themeCards = (cardsData || []).filter(c => c.theme_id === theme.id)
        const dueCount = themeCards.filter(c => dueCardIds.has(c.id)).length
        return { ...theme, card_count: themeCards.length, due_count: dueCount }
      })

      setThemes(enriched)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchThemes() }, [fetchThemes])

  async function createTheme({ name, emoji }) {
    const { data, error } = await supabase
      .from('themes')
      .insert({ name, emoji, user_id: userId })
      .select()
      .single()
    if (error) throw error
    await fetchThemes()
    return data
  }

  async function updateTheme(id, { name, emoji }) {
    const { error } = await supabase
      .from('themes')
      .update({ name, emoji })
      .eq('id', id)
    if (error) throw error
    await fetchThemes()
  }

  async function deleteTheme(id) {
    const { error } = await supabase
      .from('themes')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchThemes()
  }

  return { themes, loading, error, createTheme, updateTheme, deleteTheme, refetch: fetchThemes }
}
```

- [ ] **Step 2: Create useCards hook**

Create `src/hooks/useCards.js`:

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns { cards, loading, error, createCard, updateCard, deleteCard, refetch }
 * cards: Array<{ id, theme_id, front, back, example, created_at, level, next_review_at }>
 *   level and next_review_at come from joining card_progress (null if no record yet)
 * @param {string} userId
 * @param {string|null} themeId  — filter to a specific theme, or null for all
 */
export function useCards(userId, themeId = null) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCards = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('cards').select('*').order('created_at', { ascending: true })
      if (themeId) query = query.eq('theme_id', themeId)

      const { data: cardsData, error: cErr } = await query
      if (cErr) throw cErr

      // Fetch progress for these cards
      const cardIds = (cardsData || []).map(c => c.id)
      let progressMap = {}
      if (cardIds.length > 0) {
        const { data: progressData, error: pErr } = await supabase
          .from('card_progress')
          .select('card_id, level, next_review_at')
          .in('card_id', cardIds)
        if (pErr) throw pErr
        progressMap = Object.fromEntries((progressData || []).map(p => [p.card_id, p]))
      }

      const enriched = (cardsData || []).map(card => ({
        ...card,
        level: progressMap[card.id]?.level ?? null,
        next_review_at: progressMap[card.id]?.next_review_at ?? null,
      }))

      setCards(enriched)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, themeId])

  useEffect(() => { fetchCards() }, [fetchCards])

  async function createCard({ theme_id, front, back, example }) {
    const { data, error } = await supabase
      .from('cards')
      .insert({ theme_id, front, back, example: example || null, user_id: userId })
      .select()
      .single()
    if (error) throw error
    await fetchCards()
    return data
  }

  async function updateCard(id, { front, back, example, theme_id }) {
    const { error } = await supabase
      .from('cards')
      .update({ front, back, example: example || null, theme_id })
      .eq('id', id)
    if (error) throw error
    await fetchCards()
  }

  async function deleteCard(id) {
    const { error } = await supabase.from('cards').delete().eq('id', id)
    if (error) throw error
    await fetchCards()
  }

  return { cards, loading, error, createCard, updateCard, deleteCard, refetch: fetchCards }
}
```

- [ ] **Step 3: Create useReview hook**

Create `src/hooks/useReview.js`:

```js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { nextLevel, nextReviewDate, isDue, sortByDue } from '../lib/leitner'

/**
 * Manages a review session.
 * @param {string} userId
 * @param {string|null} themeId  — null = all themes
 *
 * Returns {
 *   queue,          // Array of due cards (sorted by overdue-ness)
 *   currentCard,    // queue[0] or null
 *   sessionDone,    // true when queue is empty
 *   loading,
 *   error,
 *   startSession,   // loads due cards into queue
 *   recordAnswer,   // (card, correct) => updates DB + advances queue
 * }
 */
export function useReview(userId, themeId = null) {
  const [queue, setQueue] = useState([])
  const [sessionDone, setSessionDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const startSession = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    setSessionDone(false)
    try {
      // Fetch all cards (optionally filtered by theme)
      let query = supabase.from('cards').select('id, front, back, example, theme_id')
      if (themeId) query = query.eq('theme_id', themeId)
      const { data: cardsData, error: cErr } = await query
      if (cErr) throw cErr

      // Fetch progress
      const cardIds = (cardsData || []).map(c => c.id)
      let progressMap = {}
      if (cardIds.length > 0) {
        const { data: progressData, error: pErr } = await supabase
          .from('card_progress')
          .select('card_id, level, next_review_at')
          .in('card_id', cardIds)
        if (pErr) throw pErr
        progressMap = Object.fromEntries((progressData || []).map(p => [p.card_id, p]))
      }

      // Enrich + filter due cards
      const enriched = (cardsData || []).map(card => ({
        ...card,
        level: progressMap[card.id]?.level ?? 0,
        next_review_at: progressMap[card.id]?.next_review_at ?? null,
        has_progress: !!progressMap[card.id],
      }))

      const due = enriched.filter(c => isDue(c.next_review_at))
      const sorted = sortByDue(due)
      setQueue(sorted)
      if (sorted.length === 0) setSessionDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, themeId])

  async function recordAnswer(card, correct) {
    const newLevel = nextLevel(card.level, correct)
    const newDate = nextReviewDate(newLevel)

    // Upsert card_progress
    const { error } = await supabase
      .from('card_progress')
      .upsert({
        card_id: card.id,
        user_id: userId,
        level: newLevel,
        next_review_at: newDate,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'card_id,user_id' })
    if (error) throw error

    // Remove current card from queue
    setQueue(prev => {
      const next = prev.slice(1)
      if (next.length === 0) setSessionDone(true)
      return next
    })
  }

  return {
    queue,
    currentCard: queue[0] ?? null,
    sessionDone,
    loading,
    error,
    startSession,
    recordAnswer,
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: data hooks — useThemes, useCards, useReview"
```

---

## Task 6: Layout Shell + Routing

**Files:**
- Create: `src/components/ProtectedRoute.jsx`, `src/components/Sidebar.jsx`, `src/components/Layout.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create ProtectedRoute**

Create `src/components/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ user, loading, children }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Chargement...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}
```

- [ ] **Step 2: Create Sidebar**

Create `src/components/Sidebar.jsx`:

```jsx
import { NavLink, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/themes', label: 'Thématiques', icon: '🗂️' },
  { to: '/cards', label: 'Mes cartes', icon: '✏️' },
]

export default function Sidebar({ user, signOut }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-navy-800 border-r border-navy-700 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <span className="text-xl font-extrabold text-accent">📚 VocabMemo</span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-navy-700 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-navy-700'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info + sign out */}
      <div className="px-5 py-4 border-t border-navy-700">
        <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
        <button
          onClick={handleSignOut}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Create Layout**

Create `src/components/Layout.jsx`:

```jsx
import { useState } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ user, signOut, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar user={user} signOut={signOut} />
      </div>

      {/* Mobile: hamburger + overlay sidebar */}
      <div className="md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 bg-navy-800 border border-navy-700 rounded-lg p-2 text-gray-300"
        >
          ☰
        </button>
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50">
              <Sidebar user={user} signOut={signOut} />
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Wire up App.jsx with routing**

Replace `src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ThemesPage from './pages/ThemesPage'
import CardsPage from './pages/CardsPage'
import ReviewPage from './pages/ReviewPage'

export default function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage signInWithGoogle={signInWithGoogle} user={user} loading={loading} />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Layout user={user} signOut={signOut}>
                <Routes>
                  <Route path="/" element={<DashboardPage user={user} />} />
                  <Route path="/themes" element={<ThemesPage user={user} />} />
                  <Route path="/cards" element={<CardsPage user={user} />} />
                  <Route path="/review" element={<ReviewPage user={user} />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Create stub pages so imports don't break**

Create `src/pages/LoginPage.jsx`:
```jsx
export default function LoginPage() { return <div>Login</div> }
```
Create `src/pages/DashboardPage.jsx`:
```jsx
export default function DashboardPage() { return <div>Dashboard</div> }
```
Create `src/pages/ThemesPage.jsx`:
```jsx
export default function ThemesPage() { return <div>Themes</div> }
```
Create `src/pages/CardsPage.jsx`:
```jsx
export default function CardsPage() { return <div>Cards</div> }
```
Create `src/pages/ReviewPage.jsx`:
```jsx
export default function ReviewPage() { return <div>Review</div> }
```

- [ ] **Step 6: Verify app runs without errors**

```bash
npm run dev
```

Expected: app loads, redirects to `/login` because not authenticated, no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: layout shell — sidebar, routing, ProtectedRoute"
```

---

## Task 7: Login Page

**Files:**
- Modify: `src/pages/LoginPage.jsx`

- [ ] **Step 1: Implement LoginPage**

Replace `src/pages/LoginPage.jsx`:

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage({ signInWithGoogle, user, loading }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-navy-900 px-4">
      <div className="bg-navy-800 border border-navy-700 rounded-2xl p-10 w-full max-w-sm text-center shadow-xl">
        <div className="text-5xl mb-4">📚</div>
        <h1 className="text-2xl font-extrabold text-white mb-2">VocabMemo</h1>
        <p className="text-gray-400 text-sm mb-8">
          Mémorisez le vocabulaire anglais↔français avec la répétition espacée.
        </p>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continuer avec Google
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

```bash
npm run dev
```

Visit http://localhost:5173 → should redirect to `/login`, show the login card. Click "Continuer avec Google" → should redirect to Google OAuth (requires real Supabase + Google keys in `.env.local`).

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoginPage.jsx
git commit -m "feat: login page — Google OAuth button"
```

---

## Task 8: Dashboard Page

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Implement DashboardPage**

Replace `src/pages/DashboardPage.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { useThemes } from '../hooks/useThemes'
import { useCards } from '../hooks/useCards'

export default function DashboardPage({ user }) {
  const navigate = useNavigate()
  const { themes, loading: themesLoading } = useThemes(user?.id)
  const { cards, loading: cardsLoading } = useCards(user?.id)

  const totalDue = themes.reduce((sum, t) => sum + t.due_count, 0)
  const mastered = cards.filter(c => c.level === 6).length
  const loading = themesLoading || cardsLoading

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bonjour 👋</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard value={totalDue} label="à réviser" color="text-accent" loading={loading} />
        <StatCard value={mastered} label="maîtrisées" color="text-green-400" loading={loading} />
        <StatCard value={themes.length} label="thématiques" color="text-blue-400" loading={loading} />
      </div>

      {/* Themes list */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Révisions en attente
      </h2>

      {loading ? (
        <div className="text-gray-500 text-sm">Chargement...</div>
      ) : themes.length === 0 ? (
        <div className="text-gray-500 text-sm">
          Aucune thématique.{' '}
          <button onClick={() => navigate('/themes')} className="text-accent underline">
            Créer une thématique
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {themes.map(theme => (
            <div
              key={theme.id}
              className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{theme.emoji}</span>
                <div>
                  <span className="font-medium text-white">{theme.name}</span>
                  <span className="text-gray-500 text-xs ml-2">({theme.card_count} cartes)</span>
                </div>
              </div>
              {theme.due_count > 0 ? (
                <button
                  onClick={() => navigate(`/review?themeId=${theme.id}`)}
                  className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full"
                >
                  {theme.due_count} due{theme.due_count > 1 ? 's' : ''}
                </button>
              ) : (
                <span className="text-green-400 text-xs font-medium">✓ À jour</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {totalDue > 0 && (
        <button
          onClick={() => navigate('/review')}
          className="w-full bg-accent hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          ▶ Commencer la révision ({totalDue} carte{totalDue > 1 ? 's' : ''})
        </button>
      )}
    </div>
  )
}

function StatCard({ value, label, color, loading }) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 text-center">
      <div className={`text-3xl font-extrabold ${color}`}>
        {loading ? '…' : value}
      </div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: dashboard — stats, theme list with due badges, review CTA"
```

---

## Task 9: FlipCard Component + Review Page

**Files:**
- Create: `src/components/FlipCard.jsx`
- Modify: `src/pages/ReviewPage.jsx`

- [ ] **Step 1: Create FlipCard component**

Create `src/components/FlipCard.jsx`:

```jsx
import { useState } from 'react'

/**
 * Animated 3D flip card.
 * Props:
 *   front: string — English word/phrase
 *   back: string — French translation
 *   example: string|null
 *   onCorrect: () => void
 *   onWrong: () => void
 */
export default function FlipCard({ front, back, example, onCorrect, onWrong }) {
  const [flipped, setFlipped] = useState(false)

  function handleFlip() {
    setFlipped(true)
  }

  function handleAnswer(correct) {
    setFlipped(false)
    // Small delay so the flip-back animation plays before the next card
    setTimeout(() => {
      if (correct) onCorrect()
      else onWrong()
    }, 100)
  }

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Card */}
      <div className="w-full" style={{ perspective: '1000px' }}>
        <div
          className={`flip-card-inner relative w-full`}
          style={{ minHeight: '260px' }}
        >
          {/* Front */}
          <div className="flip-card-front absolute inset-0 bg-navy-800 border border-navy-700 rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">🇬🇧 Anglais</div>
            <div className="text-4xl font-extrabold text-white text-center">{front}</div>
            {!flipped && (
              <button
                onClick={handleFlip}
                className="mt-8 bg-navy-700 hover:bg-navy-600 text-blue-400 font-semibold px-6 py-2 rounded-xl transition-colors"
              >
                🔄 Retourner
              </button>
            )}
          </div>

          {/* Back */}
          <div className="flip-card-back absolute inset-0 bg-navy-800 border border-navy-700 rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">🇫🇷 Traduction</div>
            <div className="text-3xl font-extrabold text-white text-center mb-3">{back}</div>
            {example && (
              <p className="text-gray-400 text-sm italic text-center">"{example}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Answer buttons — only visible after flip */}
      {flipped && (
        <div className="flex gap-4 mt-6 w-full max-w-xs">
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            ✗ Faux
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            ✓ Bon
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire FlipCard to CSS**

The CSS classes `flip-card-inner`, `flip-card-front`, `flip-card-back`, and `.flipped` are already in `src/index.css` from Task 1.

Update `FlipCard.jsx` to apply the `.flipped` class dynamically:

In `FlipCard.jsx`, find the `flip-card-inner` div and change to:
```jsx
<div
  className={`flip-card-inner relative w-full ${flipped ? 'flipped' : ''}`}
  style={{ minHeight: '260px' }}
>
```

- [ ] **Step 3: Implement ReviewPage**

Replace `src/pages/ReviewPage.jsx`:

```jsx
import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useReview } from '../hooks/useReview'
import FlipCard from '../components/FlipCard'

export default function ReviewPage({ user }) {
  const [searchParams] = useSearchParams()
  const themeId = searchParams.get('themeId') || null
  const navigate = useNavigate()

  const { queue, currentCard, sessionDone, loading, error, startSession, recordAnswer } =
    useReview(user?.id, themeId)

  useEffect(() => {
    startSession()
  }, [startSession])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-400">Chargement de la session...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-red-400">Erreur : {error}</p>
      </div>
    )
  }

  if (sessionDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-6 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-white">Session terminée !</h2>
        <p className="text-gray-400">Toutes les cartes dues ont été révisées.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-accent hover:bg-red-600 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="mb-6 text-center">
        <p className="text-gray-400 text-sm">
          {queue.length} carte{queue.length > 1 ? 's' : ''} restante{queue.length > 1 ? 's' : ''}
        </p>
      </div>

      {currentCard && (
        <FlipCard
          front={currentCard.front}
          back={currentCard.back}
          example={currentCard.example}
          onCorrect={() => recordAnswer(currentCard, true)}
          onWrong={() => recordAnswer(currentCard, false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify flip animation works**

```bash
npm run dev
```

Log in, navigate to `/review` → card should appear, click "Retourner" → card flips with animation, answer buttons appear, clicking advances to next card.

- [ ] **Step 5: Commit**

```bash
git add src/components/FlipCard.jsx src/pages/ReviewPage.jsx
git commit -m "feat: FlipCard component + Review page with Leitner answer recording"
```

---

## Task 10: Themes Page (CRUD)

**Files:**
- Create: `src/components/ThemeForm.jsx`
- Modify: `src/pages/ThemesPage.jsx`

- [ ] **Step 1: Create ThemeForm**

Create `src/components/ThemeForm.jsx`:

```jsx
import { useState } from 'react'

const EMOJI_OPTIONS = ['📚', '💼', '📊', '🌍', '🤖', '🍕', '🎵', '🏃', '💡', '🔬']

/**
 * Props:
 *   initial: { name: '', emoji: '📚' } — for edit mode
 *   onSave: ({ name, emoji }) => Promise
 *   onCancel: () => void
 *   title: string
 */
export default function ThemeForm({ initial = { name: '', emoji: '📚' }, onSave, onCancel, title }) {
  const [name, setName] = useState(initial.name)
  const [emoji, setEmoji] = useState(initial.emoji)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave({ name: name.trim(), emoji })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-2xl p-6 flex flex-col gap-4">
      <h3 className="font-bold text-white text-lg">{title}</h3>

      <div>
        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Nom</label>
        <input
          className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Ex: Travail, Data, Voyage..."
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={60}
          required
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJI_OPTIONS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`text-2xl p-1 rounded-lg transition-colors ${emoji === e ? 'bg-navy-600 ring-2 ring-blue-500' : 'hover:bg-navy-700'}`}
            >
              {e}
            </button>
          ))}
          <input
            type="text"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            className="bg-navy-700 border border-navy-600 rounded-lg px-2 py-1 text-white w-16 text-center"
            maxLength={2}
            title="Ou entrez un emoji personnalisé"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 mt-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 bg-accent hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl transition-colors"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-navy-700 hover:bg-navy-600 text-gray-300 font-bold py-2 rounded-xl transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Implement ThemesPage**

Replace `src/pages/ThemesPage.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemes } from '../hooks/useThemes'
import ThemeForm from '../components/ThemeForm'

export default function ThemesPage({ user }) {
  const navigate = useNavigate()
  const { themes, loading, createTheme, updateTheme, deleteTheme } = useThemes(user?.id)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)

  async function handleCreate(values) {
    await createTheme(values)
    setShowCreate(false)
  }

  async function handleUpdate(id, values) {
    await updateTheme(id, values)
    setEditingId(null)
  }

  async function handleDelete(theme) {
    if (!window.confirm(`Supprimer "${theme.name}" et toutes ses cartes ?`)) return
    await deleteTheme(theme.id)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Mes thématiques</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-accent hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Nouvelle
        </button>
      </div>

      {showCreate && (
        <div className="mb-6">
          <ThemeForm
            title="Nouvelle thématique"
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : themes.length === 0 ? (
        <p className="text-gray-500">Aucune thématique. Crée ta première thématique !</p>
      ) : (
        <div className="flex flex-col gap-3">
          {themes.map(theme => (
            <div key={theme.id}>
              {editingId === theme.id ? (
                <ThemeForm
                  title="Modifier la thématique"
                  initial={{ name: theme.name, emoji: theme.emoji }}
                  onSave={values => handleUpdate(theme.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{theme.emoji}</span>
                    <div>
                      <span className="font-semibold text-white">{theme.name}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        {theme.card_count} carte{theme.card_count !== 1 ? 's' : ''}
                        {theme.due_count > 0 && (
                          <span className="ml-1 text-accent">• {theme.due_count} due{theme.due_count > 1 ? 's' : ''}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {theme.due_count > 0 && (
                      <button
                        onClick={() => navigate(`/review?themeId=${theme.id}`)}
                        className="text-xs bg-accent text-white font-bold px-3 py-1 rounded-full"
                      >
                        Réviser
                      </button>
                    )}
                    <button onClick={() => setEditingId(theme.id)} className="text-gray-500 hover:text-gray-300 text-sm px-2">✏️</button>
                    <button onClick={() => handleDelete(theme)} className="text-gray-500 hover:text-red-400 text-sm px-2">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeForm.jsx src/pages/ThemesPage.jsx
git commit -m "feat: themes page — CRUD with inline edit form"
```

---

## Task 11: Cards Page (CRUD)

**Files:**
- Create: `src/components/CardForm.jsx`
- Modify: `src/pages/CardsPage.jsx`

- [ ] **Step 1: Create CardForm**

Create `src/components/CardForm.jsx`:

```jsx
import { useState } from 'react'

const LEITNER_LABELS = ['Nouveau', 'Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 4', 'Niveau 5', 'Maîtrisé']

/**
 * Props:
 *   initial: { front: '', back: '', example: '', theme_id: '' }
 *   themes: Array<{ id, name, emoji }>
 *   onSave: (values) => Promise
 *   onCancel: () => void
 *   title: string
 */
export default function CardForm({ initial = { front: '', back: '', example: '', theme_id: '' }, themes, onSave, onCancel, title }) {
  const [front, setFront] = useState(initial.front)
  const [back, setBack] = useState(initial.back)
  const [example, setExample] = useState(initial.example || '')
  const [themeId, setThemeId] = useState(initial.theme_id || themes[0]?.id || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!front.trim() || !back.trim() || !themeId) return
    setSaving(true)
    setError(null)
    try {
      await onSave({ front: front.trim(), back: back.trim(), example: example.trim(), theme_id: themeId })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-2xl p-6 flex flex-col gap-4">
      <h3 className="font-bold text-white text-lg">{title}</h3>

      <div>
        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Thématique</label>
        <select
          className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          value={themeId}
          onChange={e => setThemeId(e.target.value)}
          required
        >
          {themes.map(t => (
            <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">🇬🇧 Anglais (recto)</label>
        <input
          className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="leverage"
          value={front}
          onChange={e => setFront(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">🇫🇷 Traduction (verso)</label>
        <input
          className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="tirer parti de / levier"
          value={back}
          onChange={e => setBack(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Exemple (optionnel)</label>
        <input
          className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="We need to leverage our data assets."
          value={example}
          onChange={e => setExample(e.target.value)}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 mt-2">
        <button
          type="submit"
          disabled={saving || !front.trim() || !back.trim()}
          className="flex-1 bg-accent hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2 rounded-xl transition-colors"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 bg-navy-700 hover:bg-navy-600 text-gray-300 font-bold py-2 rounded-xl transition-colors">
          Annuler
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Implement CardsPage**

Replace `src/pages/CardsPage.jsx`:

```jsx
import { useState } from 'react'
import { useCards } from '../hooks/useCards'
import { useThemes } from '../hooks/useThemes'
import CardForm from '../components/CardForm'

const LEITNER_LABELS = ['Nouveau', 'Niv.1', 'Niv.2', 'Niv.3', 'Niv.4', 'Niv.5', 'Maîtrisé ⭐']
const LEVEL_COLORS = ['text-gray-400', 'text-blue-400', 'text-blue-400', 'text-green-400', 'text-green-400', 'text-yellow-400', 'text-yellow-400']

export default function CardsPage({ user }) {
  const { themes } = useThemes(user?.id)
  const [filterThemeId, setFilterThemeId] = useState(null)
  const { cards, loading, createCard, updateCard, deleteCard } = useCards(user?.id, filterThemeId)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)

  async function handleCreate(values) {
    await createCard(values)
    setShowCreate(false)
  }

  async function handleUpdate(id, values) {
    await updateCard(id, values)
    setEditingId(null)
  }

  async function handleDelete(card) {
    if (!window.confirm(`Supprimer "${card.front}" ?`)) return
    await deleteCard(card.id)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Mes cartes</h1>
        <button
          onClick={() => setShowCreate(true)}
          disabled={themes.length === 0}
          className="bg-accent hover:bg-red-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterThemeId(null)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterThemeId === null ? 'bg-accent text-white' : 'bg-navy-700 text-gray-400 hover:text-white'}`}
        >
          Toutes
        </button>
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => setFilterThemeId(t.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterThemeId === t.id ? 'bg-accent text-white' : 'bg-navy-700 text-gray-400 hover:text-white'}`}
          >
            {t.emoji} {t.name}
          </button>
        ))}
      </div>

      {showCreate && themes.length > 0 && (
        <div className="mb-6">
          <CardForm
            title="Nouvelle carte"
            themes={themes}
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : cards.length === 0 ? (
        <p className="text-gray-500">Aucune carte. Ajoute ta première carte !</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map(card => {
            const theme = themes.find(t => t.id === card.theme_id)
            return (
              <div key={card.id}>
                {editingId === card.id ? (
                  <div className="mb-2">
                    <CardForm
                      title="Modifier la carte"
                      initial={{ front: card.front, back: card.back, example: card.example || '', theme_id: card.theme_id }}
                      themes={themes}
                      onSave={values => handleUpdate(card.id, values)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white truncate">{card.front}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-gray-300 truncate">{card.back}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {theme && <span className="text-gray-500">{theme.emoji} {theme.name}</span>}
                        <span className={LEVEL_COLORS[card.level ?? 0]}>
                          {LEITNER_LABELS[card.level ?? 0]}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingId(card.id)} className="text-gray-500 hover:text-gray-300 px-2">✏️</button>
                      <button onClick={() => handleDelete(card)} className="text-gray-500 hover:text-red-400 px-2">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CardForm.jsx src/pages/CardsPage.jsx
git commit -m "feat: cards page — CRUD with theme filter and Leitner level display"
```

---

## Task 12: Edge Function generate-cards

**Files:**
- Create: `supabase/functions/generate-cards/index.ts`

- [ ] **Step 1: Create the Edge Function**

Create `supabase/functions/generate-cards/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { theme, count } = await req.json()
    if (!theme || typeof theme !== 'string' || theme.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'theme is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    const cardCount = Math.min(Math.max(parseInt(count) || 20, 1), 100)

    // Call Anthropic API
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const prompt = `Generate exactly ${cardCount} English-French vocabulary flashcard pairs for the theme: "${theme}".

Rules:
- Focus on words and expressions genuinely used in the context of "${theme}"
- Mix vocabulary types: nouns, verbs, adjectives, idiomatic expressions, collocations
- Each card must have: front (English), back (French), example (one natural English sentence using the word/expression)
- Avoid basic words already known by any French speaker (do not include "the", "a", "is", etc.)
- Vary difficulty: include both intermediate and advanced vocabulary

Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "cards": [
    { "front": "leverage", "back": "tirer parti de / levier", "example": "We need to leverage our existing data assets." },
    ...
  ]
}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      throw new Error(`Anthropic API error: ${anthropicRes.status} ${errText}`)
    }

    const anthropicData = await anthropicRes.json()
    const rawText = anthropicData.content?.[0]?.text ?? ''

    // Parse JSON from Claude's response (strip any accidental markdown fences)
    const jsonText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(jsonText)

    if (!Array.isArray(parsed.cards)) {
      throw new Error('Unexpected response structure from Claude')
    }

    // Validate and sanitize each card
    const cards = parsed.cards
      .filter(c => c.front && c.back)
      .slice(0, cardCount)
      .map(c => ({
        front: String(c.front).trim(),
        back: String(c.back).trim(),
        example: c.example ? String(c.example).trim() : null,
      }))

    return new Response(JSON.stringify({ cards }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('generate-cards error:', err)
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Set the Anthropic API key as a Supabase secret**

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

Expected: `Secret ANTHROPIC_API_KEY set.`

- [ ] **Step 3: Deploy the Edge Function**

```bash
supabase functions deploy generate-cards --no-verify-jwt
```

Wait — actually we DO want JWT verification (we verify manually inside the function). Use:
```bash
supabase functions deploy generate-cards
```

Expected: `Deployed generate-cards successfully.`

- [ ] **Step 4: Test the Edge Function with curl**

First get your Supabase anon key and project URL from `.env.local`, and a valid user JWT by logging in and copying from browser devtools → Application → LocalStorage → supabase auth token.

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/generate-cards \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"theme": "Data Science", "count": 5}'
```

Expected: JSON response with 5 cards.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/
git commit -m "feat: Edge Function generate-cards — Claude API proxy with auth + RLS"
```

---

## Task 13: AI Generation UI

**Files:**
- Modify: `src/pages/ThemesPage.jsx`
- Create: `src/lib/generateCards.js`

- [ ] **Step 1: Create generateCards helper**

Create `src/lib/generateCards.js`:

```js
import { supabase } from './supabase'

/**
 * Calls the generate-cards Edge Function.
 * @param {string} theme — theme name
 * @param {number} count — number of cards (1–100)
 * @returns {Promise<Array<{front, back, example}>>}
 */
export async function generateCards(theme, count) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non authentifié')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cards`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ theme, count }),
    }
  )

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data.cards
}
```

- [ ] **Step 2: Add AI generation flow to ThemesPage**

Replace `src/pages/ThemesPage.jsx` with the full version that includes the AI generation flow:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemes } from '../hooks/useThemes'
import { useCards } from '../hooks/useCards'
import ThemeForm from '../components/ThemeForm'
import { generateCards } from '../lib/generateCards'

const CARD_COUNT_OPTIONS = [10, 20, 30, 50, 75, 100]

export default function ThemesPage({ user }) {
  const navigate = useNavigate()
  const { themes, loading, createTheme, updateTheme, deleteTheme } = useThemes(user?.id)
  const { createCard } = useCards(user?.id)

  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // AI generation state
  const [genThemeId, setGenThemeId] = useState(null)   // which theme we're generating for
  const [genCount, setGenCount] = useState(20)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState(null)
  const [previewCards, setPreviewCards] = useState([])  // generated cards awaiting save
  const [savingCards, setSavingCards] = useState(false)

  async function handleCreate(values) {
    await createTheme(values)
    setShowCreate(false)
  }

  async function handleUpdate(id, values) {
    await updateTheme(id, values)
    setEditingId(null)
  }

  async function handleDelete(theme) {
    if (!window.confirm(`Supprimer "${theme.name}" et toutes ses cartes ?`)) return
    await deleteTheme(theme.id)
  }

  async function handleGenerate(theme) {
    setGenThemeId(theme.id)
    setGenLoading(true)
    setGenError(null)
    setPreviewCards([])
    try {
      const cards = await generateCards(theme.name, genCount)
      setPreviewCards(cards.map((c, i) => ({ ...c, _key: i, _keep: true })))
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenLoading(false)
    }
  }

  function toggleKeepCard(key) {
    setPreviewCards(prev => prev.map(c => c._key === key ? { ...c, _keep: !c._keep } : c))
  }

  async function handleSaveGeneratedCards() {
    const toSave = previewCards.filter(c => c._keep)
    if (toSave.length === 0) return
    setSavingCards(true)
    try {
      await Promise.all(
        toSave.map(c => createCard({
          front: c.front,
          back: c.back,
          example: c.example || null,
          theme_id: genThemeId,
        }))
      )
      setPreviewCards([])
      setGenThemeId(null)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setSavingCards(false)
    }
  }

  function cancelGeneration() {
    setGenThemeId(null)
    setPreviewCards([])
    setGenError(null)
  }

  const activeTheme = themes.find(t => t.id === genThemeId)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Mes thématiques</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-accent hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Nouvelle
        </button>
      </div>

      {showCreate && (
        <div className="mb-6">
          <ThemeForm
            title="Nouvelle thématique"
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* AI generation panel */}
      {genThemeId && (
        <div className="mb-6 bg-navy-800 border border-blue-500/40 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">
              🤖 Générer des cartes — {activeTheme?.emoji} {activeTheme?.name}
            </h3>
            <button onClick={cancelGeneration} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
          </div>

          {!genLoading && previewCards.length === 0 && !genError && (
            <>
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                  Nombre de cartes à générer
                </label>
                <div className="flex gap-2 flex-wrap">
                  {CARD_COUNT_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => setGenCount(n)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${genCount === n ? 'bg-blue-600 text-white' : 'bg-navy-700 text-gray-400 hover:text-white'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleGenerate(activeTheme)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                🤖 Générer {genCount} cartes avec Claude
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Claude va créer {genCount} paires anglais↔français sur "{activeTheme?.name}"
              </p>
            </>
          )}

          {genLoading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="text-3xl animate-bounce">🤖</div>
              <p className="text-gray-400">Claude génère vos cartes...</p>
              <p className="text-gray-500 text-xs">Cela peut prendre 15 à 30 secondes</p>
            </div>
          )}

          {genError && (
            <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg">
              Erreur : {genError}
            </div>
          )}

          {previewCards.length > 0 && (
            <>
              <p className="text-sm text-gray-400 mb-3">
                {previewCards.filter(c => c._keep).length}/{previewCards.length} cartes sélectionnées.
                Décochez celles que vous ne souhaitez pas garder.
              </p>
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto mb-4">
                {previewCards.map(card => (
                  <div
                    key={card._key}
                    onClick={() => toggleKeepCard(card._key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      card._keep
                        ? 'bg-navy-700 border-navy-600'
                        : 'bg-navy-900 border-navy-800 opacity-40'
                    }`}
                  >
                    <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                      {card._keep
                        ? <span className="text-green-400">✓</span>
                        : <span className="text-gray-500">○</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 text-sm">
                        <span className="font-semibold text-white">{card.front}</span>
                        <span className="text-gray-500">→</span>
                        <span className="text-gray-300">{card.back}</span>
                      </div>
                      {card.example && (
                        <p className="text-xs text-gray-500 italic mt-1 truncate">"{card.example}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveGeneratedCards}
                  disabled={savingCards || previewCards.filter(c => c._keep).length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl transition-colors"
                >
                  {savingCards ? 'Enregistrement...' : `✓ Enregistrer ${previewCards.filter(c => c._keep).length} cartes`}
                </button>
                <button
                  onClick={cancelGeneration}
                  className="flex-1 bg-navy-700 hover:bg-navy-600 text-gray-300 font-bold py-2 rounded-xl transition-colors"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Themes list */}
      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : themes.length === 0 ? (
        <p className="text-gray-500">Aucune thématique. Crée ta première !</p>
      ) : (
        <div className="flex flex-col gap-3">
          {themes.map(theme => (
            <div key={theme.id}>
              {editingId === theme.id ? (
                <ThemeForm
                  title="Modifier"
                  initial={{ name: theme.name, emoji: theme.emoji }}
                  onSave={values => handleUpdate(theme.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{theme.emoji}</span>
                    <div className="min-w-0">
                      <span className="font-semibold text-white">{theme.name}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        {theme.card_count} carte{theme.card_count !== 1 ? 's' : ''}
                        {theme.due_count > 0 && (
                          <span className="ml-1 text-accent">• {theme.due_count} due{theme.due_count > 1 ? 's' : ''}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {theme.due_count > 0 && (
                      <button
                        onClick={() => navigate(`/review?themeId=${theme.id}`)}
                        className="text-xs bg-accent text-white font-bold px-3 py-1 rounded-full"
                      >
                        Réviser
                      </button>
                    )}
                    <button
                      onClick={() => { setGenThemeId(theme.id); setPreviewCards([]); setGenError(null) }}
                      className="text-gray-500 hover:text-blue-400 text-sm px-2"
                      title="Générer des cartes avec Claude"
                    >
                      🤖
                    </button>
                    <button onClick={() => setEditingId(theme.id)} className="text-gray-500 hover:text-gray-300 text-sm px-2">✏️</button>
                    <button onClick={() => handleDelete(theme)} className="text-gray-500 hover:text-red-400 text-sm px-2">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/generateCards.js src/pages/ThemesPage.jsx
git commit -m "feat: AI card generation UI — preview, select/deselect, bulk save"
```

---

## Task 14: Deploy to Vercel

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Add vercel.json for SPA routing**

Create `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel SPA rewrite config"
```

- [ ] **Step 3: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/vocabmemo.git
git push -u origin master
```

- [ ] **Step 4: Deploy on Vercel**

1. Go to vercel.com → New Project → Import from GitHub
2. Select the `vocabmemo` repo
3. In Environment Variables, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click Deploy

- [ ] **Step 5: Update Supabase redirect URLs**

In Supabase dashboard → Authentication → URL Configuration:
- Add your Vercel URL to Site URL: `https://vocabmemo.vercel.app`
- Add it to Redirect URLs too

In Google Cloud Console → your OAuth app → Authorized redirect URIs:
- Add `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

- [ ] **Step 6: Smoke test production**

Visit your Vercel URL:
1. Login with Google ✓
2. Create a theme ✓
3. Generate cards with Claude ✓
4. Review cards — flip animation ✓
5. Check dashboard counts update ✓

- [ ] **Step 7: Final commit tag**

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Self-Review

**Spec coverage check:**
- ✅ Flip card (recto → verso) with Bon/Faux buttons — Task 9
- ✅ Leitner intervals 0/1/4/7/14/60/180 days — Task 3
- ✅ Wrong answer resets to level 0 — Task 3 (`nextLevel`)
- ✅ Only due cards proposed, most overdue first — Task 5 (`useReview` + `sortByDue`)
- ✅ Add/edit/delete cards — Task 11
- ✅ Thematic grouping — Tasks 2, 10
- ✅ AI generation via Claude (max 100 cards, preview before save) — Tasks 12, 13
- ✅ Google OAuth — Task 4, 7
- ✅ Supabase persistence + RLS — Task 2
- ✅ Sidebar navigation desktop, hamburger mobile — Task 6
- ✅ Dashboard with stats and per-theme due counts — Task 8
- ✅ Review filterable by theme — Tasks 5, 9 (`?themeId=`)
- ✅ Deploy on Vercel — Task 14

**No placeholders found.**

**Type consistency:** `card.level` is `number|null` throughout. `nextLevel(card.level ?? 0, correct)` used in `useReview.recordAnswer`. `createCard` accepts `{ front, back, example, theme_id }` consistently across `CardForm`, `CardsPage`, and `ThemesPage`.
