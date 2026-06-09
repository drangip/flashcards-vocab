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
  const [deleteError, setDeleteError] = useState(null)

  // AI generation state
  const [genThemeId, setGenThemeId] = useState(null)
  const [genCount, setGenCount] = useState(20)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState(null)
  const [previewCards, setPreviewCards] = useState([])
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
    try {
      setDeleteError(null)
      await deleteTheme(theme.id)
    } catch (err) {
      setDeleteError(err.message)
    }
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
      {deleteError && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          Erreur : {deleteError}
        </div>
      )}
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
