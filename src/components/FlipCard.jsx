import { useState } from 'react'

export default function FlipCard({ front, back, example, onCorrect, onWrong }) {
  const [flipped, setFlipped] = useState(false)

  function handleFlip() {
    setFlipped(true)
  }

  function handleAnswer(correct) {
    setFlipped(false)
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
          className={`flip-card-inner relative w-full ${flipped ? 'flipped' : ''}`}
          style={{ minHeight: '260px' }}
        >
          {/* Front */}
          <div className="flip-card-front absolute inset-0 bg-navy-800 border border-navy-700 rounded-2xl flex flex-col items-center justify-center p-8 shadow-xl">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">🇫🇷 Français</div>
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
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-4">🇬🇧 Anglais</div>
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
