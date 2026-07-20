import { Settings, Check, Star, Home as HomeIcon, Compass, MessageSquare, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { timeAgo, formatDate, formatMonthYear } from '../utils/helpers'

export default function Profile() {
  const navigate = useNavigate()
  const { token } = useAuth()

  const [user, setUser] = useState(null)
  const [workerProfile, setWorkerProfile] = useState(null)
  const [stats, setStats] = useState({})
  const [myPosts, setMyPosts] = useState([])
  const [reviews, setReviews] = useState([])
  const [postFilter, setPostFilter] = useState('active')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchProfileData()
    }
  }, [token])

  const fetchProfileData = async () => {
    setIsLoading(true)
    try {
      const [profileRes, postsRes, reviewsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/profile/me`,
          { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/profile/my-posts`,
          { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/ratings/my-reviews`,
          { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      if (profileRes.ok && postsRes.ok && reviewsRes.ok) {
        const profileData = await profileRes.json()
        const postsData = await postsRes.json()
        const reviewsData = await reviewsRes.json()

        setUser(profileData.user)
        setWorkerProfile(profileData.worker_profile)
        setStats(profileData.stats)
        setMyPosts(postsData.posts || [])
        setReviews(reviewsData.reviews || [])
      }
    } catch (err) {
      console.error("Failed to fetch profile details:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-sans">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
          <p className="font-bold text-[17px] text-text-primary">Profile</p>
          <Settings size={20} className="text-text-secondary" />
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
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-sans pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
        <p className="font-bold text-[17px] text-text-primary">Profile</p>
        <button onClick={() => navigate('/profile/settings')}>
          <Settings size={20} className="text-text-secondary" />
        </button>
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

          {/* Edit button */}
          <button
            onClick={() => navigate('/profile/edit')}
            className="border border-border rounded-xl px-3 py-1.5 text-[12px] text-text-secondary font-medium"
          >
            Edit
          </button>
        </div>

        {/* Member since */}
        <p className="text-[11px] text-text-disabled mt-3">
          Member since {formatMonthYear(user.created_at)}
        </p>
      </div>

      {/* Trust Score Card — tappable */}
      <div
        className="mx-4 mt-4 bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-4 cursor-pointer"
        onClick={() => navigate('/profile/trust-score')}
      >
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
            <p className="text-white text-opacity-60 text-[10px] mt-2">
              Tap to see details →
            </p>
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
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-[13px] text-text-primary">My Skills</p>
            <button
              onClick={() => navigate('/profile/edit-worker')}
              className="text-[11px] text-primary font-medium"
            >
              Edit
            </button>
          </div>
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

      {/* My Posts Section */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-[13px] text-text-primary">My Posts</p>
          <div className="flex gap-1">
            {['active', 'completed', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setPostFilter(f)}
                className={`text-[10px] px-2.5 py-1 rounded-full border capitalize ${
                  postFilter === f
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text-secondary border-border'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {myPosts.filter(p =>
          postFilter === 'all' ? true :
          postFilter === 'active' ? p.status === 'open' || p.status === 'in_progress' :
          p.status === 'completed'
        ).map(post => (
          <div
            key={post.id}
            className="card p-3 mb-2 cursor-pointer bg-white border border-border rounded-xl"
            onClick={() => navigate(`/post/${post.id}/manage`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-text-primary truncate">{post.title}</p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {post.post_category === 'paid' ? `₹${post.pay_per_person}/day` : 'Volunteer'} · {post.area_name}
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ml-2 flex-shrink-0 ${
                post.status === 'open' ? 'bg-green-50 text-green-600 border border-green-200' :
                post.status === 'completed' ? 'bg-surface text-text-secondary border border-border' :
                post.status === 'in_progress' ? 'bg-blue-50 text-primary border border-blue-200' :
                'bg-red-50 text-danger border border-red-200'
              }`}>
                {post.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-text-disabled">
                {post.applications_count || 0} applied
              </span>
              <span className="text-[10px] text-text-disabled">
                {timeAgo(post.created_at)}
              </span>
            </div>
          </div>
        ))}

        {myPosts.length === 0 && (
          <div className="card p-6 text-center bg-white border border-border rounded-xl">
            <p className="text-text-secondary text-[13px]">No posts yet</p>
            <button
              onClick={() => navigate('/post/create')}
              className="text-primary text-[12px] font-medium mt-1 hover:underline"
            >
              Create your first post →
            </button>
          </div>
        )}
      </div>

      {/* My Reviews Section */}
      <div className="mx-4 mt-4 mb-24">
        <p className="font-bold text-[13px] text-text-primary mb-3">Reviews I received</p>

        {reviews.length === 0 ? (
          <div className="card p-5 text-center bg-white border border-border rounded-xl">
            <p className="text-text-secondary text-[13px]">No reviews yet</p>
            <p className="text-text-disabled text-[11px] mt-1">
              Complete a job to receive your first review
            </p>
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

      {/* ═══ BOTTOM NAVIGATION ═══════════════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white"
        style={{ boxShadow:'0 -1px 16px rgba(43,126,193,0.10)', borderTop:'1px solid #EEF3F8' }}>
        <div className="flex items-center justify-around py-2">
          {[
            { id:'home',    icon:<HomeIcon size={22} />,       label:'Home',    path: '/home'   },
            { id:'explore', icon:<Compass size={22} />,        label:'Explore', path: '/home' },
            { id:'chats',   icon:<MessageSquare size={22} />,  label:'Chats',   path: '/home', badge: 2 },
            { id:'profile', icon:<UserCircle size={22} />,     label:'Profile', path: '/profile' },
          ].map(nav => {
            const isActive = nav.id === 'profile';
            return (
              <button key={nav.id} id={`nav-${nav.id}`}
                onClick={() => navigate(nav.path)}
                className="flex flex-col items-center gap-0.5 px-4 py-1 relative">
                <span className="relative">
                  <span style={{ color: isActive ? '#2B7EC1' : '#94A3B8' }}>{nav.icon}</span>
                </span>
                <span className="text-[10px] font-semibold"
                  style={{ color: isActive ? '#2B7EC1' : '#94A3B8' }}>
                  {nav.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-primary -mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  )
}
