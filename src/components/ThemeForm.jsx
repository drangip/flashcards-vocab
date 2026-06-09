import { useState } from 'react'

const EMOJI_OPTIONS = ['📚', '💼', '📊', '🌍', '🤖', '🍕', '🎵', '🏃', '💡', '🔬']

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
