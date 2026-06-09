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
