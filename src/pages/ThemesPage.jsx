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
