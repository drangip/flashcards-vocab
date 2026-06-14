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
- Each card must have: front (French), back (English), example (one natural English sentence using the word/expression)
- Avoid basic words already known by any French speaker (do not include "the", "a", "is", etc.)
- Vary difficulty: include both intermediate and advanced vocabulary

Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "cards": [
    { "front": "tirer parti de / levier", "back": "leverage", "example": "We need to leverage our existing data assets." },
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
