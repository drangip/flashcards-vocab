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
