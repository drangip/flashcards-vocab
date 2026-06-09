import { useState } from 'react'

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
