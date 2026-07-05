import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Check, X } from 'lucide-react'
import { timeAgo } from '../utils/helpers'

const ALLOWED_API_BASE = import.meta.env.VITE_API_URL
const isValidId = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id)

function buildUrl(base, ...segments) {
  if (!segments.every(isValidId)) return null
  return `${base}/api/applications/${segments.join('/')}`
}

export default function Applicants() {
  const { postId } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [slotsRemaining, setSlotsRemaining] = useState(0)

  const filteredApplicants = activeTab === 'all'
    ? applicants
    : applicants.filter(a => a.status === activeTab)

  const tabCounts = {
    all: applicants.length,
    pending: applicants.filter(a => a.status === 'applied').length,
    selected: applicants.filter(a => a.status === 'selected').length,
    rejected: applicants.filter(a => a.status === 'rejected').length,
  }

  useEffect(() => {
    fetchApplicants()
  }, [postId])

  const fetchApplicants = async () => {
    const url = buildUrl(ALLOWED_API_BASE, postId)
    if (!url) return
    setIsLoading(true)
    try {
      const accessToken = localStorage.getItem('token')
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      const data = await res.json()
      setPost(data.post)
      setApplicants(data.applicants || [])
      setSlotsRemaining(data.post?.slots_remaining || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (applicationId) => {
    if (slotsRemaining <= 0) {
      alert('All positions are filled')
      return
    }
    if (!isValidId(applicationId)) return
    const selectUrl = buildUrl(ALLOWED_API_BASE, applicationId, 'select')
    if (!selectUrl) return
    const accessToken = localStorage.getItem('token')
    const res = await fetch(selectUrl, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) {
      setApplicants(prev =>
        prev.map(a => a.id === applicationId ? { ...a, status: 'selected' } : a)
      )
      setSlotsRemaining(prev => prev - 1)
      navigate(`/chat/${applicationId}`)
    }
  }

  const handleReject = async (applicationId) => {
    if (!isValidId(applicationId)) return
    const rejectUrl = buildUrl(ALLOWED_API_BASE, applicationId, 'reject')
    if (!rejectUrl) return
    const accessToken = localStorage.getItem('token')
    const res = await fetch(rejectUrl, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) {
      setApplicants(prev =>
        prev.map(a => a.id === applicationId ? { ...a, status: 'rejected' } : a)
      )
    }
  }

  return (
    <div className="min-h-screen bg-surface font-sans">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-text-primary" />
          </button>
          <div>
            <p className="font-bold text-[15px] text-text-primary">Applicants</p>
            <p className="text-[11px] text-text-secondary">{post?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[11px] font-semibold text-text-primary">
            {slotsRemaining} open
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border bg-white sticky top-14 z-40">
        {['all', 'pending', 'selected', 'rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[12px] font-medium capitalize transition-all ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary'
            }`}
          >
            {tab}
            {tabCounts[tab] > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary'
              }`}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Applicant list */}
      {!isLoading && (
        <div>
          {filteredApplicants.map(applicant => (
            <div key={applicant.id} className="bg-white border-b border-border">

              {/* Clickable profile area */}
              <div
                className="flex items-start gap-3 p-4 cursor-pointer active:bg-surface transition-colors"
                onClick={() => navigate(`/post/${postId}/ask-worker/${applicant.worker_id}`)}
              >
                {/* Photo */}
                <div className="relative flex-shrink-0">
                  <img
                    src={applicant.photo_url || '/assets/default-avatar.png'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-border"
                  />
                  <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                    applicant.trust_score >= 70 ? 'bg-blue-600' :
                    applicant.trust_score >= 40 ? 'bg-green-500' :
                    applicant.trust_score >= 20 ? 'bg-yellow-400' :
                    'bg-gray-400'
                  }`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[14px] text-text-primary">{applicant.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      applicant.trust_badge === 'elite' ? 'badge-elite' :
                      applicant.trust_badge === 'trusted' ? 'badge-trusted' :
                      applicant.trust_badge === 'growing' ? 'badge-growing' :
                      'badge-new'
                    }`}>
                      {applicant.trust_badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[12px] text-primary font-medium">
                      ★ {applicant.avg_rating || 'New'}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {applicant.total_jobs} jobs done
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      📍 {applicant.distance_km} km
                    </span>
                  </div>

                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {applicant.skills?.slice(0, 3).map(skill => (
                      <span key={skill} className="text-[10px] bg-surface border border-border text-text-secondary px-2 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>

                  {applicant.note && (
                    <p className="text-[12px] text-text-secondary mt-1.5 italic line-clamp-1">
                      "{applicant.note}"
                    </p>
                  )}

                  {applicant.counter_wage && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] bg-warning bg-opacity-10 text-warning font-medium px-2 py-0.5 rounded-full">
                        💰 Counter offer: ₹{applicant.counter_wage}/day
                      </span>
                    </div>
                  )}

                  <p className="text-[10px] text-text-disabled mt-1">
                    Applied {timeAgo(applicant.applied_at)}
                  </p>
                </div>
              </div>

              {/* Action buttons — pending only */}
              {applicant.status === 'applied' && slotsRemaining > 0 && (
                <div className="flex gap-2 px-4 pb-3">
                  <button
                    onClick={() => handleReject(applicant.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-border rounded-xl py-2.5 text-[13px] text-text-secondary font-medium active:bg-surface"
                  >
                    <X size={16} className="text-danger" />
                    Pass
                  </button>
                  <button
                    onClick={() => handleSelect(applicant.id, applicant.worker_id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl py-2.5 text-[13px] font-bold"
                  >
                    <Check size={16} className="text-white" />
                    Hire
                  </button>
                </div>
              )}

              {/* Status badge for actioned applicants */}
              {applicant.status !== 'applied' && (
                <div className="px-4 pb-3">
                  <span className={`text-[11px] font-medium px-3 py-1.5 rounded-full ${
                    applicant.status === 'selected'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : applicant.status === 'rejected'
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-surface text-text-secondary border border-border'
                  }`}>
                    {applicant.status === 'selected' ? '✓ Hired' :
                     applicant.status === 'rejected' ? '✗ Passed' :
                     applicant.status}
                  </span>
                </div>
              )}

            </div>
          ))}

          {/* Empty state */}
          {filteredApplicants.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-3 border border-border">
                <Users size={28} className="text-text-disabled" />
              </div>
              <p className="font-semibold text-text-primary text-[14px]">
                {activeTab === 'all' ? 'No applicants yet' :
                 activeTab === 'pending' ? 'No pending applicants' :
                 activeTab === 'selected' ? 'No one hired yet' :
                 'No passed applicants'}
              </p>
              <p className="text-text-secondary text-[12px] mt-1">
                {activeTab === 'all'
                  ? 'Your post is live. Workers nearby will see it soon.'
                  : 'Switch tabs to see other applicants.'
                }
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
