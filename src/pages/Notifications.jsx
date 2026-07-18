import { ArrowLeft, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { timeAgo } from '../utils/helpers'

export default function Notifications() {
  const navigate = useNavigate()
  const { token } = useAuth()
  
  const [notifications, setNotifications] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetchNotifications()
    }
  }, [token])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
      )
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Failed to mark all read:", err)
    }
  }

  const handleNotificationTap = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/notifications/${notification.id}/read`,
          { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
        )
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (err) {
        console.error("Failed to mark notification as read:", err)
      }
    }

    // Navigate based on reference_type
    const { reference_type, reference_id, type } = notification

    if (reference_type === 'application') {
      if (type === 'application_selected') navigate(`/chat/${reference_id}`)
      else if (type === 'new_applicant') navigate(`/post/${reference_id}/applicants`)
      else navigate(`/post/${reference_id}/applicants`)
    }
    else if (reference_type === 'chat') {
      if (type === 'rate_prompt') navigate(`/chat/${reference_id}/rate`)
      else navigate(`/chat/${reference_id}`)
    }
    else if (reference_type === 'post') {
      navigate(`/post/${reference_id}`)
    }
    else if (reference_type === 'rating') {
      navigate('/profile/trust-score')
    }
  }

  const tabFilters = {
    all: () => true,
    jobs: n => ['job_nearby', 'new_applicant', 'application_selected',
                 'application_rejected', 'work_started', 'work_completed',
                 'work_reminder', 'radius_expanded', 'post_expired'].includes(n.type),
    chat: n => ['chat_message', 'pay_locked', 'work_date_confirmed'].includes(n.type),
    ratings: n => ['rate_prompt', 'review_revealed', 'trust_score_changed'].includes(n.type)
  }

  const filtered = notifications.filter(tabFilters[activeTab] || (() => true))

  const getNotificationIcon = (type) => {
    const map = {
      job_nearby: '📍',
      volunteer_nearby: '🌱',
      new_applicant: '👤',
      application_selected: '✅',
      application_rejected: '❌',
      rag_invited: '🤖',
      chat_message: '💬',
      pay_locked: '💰',
      work_date_confirmed: '📅',
      work_reminder: '⏰',
      work_started: '🚀',
      work_completed: '🎉',
      rate_prompt: '⭐',
      review_revealed: '👁️',
      trust_score_changed: '📊',
      post_expired: '⚠️',
      radius_expanded: '📡',
    }
    return map[type] || '🔔'
  }

  const getNotificationColor = (type) => {
    if (['application_selected', 'work_completed', 'pay_locked'].includes(type))
      return { bg: 'bg-green-50', text: 'text-green-600' }
    if (['application_rejected', 'post_expired'].includes(type))
      return { bg: 'bg-red-50', text: 'text-danger' }
    if (['chat_message', 'rag_invited'].includes(type))
      return { bg: 'bg-blue-50', text: 'text-primary' }
    if (['rate_prompt', 'review_revealed'].includes(type))
      return { bg: 'bg-yellow-50', text: 'text-yellow-600' }
    return { bg: 'bg-surface', text: 'text-text-secondary' }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="hover:opacity-75">
            <ArrowLeft size={20} className="text-text-primary" />
          </button>
          <p className="font-bold text-[15px] text-text-primary">Notifications</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[12px] text-primary font-semibold hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border bg-white sticky top-[45px] z-40 shadow-xs">
        {['all', 'jobs', 'chat', 'ratings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[12px] font-semibold capitalize transition-all ${
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="flex flex-col flex-1 pb-10">
        {isLoading ? (
          <div className="flex flex-col">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-border bg-white">
                <div className="w-10 h-10 rounded-full skeleton flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-full" />
                  <div className="h-2.5 skeleton rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filtered.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleNotificationTap(notification)}
                className={`flex items-start gap-3 px-4 py-3.5 border-b border-border cursor-pointer active:bg-surface transition-colors ${
                  !notification.is_read ? 'bg-blue-50 bg-opacity-40' : 'bg-white'
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  getNotificationColor(notification.type).bg
                }`}>
                  <span className="text-[18px]">
                    {getNotificationIcon(notification.type)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] leading-snug ${
                    !notification.is_read ? 'font-bold text-text-primary' : 'font-medium text-text-primary'
                  }`}>
                    {notification.title}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">
                    {notification.body}
                  </p>
                  <p className="text-[10px] text-text-disabled mt-1">
                    {timeAgo(notification.created_at)}
                  </p>
                </div>

                {/* Unread dot */}
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 px-8 text-center flex-1 bg-white">
                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 border border-border">
                  <Bell size={28} className="text-text-disabled" />
                </div>
                <p className="font-semibold text-text-primary text-[14px]">No notifications yet</p>
                <p className="text-text-secondary text-[12px] mt-1.5 max-w-[240px] leading-relaxed">
                  We will notify you when something happens nearby
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
