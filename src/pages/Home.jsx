import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, ChevronDown, Bell,
  Briefcase, Heart, Star,
  MessageCircle, Share2, Bookmark, MoreHorizontal,
  Wrench, Leaf, ChefHat, Truck, Hammer, Scissors, BookOpen,
  LogOut, User, Settings, Plus, Globe, Navigation,
  Home as HomeIcon, Compass, MessageSquare, UserCircle,
  Sparkles, Check, UserCheck, Clock, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// ─── Utilities ────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '2h ago';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Story / Category Circles ─────────────────────────────────────────────────
const STORIES = [
  { id: 'all',       label: 'All',        emoji: '🌐',  bg: ['#2B7EC1','#1A4F7A'], active: true  },
  { id: 'for_me',    label: 'For Me',     emoji: '✨',  bg: ['#8B5CF6','#6D28D9'], active: false },
  { id: 'part_time', label: 'Part Time',  emoji: '📅',  bg: ['#F59E0B','#D97706'], active: false },
  { id: 'volunteer', label: 'Volunteer',  emoji: '🌿',  bg: ['#10B981','#059669'], active: false },
  { id: 'no_exp',    label: 'No Exp',     emoji: '🔰',  bg: ['#0EA5E9','#0284C7'], active: false },
  { id: 'urgent',    label: 'Urgent',     emoji: '🚨',  bg: ['#EF4444','#DC2626'], active: false },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, photoUrl, size = 40, className = '' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const palette = ['#2B7EC1','#6D28D9','#059669','#D97706','#DC2626','#0284C7'];
  const ci = name ? name.charCodeAt(0) % palette.length : 0;

  if (photoUrl && photoUrl.startsWith('http')) {
    return (
      <img src={photoUrl} alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${palette[ci]}, ${palette[(ci+2)%palette.length]})` }}>
      {initials}
    </div>
  );
}

// ─── Story Circle ─────────────────────────────────────────────────────────────
function StoryCircle({ story, active, onClick }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 transition-transform active:scale-95">
      <div className="relative">
        {/* ring */}
        <div className="rounded-full p-[2.5px]"
          style={{
            background: active
              ? `linear-gradient(135deg, ${story.bg[0]}, ${story.bg[1]})`
              : '#E2E8F0',
          }}>
          <div className="w-[54px] h-[54px] rounded-full bg-white flex items-center justify-center text-[22px]"
            style={{ border: '2px solid #fff' }}>
            {story.emoji}
          </div>
        </div>
      </div>
      <span className={`text-[10.5px] font-semibold max-w-[58px] text-center leading-tight ${active ? 'text-primary' : 'text-text-secondary'}`}>
        {story.label}
      </span>
    </button>
  );
}

// ─── AI / Original Tab Switcher ───────────────────────────────────────────────
function AiTabSwitcher({ tab, onChange }) {
  return (
    <div className="flex items-center gap-0">
      <button onClick={() => onChange('ai')}
        className="flex items-center gap-1 px-3 py-1 text-[12px] font-bold transition-all relative"
        style={{ color: tab === 'ai' ? '#2B7EC1' : '#94A3B8' }}>
        <Sparkles size={12} className={tab === 'ai' ? 'text-amber-400' : 'text-slate-300'} />
        AI Improved
        {tab === 'ai' && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary" />}
      </button>
      <button onClick={() => onChange('original')}
        className="flex items-center gap-1 px-3 py-1 text-[12px] font-bold transition-all relative"
        style={{ color: tab === 'original' ? '#0D1B2A' : '#94A3B8' }}>
        Original
        {tab === 'original' && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-text-primary" />}
      </button>
    </div>
  );
}

// ─── Tag Chip ─────────────────────────────────────────────────────────────────
function TagChip({ tag }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ color: tag.color, background: tag.bg }}>
      {tag.icon || null}{tag.label}
    </span>
  );
}

// ─── Matching Neighbours Strip ────────────────────────────────────────────────
function MatchingNeighbours({ workers }) {
  if (!workers || workers.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[12px] font-bold text-text-secondary mb-2">Matching Neighbors</p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {workers.map(w => (
          <div key={w.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <Avatar name={w.name} photoUrl={w.photo_url} size={52} />
            <p className="text-[11px] font-semibold text-text-primary text-center">{w.name}</p>
            <div className="flex items-center gap-0.5">
              <Star size={9} fill="#F59E0B" className="text-amber-400" />
              <span className="text-[10px] text-text-secondary">{w.worker_rating || 'New'}</span>
            </div>
            <button className="px-3.5 py-1 rounded-full text-[11px] font-bold border border-primary text-primary transition-colors hover:bg-primary hover:text-white">
              Invite
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── My Active Post Card ──────────────────────────────────────────────────────
function ActivePostCard({ post }) {
  const [tab, setTab] = useState('ai');
  
  if (!post) return null;

  return (
    <div className="mx-3 mt-3 rounded-2xl bg-white overflow-hidden"
      style={{ border: '1px solid #E2EDF6', boxShadow: '0 2px 16px rgba(43,126,193,0.09)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          Your Active Post
        </span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
          Open · {post.applications_count || 0} applied
        </span>
      </div>

      {/* Tab switcher */}
      <div className="px-2 border-b border-[#F0F4F8]">
        <AiTabSwitcher tab={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-[12.5px] text-text-secondary leading-relaxed">
          {tab === 'ai' ? (post.ai_text || post.aiText) : (post.raw_input_text || post.originalText)}
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{post.type}</span>
          <span className="text-[12px] font-bold text-primary">{post.wage}</span>
        </div>
      </div>

      {/* Manage button */}
      <div className="px-4 pb-3">
        <button className="w-full py-2.5 rounded-xl text-[13px] font-bold text-primary border border-primary transition-all hover:bg-blue-50 active:scale-[0.98]">
          Manage post
        </button>
      </div>

      {/* Matching neighbours */}
      {post.suggested_workers && post.suggested_workers.length > 0 && (
        <div className="px-4 pb-4 border-t border-[#F5F8FC] pt-3">
          <MatchingNeighbours workers={post.suggested_workers.slice(0, 3)} />
        </div>
      )}
    </div>
  );
}

// ─── Post Card (feed) ─────────────────────────────────────────────────────────
function PostCard({ post, isOwnPost, onLike, onSave }) {
  const [tab, setTab] = useState('ai');
  const navigate = useNavigate();
  const isVolunteer = post.type === 'volunteer';

  const [toast, setToast] = useState(null)
  const [showRagHistory, setShowRagHistory] = useState(false)
  const [ragHistory, setRagHistory] = useState([])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const loadRagHistory = async () => {
    const accessToken = localStorage.getItem('token');
    const res = await fetch(
      `${import.meta.env.VITE_API_URL || ''}/api/rag/history?post_id=${post.id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await res.json()
    setRagHistory(data.sessions || [])
    setShowRagHistory(true)
  }

  const handleWorkerCardClick = (worker, postId) => {
    // Navigate to RAG chat screen for this worker and post
    navigate(`/post/${postId}/ask-worker/${worker.id}`)
  }

  const handleInviteWorker = async (workerId, postId) => {
    const accessToken = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL}/api/rag/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ worker_id: workerId, post_id: postId })
    })
    // Show brief success toast — "Invite sent"
    showToast('Invite sent to worker')
  }

  return (
    <div className="bg-white" style={{ borderBottom: '8px solid #F0F4F8' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.poster?.name} photoUrl={post.poster?.photo_url} size={40} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[14px] text-text-primary">{post.poster?.name}</span>
              {post.poster?.role && (
                <span className="text-[10px] font-semibold text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {post.poster.role}
                </span>
              )}
              {(post.poster?.worker_rating || post.poster?.poster_rating) && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                  <Star size={10} fill="#F59E0B" className="text-amber-400" />
                  {post.poster.worker_rating || post.poster.poster_rating}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} className="text-text-secondary" />
              <span className="text-[11px] text-text-secondary">{timeAgo(post.timePosted || post.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwnPost && (
            <button
              onClick={loadRagHistory}
              className="text-[11px] border border-primary text-primary px-3 py-1 rounded-full whitespace-nowrap"
            >
              👥 Workers asked
            </button>
          )}
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <MoreHorizontal size={18} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* ── Full-width Image (if post has image) ── */}
      {post.images && post.images.length > 0 ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <img src={post.images[0]} alt="Post" className="w-full h-full object-cover" />
        </div>
      ) : post.hasImage ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <div className="w-full h-full flex items-center justify-center text-[72px]"
            style={{ background: post.imageBg }}>
            {post.imageEmoji}
          </div>
        </div>
      ) : null}

      {/* ── AI / Original Tab switcher ── */}
      <div className="px-3 pt-3 border-b border-[#F5F8FC]">
        <AiTabSwitcher tab={tab} onChange={setTab} />
      </div>

      {/* ── Post content ── */}
      <div className="px-4 py-3">
        <p className="text-[13.5px] text-text-primary leading-relaxed">
          {tab === 'ai' ? (post.aiText || post.ai_text) : (post.raw_input_text || post.originalText)}
        </p>

        {/* Wage chip */}
        {post.wage && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-primary bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              💰 {post.wage}
            </span>
          </div>
        )}
      </div>

      {/* ── Tags ── */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {post.tags.map((tag, i) => <TagChip key={i} tag={tag} />)}
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex items-center gap-1">
          {/* CTA button */}
          {!isOwnPost && (
            <button
              className="px-4 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 mr-2"
              style={
                isVolunteer
                  ? { background: 'linear-gradient(135deg,#059669,#065F46)', color:'#fff', boxShadow:'0 3px 10px rgba(5,150,105,0.35)' }
                  : { background: 'linear-gradient(135deg,#2B7EC1,#1A4F7A)', color:'#fff', boxShadow:'0 3px 10px rgba(43,126,193,0.35)' }
              }>
              {post.ctaLabel || (isVolunteer ? 'I will help' : 'I\'m interested')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onSave(post.id)} className="transition-all active:scale-90">
            <Bookmark size={20}
              className={post.saved ? 'text-primary' : 'text-text-secondary'}
              fill={post.saved ? '#2B7EC1' : 'none'} />
          </button>
          <button className="transition-all active:scale-90">
            <Share2 size={20} className="text-text-secondary" />
          </button>
          <button className="transition-all active:scale-90">
            <Globe size={20} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* ── Matching Neighbours ── */}
      {isOwnPost && post.suggested_workers && post.suggested_workers.length > 0 && (
        <div className="border-t border-border pt-3 pb-4">

          {/* Section header */}
          <div className="flex justify-between items-center px-4 mb-3">
            <span className="text-[12px] font-semibold text-text-primary">
              Suggested workers
            </span>
            <span 
              className="text-[11px] text-primary cursor-pointer"
              onClick={() => navigate(`/post/${post.id}/workers`)}
            >
              See all
            </span>
          </div>

          {/* Worker cards — Instagram suggestion style */}
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
            {post.suggested_workers.map(worker => (
              <div
                key={worker.id}
                className="flex flex-col items-center bg-surface border border-border rounded-2xl p-3 min-w-[110px] cursor-pointer active:scale-95 transition-transform"
                onClick={() => handleWorkerCardClick(worker, post.id)}
              >
                {/* Photo */}
                <div className="relative mb-2">
                  <img
                    src={worker.photo_url || '/assets/default-avatar.png'}
                    className="w-12 h-12 rounded-full object-cover border-2 border-border"
                  />
                  {/* Trust badge dot */}
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    worker.trust_score >= 70 ? 'bg-blue-600' :
                    worker.trust_score >= 40 ? 'bg-green-500' :
                    worker.trust_score >= 20 ? 'bg-yellow-400' :
                    'bg-gray-400'
                  }`} />
                </div>

                {/* Name */}
                <p className="text-[12px] font-bold text-text-primary text-center truncate w-full">
                  {worker.name.split(' ')[0]}
                </p>

                {/* Rating */}
                <p className="text-[11px] text-primary font-medium">
                  ★ {worker.trust_score_display}
                </p>

                {/* Distance */}
                <p className="text-[10px] text-text-secondary mb-2">
                  {worker.distance_km} km
                </p>

                {/* Invite button */}
                <button
                  className="w-full border border-primary text-primary text-[11px] font-semibold rounded-lg py-1.5 active:bg-primary active:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleInviteWorker(worker.id, post.id)
                  }}
                >
                  Invite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0D1B2A] text-white text-[13px] font-medium px-5 py-2.5 rounded-full shadow-lg animate-fade-in-up">
          {toast}
        </div>
      )}

      {/* RAG History Bottom Sheet */}
      {showRagHistory && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowRagHistory(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          <div
            className="relative w-full bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(43,126,193,0.15)] max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="px-4 py-3 border-b border-border">
              <p className="font-bold text-[15px] text-text-primary">
                Workers you asked about
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                For this post only — visible only to you
              </p>
            </div>

            {ragHistory.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-text-secondary text-[13px]">
                  No worker enquiries yet for this post
                </p>
              </div>
            ) : (
              <div className="px-4 py-2 flex flex-col gap-3 pb-6">
                {ragHistory.map(session => (
                  <div
                    key={session.id}
                    className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3 cursor-pointer"
                    onClick={() => {
                      setShowRagHistory(false)
                      navigate(`/post/${post.id}/ask-worker/${session.worker_id}`)
                    }}
                  >
                    <img
                      src={session.worker_photo || '/assets/default-avatar.png'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[13px] text-text-primary">
                        {session.worker_name}
                      </p>
                      <p className="text-[11px] text-text-secondary truncate">
                        {session.last_message || 'No messages yet'}
                      </p>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        {session.total_questions || 0} questions · {session.credits_used || 0} credits used
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-text-secondary">
                        {timeAgo(session.created_at)}
                      </span>
                      <span className="text-[11px] text-primary font-medium">
                        Re-open →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notification Badge ───────────────────────────────────────────────────────
function NotifBadge({ count, color = '#E74C3C' }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
      style={{ background: color }}>
      {count > 9 ? '9+' : count}
    </span>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonPostCard() {
  return (
    <div className="bg-white" style={{ borderBottom: '8px solid #F0F4F8' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="skeleton rounded-full w-10 h-10"></div>
          <div className="flex flex-col gap-1.5">
            <div className="skeleton h-4 w-32 rounded"></div>
            <div className="skeleton h-3 w-20 rounded"></div>
          </div>
        </div>
      </div>
      <div className="w-full skeleton" style={{ aspectRatio: '4/3' }}></div>
      <div className="px-4 py-4 flex flex-col gap-2">
        <div className="skeleton h-4 w-full rounded"></div>
        <div className="skeleton h-4 w-5/6 rounded"></div>
        <div className="skeleton h-4 w-4/6 rounded"></div>
      </div>
    </div>
  );
}

// ─── Main Home ────────────────────────────────────────────────────────────────
export function Home() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [radius, setRadius] = useState(15);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const profileRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function h(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 1. Auth token check
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // 4. Silent location update on mount
  useEffect(() => {
    if (navigator.geolocation && token) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await api.patch('/api/feed/location', {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
          } catch (err) {
            console.error('Location update error:', err);
          }
        },
        () => console.log('Location permission denied — using stored location')
      );
    }
  }, [token]);

  // 2. Load home screen
  const loadHomeScreen = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(false);
    try {
      const [feedData, activePostData] = await Promise.all([
        api.get(`/api/feed?filter=${activeFilter}&radius=${radius}`),
        api.get(`/api/feed/active-post`)
      ]);

      let feedPosts = feedData.posts || [];

      // Pin own active post at top if exists
      if (activePostData.post) {
        feedPosts = feedPosts.filter(p => p.id !== activePostData.post.id);
        feedPosts = [activePostData.post, ...feedPosts];
      }

      setPosts(feedPosts);
    } catch (err) {
      console.error('Feed load error:', err);
      setPosts([]);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. When filter changes
  useEffect(() => {
    loadHomeScreen();
  }, [activeFilter, radius, token]);

  const handleLike = id => setPosts(p => p.map(x => x.id === id ? { ...x, liked: !x.liked } : x));
  const handleSave = id => setPosts(p => p.map(x => x.id === id ? { ...x, saved: !x.saved } : x));
  const handleLogout = () => { logout(); navigate('/login'); };

  const displayName = user?.name?.split(' ')[0] || user?.username || 'Neighbour';
  const areaName   = user?.area_name || 'Anna Nagar';

  return (
    <div className="min-h-screen font-sans" style={{ background: '#F0F4F8' }}>

      {/* ═══ STICKY TOP BAR ═══════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-50 bg-white"
        style={{ boxShadow: '0 1px 12px rgba(43,126,193,0.08)', borderBottom: '1px solid #EEF3F8' }}>
        <div className="flex items-center justify-between px-4 py-3">

          {/* Location */}
          <button className="flex items-center gap-1.5 active:opacity-70">
            <MapPin size={16} className="text-primary flex-shrink-0" />
            <div>
              <span className="font-bold text-[15px] text-text-primary">{areaName}</span>
              <ChevronDown size={13} className="inline-block ml-0.5 text-text-secondary" />
            </div>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            {/* Notification */}
            <button id="notif-btn" className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface transition-colors">
              <Bell size={21} className="text-text-primary" strokeWidth={1.8} />
              <NotifBadge count={1} />
            </button>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button id="profile-avatar-btn" onClick={() => setShowProfileMenu(v => !v)}>
                <Avatar name={user?.name} photoUrl={user?.photo_url} size={34} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-2xl z-50 overflow-hidden"
                  style={{ boxShadow:'0 8px 32px rgba(43,126,193,0.18)', border:'1px solid #E8EFF5' }}>
                  <div className="px-4 py-3 border-b border-[#F0F4F8]">
                    <p className="font-bold text-[14px] text-text-primary">{displayName}</p>
                    <p className="text-[12px] text-text-secondary">@{user?.username}</p>
                  </div>
                  <div className="py-1">
                    <button id="menu-profile" className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface text-[13px] text-text-primary">
                      <User size={14} className="text-text-secondary" /> Profile
                    </button>
                    <button id="menu-settings" className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface text-[13px] text-text-primary">
                      <Settings size={14} className="text-text-secondary" /> Settings
                    </button>
                    <button id="menu-logout" onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-[13px] text-danger">
                      <LogOut size={14} className="text-danger" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Story / Category circles ── */}
        <div className="flex gap-3.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {STORIES.map(s => (
            <StoryCircle key={s.id} story={s} active={activeFilter === s.id}
              onClick={() => setActiveFilter(s.id)} />
          ))}
        </div>
      </div>

      {/* ═══ SCROLL BODY ══════════════════════════════════════════════════════ */}
      <div className="pb-28">

        {/* 8. Error state */}
        {error && (
          <div className="mx-4 mt-6 bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-200">
            <p className="text-[15px] font-bold text-slate-700 mb-4">⚠️ Could not load posts</p>
            <button onClick={loadHomeScreen} className="btn-outline">
              [ Try again ]
            </button>
          </div>
        )}

        {/* 6. Loading state */}
        {isLoading && !error && (
          <div className="mt-2">
            <SkeletonPostCard />
            <SkeletonPostCard />
            <SkeletonPostCard />
          </div>
        )}

        {/* Feed content */}
        {!isLoading && !error && posts.length > 0 && (
          <div className="mt-2">
            {posts.map(post => {
              if (post.is_own_post) {
                // Not specified explicitly to use ActivePostCard, but 
                // prompt mentioned: "Pass isOwnPost={post.is_own_post} — do not compute it on frontend anymore, trust the backend value."
                // I will pass it to PostCard as requested.
                // Wait, if ActivePostCard is used, it should be top of feed? Yes, loadHomeScreen places it at index 0.
                // I will just use PostCard for all, but pass isOwnPost as requested! 
                // But the original code had ActivePostCard for MY_POST. 
                // Let's keep ActivePostCard if it's the own post (with applied count etc) or just PostCard?
                // The prompt literally said: "Pass isOwnPost={post.is_own_post} — do not compute it on frontend anymore, trust the backend value."
                // I will use PostCard for everything and remove ActivePostCard completely? 
                // Wait, in my loadHomeScreen I did: "if (activePostData.post) { feedPosts = [activePostData.post, ...feedPosts] }"
                // So it's in the posts array. I will use ActivePostCard if is_own_post, else PostCard.
                // But the prompt says "Pass isOwnPost={post.is_own_post} [to PostCard]"
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    isOwnPost={post.is_own_post}
                    onLike={handleLike}
                    onSave={handleSave}
                  />
                );
              }
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwnPost={post.is_own_post}
                  onLike={handleLike}
                  onSave={handleSave}
                />
              );
            })}

            {/* Bottom spacer label */}
            <div className="flex items-center justify-center py-6 gap-2">
              <span className="text-[12px] text-text-disabled font-medium">You're all caught up 🎉</span>
            </div>
          </div>
        )}

        {/* 7. Empty state */}
        {!isLoading && !error && posts.length === 0 && (
          <div className="flex items-center justify-center py-6 gap-2">
            <span className="text-[12px] text-text-disabled font-medium">You're all caught up 🎉</span>
          </div>
        )}

      </div>

      {/* ═══ FLOATING + BUTTON ═══════════════════════════════════════════════ */}
      <button id="create-post-btn"
        onClick={() => navigate('/post/create')}
        className="fixed z-50 flex items-center justify-center rounded-full transition-all active:scale-90"
        style={{
          bottom: 76, right: 16, width: 52, height: 52,
          background: 'linear-gradient(135deg,#2B7EC1,#1A4F7A)',
          boxShadow: '0 6px 20px rgba(43,126,193,0.45)',
        }}>
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>

      {/* ═══ BOTTOM NAVIGATION ═══════════════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white"
        style={{ boxShadow:'0 -1px 16px rgba(43,126,193,0.10)', borderTop:'1px solid #EEF3F8' }}>
        <div className="flex items-center justify-around py-2">
          {[
            { id:'home',    icon:<HomeIcon size={22} />,       label:'Home'   },
            { id:'explore', icon:<Compass size={22} />,        label:'Explore' },
            { id:'chats',   icon:<MessageSquare size={22} />,  label:'Chats',  badge: 2 },
            { id:'profile', icon:<UserCircle size={22} />,     label:'Profile' },
          ].map(nav => {
            const isActive = activeNav === nav.id;
            return (
              <button key={nav.id} id={`nav-${nav.id}`}
                onClick={() => setActiveNav(nav.id)}
                className="flex flex-col items-center gap-0.5 px-4 py-1 relative">
                <span className="relative">
                  <span style={{ color: isActive ? '#2B7EC1' : '#94A3B8' }}>{nav.icon}</span>
                  {nav.badge && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ background:'#E74C3C' }}>
                      {nav.badge}
                    </span>
                  )}
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
  );
}

export default Home;
