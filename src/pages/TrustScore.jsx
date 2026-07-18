import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { timeAgo } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'

export default function TrustScore() {
  const navigate = useNavigate()
  const { token: accessToken } = useAuth()

  // State management
  const [trustScore, setTrustScore] = useState(0)
  const [trustBadge, setTrustBadge] = useState('new')
  const [stats, setStats] = useState({
    jobs_completed: 0,
    avg_rating: null,
    cancellations: 0,
    on_time_rate: 0
  })
  const [scoreHistory, setScoreHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTrustData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/ratings/trust-score`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (res.ok) {
          const data = await res.json()
          setTrustScore(data.trust_score ?? 0)
          setTrustBadge(data.trust_badge ?? 'new')
          setStats(data.stats ?? {
            jobs_completed: 0,
            avg_rating: null,
            cancellations: 0,
            on_time_rate: 0
          })
          setScoreHistory(data.history ?? [])
        }
      } catch (err) {
        console.error('Failed to fetch trust score data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (accessToken) {
      fetchTrustData()
    }
  }, [accessToken])

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-surface transition-colors active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <p className="font-bold text-[15px] text-text-primary">Your Trust Score</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-text-secondary text-[13px] font-medium animate-pulse">Loading trust stats...</p>
        </div>
      ) : (
        <div className="pb-8">
          {/* Score hero card */}
          <div className="mx-4 mt-4 bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] text-white text-opacity-80">Your trust score</p>
                <p className="text-[42px] font-bold leading-none mt-1">{trustScore}</p>
                <p className="text-[12px] text-white text-opacity-70">out of 100</p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-[13px] font-bold ${
                trustBadge === 'elite' ? 'bg-white text-primary-dark' :
                trustBadge === 'trusted' ? 'bg-green-400 text-white' :
                trustBadge === 'growing' ? 'bg-yellow-400 text-white' :
                'bg-white bg-opacity-20 text-white'
              }`}>
                {trustBadge.charAt(0).toUpperCase() + trustBadge.slice(1)}
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-white bg-opacity-20 rounded-full h-2.5 mb-2">
              <div
                className="bg-white rounded-full h-2.5 transition-all duration-700"
                style={{ width: `${trustScore}%` }}
              />
            </div>

            {/* Next badge info */}
            <p className="text-[11px] text-white text-opacity-70">
              {trustScore < 21 ? `${21 - trustScore} points to Growing` :
               trustScore < 41 ? `${41 - trustScore} points to Trusted` :
               trustScore < 71 ? `${71 - trustScore} points to Elite` :
               'Maximum level reached 🎉'}
            </p>
          </div>

          {/* Score breakdown cards */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Jobs completed', value: stats.jobs_completed, icon: '✅', color: 'text-green-600' },
              { label: 'Avg rating', value: `★ ${stats.avg_rating || 'N/A'}`, icon: '⭐', color: 'text-yellow-500' },
              { label: 'Cancellations', value: stats.cancellations, icon: '❌', color: 'text-danger' },
              { label: 'On time rate', value: `${stats.on_time_rate}%`, icon: '⏰', color: 'text-primary' }
            ].map(item => (
              <div key={item.label} className="card p-3 bg-white border border-border rounded-xl">
                <p className="text-[18px] mb-1">{item.icon}</p>
                <p className={`font-bold text-[16px] ${item.color}`}>{item.value}</p>
                <p className="text-[11px] text-text-secondary mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* How score is calculated */}
          <div className="mx-4 mt-4 card p-4 bg-white border border-border rounded-xl">
            <p className="font-bold text-[13px] text-text-primary mb-3">How your score is calculated</p>
            {[
              { event: 'Job completed', points: '+8', color: 'text-green-600' },
              { event: '5 star rating received', points: '+5', color: 'text-green-600' },
              { event: '4 star rating received', points: '+3', color: 'text-green-600' },
              { event: 'Aadhaar verified (one time)', points: '+10', color: 'text-green-600' },
              { event: 'Job cancelled after selection', points: '-8', color: 'text-danger' },
              { event: 'No show on work day', points: '-15', color: 'text-danger' },
              { event: '1 or 2 star rating received', points: '-5', color: 'text-danger' },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <p className="text-[12px] text-text-secondary">{item.event}</p>
                <span className={`text-[12px] font-bold ${item.color}`}>{item.points}</span>
              </div>
            ))}
          </div>

          {/* Recent score history */}
          <div className="mx-4 mt-4 mb-24 bg-white border border-border rounded-xl p-4">
            <p className="font-bold text-[13px] text-text-primary mb-3">Recent activity</p>
            {scoreHistory.length === 0 ? (
              <p className="text-center text-text-disabled text-[12px] py-4">No recent trust score activity</p>
            ) : (
              scoreHistory.map((log, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.score_change > 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className="text-[12px] font-bold text-text-primary">
                      {log.score_change > 0 ? '↑' : '↓'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-text-primary font-medium truncate">{log.reason}</p>
                    <p className="text-[10px] text-text-disabled">{timeAgo(log.created_at)}</p>
                  </div>
                  <span className={`text-[13px] font-bold flex-shrink-0 ${
                    log.score_change > 0 ? 'text-green-600' : 'text-danger'
                  }`}>
                    {log.score_change > 0 ? '+' : ''}{log.score_change}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
