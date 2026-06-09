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
