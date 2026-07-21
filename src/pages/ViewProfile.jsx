import { ArrowLeft, Check, Star, Bot } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { timeAgo, formatMonthYear } from '../utils/helpers'
import apiFetch from '../utils/api'

export default function ViewProfile() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const { token, user: currentUser } = useAuth()
  const currentUserId = currentUser?.id

  const [user, setUser] = useState(null)
  const [workerProfile, setWorkerProfile] = useState(null)
  const [stats, setStats] = useState({})
  const [reviews, setReviews] = useState([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (userId && token) {
      fetchUserProfile()
    }
  }, [userId, token])

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch(`/api/profile/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setWorkerProfile(data.worker_profile)
        setStats(data.stats)
        setReviews(data.reviews || [])
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-sans">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}>
              <ArrowLeft size={20} className="text-text-primary" />
            </button>
            <p className="font-bold text-[15px] text-text-primary">Profile</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-4 p-4">
          <div className="card p-4 flex items-center gap-4 bg-white border border-border rounded-xl">
            <div className="w-20 h-20 rounded-full skeleton flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 skeleton rounded w-2/3" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
          <div className="h-28 skeleton rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 skeleton rounded-xl" />
            <div className="h-16 skeleton rounded-xl" />
            <div className="h-16 skeleton rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-sans pb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-text-primary" />
          </button>
          <p className="font-bold text-[15px] text-text-primary">Profile</p>
        </div>
        {/* RAG chatbot button */}
        {userId !== currentUserId && (
          <button
            onClick={() => navigate(`/post/none/ask-worker/${userId}`)}
            className="flex items-center gap-1.5 text-white text-[11px] font-bold px-3.5 py-2 rounded-xl active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
              boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)'
            }}
          >
            <Bot size={13} />
            Ask Monica✨
          </button>
        )}
      </div>

      {/* Profile Hero Section */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-border">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={user.photo_url || '/assets/default-avatar.png'}
              className="w-20 h-20 rounded-full object-cover border-2 border-border"
            />
            {user.aadhaar_verified && (
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full border-2 border-white flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[18px] text-text-primary">{user.name}</p>
            <p className="text-[13px] text-text-secondary">@{user.username}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`badge ${
                user.trust_badge === 'elite' ? 'badge-elite' :
                user.trust_badge === 'trusted' ? 'badge-trusted' :
                user.trust_badge === 'growing' ? 'badge-growing' :
                'badge-new'
              }`}>
                {user.trust_badge || 'new'}
              </span>
              {user.aadhaar_verified && (
                <span className="badge bg-blue-50 text-primary border border-blue-200">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-[12px] text-text-secondary mt-1.5">
              📍 {user.area_name}, {user.district}
            </p>
          </div>
        </div>

        {/* Member since */}
        <p className="text-[11px] text-text-disabled mt-3">
          Member since {formatMonthYear(user.created_at)}
        </p>
      </div>

      {/* Trust Score Card */}
      <div className="mx-4 mt-4 bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-opacity-80 text-[12px]">Trust Score</p>
            <p className="text-white font-bold text-[28px] leading-none mt-0.5">
              {user.trust_score ?? 85}
              <span className="text-[14px] font-normal text-white text-opacity-70"> / 100</span>
            </p>
          </div>
          <div className="text-right">
            <span className={`text-[12px] font-bold px-3 py-1.5 rounded-xl ${
              user.trust_badge === 'elite' ? 'bg-white text-primary-dark' :
              'bg-white bg-opacity-20 text-white'
            }`}>
              {user.trust_badge ? user.trust_badge.charAt(0).toUpperCase() + user.trust_badge.slice(1) : 'New'}
            </span>
          </div>
        </div>
        <div className="mt-3 bg-white bg-opacity-20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all"
            style={{ width: `${user.trust_score ?? 85}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        {[
          { label: 'Jobs done', value: stats.jobs_completed },
          { label: 'Posts created', value: stats.posts_created },
          { label: 'Avg rating', value: stats.avg_rating ? `★ ${stats.avg_rating}` : 'N/A' }
        ].map(item => (
          <div key={item.label} className="card p-3 text-center bg-white border border-border rounded-xl">
            <p className="font-bold text-[18px] text-primary">{item.value ?? 0}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Skills Section — only if user is_worker */}
      {user.is_worker && workerProfile && (
        <div className="mx-4 mt-4 card p-4 bg-white border border-border rounded-xl">
          <p className="font-bold text-[13px] text-text-primary mb-3">Skills</p>
          <div className="flex flex-wrap gap-2">
            {workerProfile.skills?.map(skill => (
              <span key={skill} className="text-[12px] bg-surface border border-border text-text-secondary px-3 py-1.5 rounded-full capitalize">
                {skill}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div>
              <p className="text-[11px] text-text-secondary">Expected wage</p>
              <p className="text-[13px] font-semibold text-text-primary">
                ₹{workerProfile.wage_min} — ₹{workerProfile.wage_max}/day
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-text-secondary">Availability</p>
              <p className="text-[12px] font-medium text-text-primary">
                {workerProfile.availability_slots?.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="mx-4 mt-4">
        <p className="font-bold text-[13px] text-text-primary mb-3">Reviews</p>

        {reviews.length === 0 ? (
          <div className="card p-5 text-center bg-white border border-border rounded-xl">
            <p className="text-text-secondary text-[13px]">No reviews yet</p>
          </div>
        ) : (
          reviews.slice(0, showAllReviews ? reviews.length : 3).map((review, i) => (
            <div key={i} className="card p-3 mb-2 bg-white border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <img
                  src={review.reviewer_photo || '/assets/default-avatar.png'}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-text-primary">{review.reviewer_name}</p>
                  <p className="text-[10px] text-text-secondary">{review.post_title}</p>
                </div>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={11}
                      className={s <= review.stars ? 'text-yellow-400 fill-yellow-400' : 'text-border'} />
                  ))}
                </div>
              </div>
              {review.review_text && (
                <p className="text-[12px] text-text-secondary italic">"{review.review_text}"</p>
              )}
              <p className="text-[10px] text-text-disabled mt-1.5">{timeAgo(review.revealed_at)}</p>
            </div>
          ))
        )}

        {reviews.length > 3 && (
          <button
            onClick={() => setShowAllReviews(!showAllReviews)}
            className="w-full text-center text-[12px] text-primary font-medium mt-2 hover:underline"
          >
            {showAllReviews ? 'Show less' : `Show all ${reviews.length} reviews`}
          </button>
        )}
      </div>
    </div>
  )
}
