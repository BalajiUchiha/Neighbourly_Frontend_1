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
  { id: 'forme',     label: 'For Me',     emoji: '✨',  bg: ['#8B5CF6','#6D28D9'], active: false },
  { id: 'parttime',  label: 'Part Time',  emoji: '📅',  bg: ['#F59E0B','#D97706'], active: false },
  { id: 'volunteer', label: 'Volunteer',  emoji: '🌿',  bg: ['#10B981','#059669'], active: false },
  { id: 'nearby',    label: 'Nearby',     emoji: '📍',  bg: ['#EF4444','#DC2626'], active: false },
  { id: 'skilled',   label: 'Skilled',    emoji: '🔧',  bg: ['#0EA5E9','#0284C7'], active: false },
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

// ─── Mock nearby workers (shown inline mid-feed) ──────────────────────────────
const NEARBY_WORKERS = [
  { id:1, name:'Sana K.',  skill:'Helper',   rating:4.8, photo:null },
  { id:2, name:'Raj M.',   skill:'Gardener', rating:4.9, photo:null },
  { id:3, name:'Priya V.', skill:'Cook',     rating:4.7, photo:null },
  { id:4, name:'Arun S.',  skill:'Plumber',  rating:4.6, photo:null },
  { id:5, name:'Meena R.', skill:'Tailor',   rating:5.0, photo:null },
];

// ─── Mock Posts ───────────────────────────────────────────────────────────────
const INITIAL_POSTS = [
  {
    id: 'p1',
    poster: { name: 'CommunityCenter', role: 'Poster', rating: 4.9, photo: null },
    timePosted: new Date(Date.now() - 2*3600000).toISOString(),
    hasImage: true,
    imageBg: 'linear-gradient(135deg,#134e1d 0%,#1e7a2f 35%,#8BC34A 70%,#e8b84b 100%)',
    imageEmoji: '🌱',
    aiText: 'Volunteer Gardeners Needed — join our community garden project this weekend! Help plant seasonal vegetables for 200+ local families. All skill levels welcome, tools provided.',
    originalText: 'Need people for garden work this Sunday. Come help us plant veggies. Tools available.',
    type: 'volunteer',
    tags: [{ label:'Volunteer', color:'#059669', bg:'#ECFDF5' }, { label:'0.8 km', color:'#2B7EC1', bg:'#EBF5FF', icon:<Navigation size={9}/> }, { label:'Gardening', color:'#6D28D9', bg:'#F5F3FF' }],
    likes: 18, comments: 6, saved: false, liked: false,
    ctaLabel: 'Join',
    distance: '0.8 km',
  },
  {
    id: 'p2',
    poster: { name: 'Arjun Mehta', role: 'Job Poster', rating: 4.7, photo: null },
    timePosted: new Date(Date.now() - 5*3600000).toISOString(),
    hasImage: false,
    aiText: 'Urgently seeking a skilled plumber for a kitchen pipe burst. Competitive pay of ₹500–₹800 for approximately 2 hours of work. Immediate availability required.',
    originalText: 'Pipe leak in kitchen. Need plumber asap. Will pay ₹500.',
    type: 'job',
    tags: [{ label:'Plumbing', color:'#0284C7', bg:'#E0F2FE' }, { label:'Urgent', color:'#D97706', bg:'#FFFBEB' }, { label:'1.2 km', color:'#2B7EC1', bg:'#EBF5FF', icon:<Navigation size={9}/> }],
    wage: '₹500–800',
    likes: 5, comments: 9, saved: false, liked: false,
    ctaLabel: "I'm available",
    distance: '1.2 km',
  },
  {
    id: 'p3',
    poster: { name: 'Divya Rajan', role: 'Poster', rating: 4.5, photo: null },
    timePosted: new Date(Date.now() - 8*3600000).toISOString(),
    hasImage: true,
    imageBg: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 40%,#0f3460 70%,#533483 100%)',
    imageEmoji: '📚',
    aiText: 'Looking for a dedicated home tutor for 8th grade CBSE Maths & Science. Preferred timings: weekdays 5–7 PM. Excellent compensation of ₹8,000/month.',
    originalText: 'Need tutor for my kid. 8th class. Maths and science. Weekday evenings. Good pay.',
    type: 'job',
    tags: [{ label:'Teaching', color:'#6D28D9', bg:'#F5F3FF' }, { label:'CBSE', color:'#059669', bg:'#ECFDF5' }, { label:'2.1 km', color:'#2B7EC1', bg:'#EBF5FF', icon:<Navigation size={9}/> }],
    wage: '₹8,000/month',
    likes: 22, comments: 11, saved: true, liked: false,
    ctaLabel: "I'm interested",
    distance: '2.1 km',
  },
  {
    id: 'p4',
    poster: { name: 'Meena Sundaram', role: 'Volunteer', rating: 4.9, photo: null },
    timePosted: new Date(Date.now() - 1.5*3600000).toISOString(),
    hasImage: false,
    aiText: 'Help needed this Sunday (10 AM–12 PM) to assist an elderly neighbor relocate furniture to the ground floor. Refreshments provided. Your kindness makes a difference 🙏',
    originalText: 'Elderly aunty needs help moving stuff downstairs. This Sunday morning. Tea provided.',
    type: 'volunteer',
    tags: [{ label:'Volunteer', color:'#059669', bg:'#ECFDF5' }, { label:'Moving', color:'#D97706', bg:'#FFFBEB' }, { label:'0.3 km', color:'#2B7EC1', bg:'#EBF5FF', icon:<Navigation size={9}/> }],
    likes: 31, comments: 7, saved: false, liked: false,
    ctaLabel: 'I will help',
    distance: '0.3 km',
  },
];

// ─── Active (My) Post ─────────────────────────────────────────────────────────
const MY_POST = {
  aiText: 'Home Cleaning Help — seeking a reliable helper for a thorough 2BHK apartment cleaning tomorrow morning. Professional approach preferred.',
  originalText: 'Need someone to clean my house tomorrow. 2BHK. Morning time.',
  type: 'Helper',
  wage: '₹500/day',
  time: 'Tomorrow 7AM',
  applied: 3,
};

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
  return (
    <div className="mt-3">
      <p className="text-[12px] font-bold text-text-secondary mb-2">Matching Neighbors</p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {workers.map(w => (
          <div key={w.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <Avatar name={w.name} size={52} />
            <p className="text-[11px] font-semibold text-text-primary text-center">{w.name}</p>
            <div className="flex items-center gap-0.5">
              <Star size={9} fill="#F59E0B" className="text-amber-400" />
              <span className="text-[10px] text-text-secondary">{w.rating}</span>
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
          Open · {post.applied} applied
        </span>
      </div>

      {/* Tab switcher */}
      <div className="px-2 border-b border-[#F0F4F8]">
        <AiTabSwitcher tab={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <h3 className="font-bold text-[14px] text-text-primary leading-snug mb-1">Home Cleaning Help</h3>
        <p className="text-[12.5px] text-text-secondary leading-relaxed">
          {tab === 'ai' ? post.aiText : post.originalText}
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{post.type}</span>
          <span className="text-[12px] font-bold text-primary">{post.wage}</span>
          <span className="text-[11px] font-bold text-amber-600 ml-auto">{post.time}</span>
        </div>
      </div>

      {/* Manage button */}
      <div className="px-4 pb-3">
        <button className="w-full py-2.5 rounded-xl text-[13px] font-bold text-primary border border-primary transition-all hover:bg-blue-50 active:scale-[0.98]">
          Manage post
        </button>
      </div>

      {/* Matching neighbours */}
      <div className="px-4 pb-4 border-t border-[#F5F8FC] pt-3">
        <MatchingNeighbours workers={NEARBY_WORKERS.slice(0, 3)} />
      </div>
    </div>
  );
}

// ─── Inline "More Near You" Worker Strip ──────────────────────────────────────
function NearYouStrip() {
  return (
    <div className="mx-3 my-2 bg-white rounded-2xl px-4 py-3"
      style={{ border: '1px solid #E2EDF6', boxShadow: '0 2px 12px rgba(43,126,193,0.07)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-text-primary flex items-center gap-1.5">
          More near you
          <span className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center text-[9px] text-primary font-black">ⓘ</span>
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
        {NEARBY_WORKERS.map(w => (
          <div key={w.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="relative">
              <Avatar name={w.name} size={54} />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-400" />
            </div>
            <p className="text-[11px] font-semibold text-text-primary text-center">{w.name}</p>
            <p className="text-[10px] text-text-secondary -mt-1">{w.skill}</p>
            <div className="flex items-center gap-0.5">
              <Star size={9} fill="#F59E0B" className="text-amber-400" />
              <span className="text-[10px] text-text-secondary">{w.rating}</span>
            </div>
            <button className="px-3.5 py-1 rounded-full text-[11px] font-bold border border-primary text-primary hover:bg-primary hover:text-white transition-colors">
              Invite
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Post Card (feed) ─────────────────────────────────────────────────────────
function PostCard({ post, onLike, onSave }) {
  const [tab, setTab] = useState('ai');
  const isVolunteer = post.type === 'volunteer';

  return (
    <div className="bg-white" style={{ borderBottom: '8px solid #F0F4F8' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Avatar name={post.poster.name} size={40} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[14px] text-text-primary">{post.poster.name}</span>
              <span className="text-[10px] font-semibold text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full">
                {post.poster.role}
              </span>
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                <Star size={10} fill="#F59E0B" className="text-amber-400" />
                {post.poster.rating}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} className="text-text-secondary" />
              <span className="text-[11px] text-text-secondary">{timeAgo(post.timePosted)}</span>
            </div>
          </div>
        </div>
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
          <MoreHorizontal size={18} className="text-text-secondary" />
        </button>
      </div>

      {/* ── Full-width Image (if post has image) ── */}
      {post.hasImage && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <div className="w-full h-full flex items-center justify-center text-[72px]"
            style={{ background: post.imageBg }}>
            {post.imageEmoji}
          </div>
        </div>
      )}

      {/* ── AI / Original Tab switcher ── */}
      <div className="px-3 pt-3 border-b border-[#F5F8FC]">
        <AiTabSwitcher tab={tab} onChange={setTab} />
      </div>

      {/* ── Post content ── */}
      <div className="px-4 py-3">
        <p className="text-[13.5px] text-text-primary leading-relaxed">
          {tab === 'ai' ? post.aiText : post.originalText}
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
          <button
            className="px-4 py-2 rounded-xl text-[13px] font-bold transition-all active:scale-95 mr-2"
            style={
              isVolunteer
                ? { background: 'linear-gradient(135deg,#059669,#065F46)', color:'#fff', boxShadow:'0 3px 10px rgba(5,150,105,0.35)' }
                : { background: 'linear-gradient(135deg,#2B7EC1,#1A4F7A)', color:'#fff', boxShadow:'0 3px 10px rgba(43,126,193,0.35)' }
            }>
            {post.ctaLabel}
          </button>
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

// ─── Main Home ────────────────────────────────────────────────────────────────
export function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeStory, setActiveStory] = useState('all');
  const [posts, setPosts] = useState(INITIAL_POSTS);
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

  const handleLike = id => setPosts(p => p.map(x => x.id === id ? { ...x, liked: !x.liked } : x));
  const handleSave = id => setPosts(p => p.map(x => x.id === id ? { ...x, saved: !x.saved } : x));
  const handleLogout = () => { logout(); navigate('/login'); };

  const displayName = user?.name?.split(' ')[0] || user?.username || 'Neighbour';
  const areaName   = user?.area_name || 'Anna Nagar';

  // Build the feed: [post0, post1, WORKER_STRIP, post2, post3, ...]
  const feedItems = [];
  posts.forEach((post, idx) => {
    feedItems.push({ type: 'post', data: post });
    if (idx === 1) feedItems.push({ type: 'workers' });
  });

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
            <StoryCircle key={s.id} story={s} active={activeStory === s.id}
              onClick={() => setActiveStory(s.id)} />
          ))}
        </div>
      </div>

      {/* ═══ SCROLL BODY ══════════════════════════════════════════════════════ */}
      <div className="pb-28">

        {/* Active Post Card */}
        <ActivePostCard post={MY_POST} />

        {/* Feed */}
        <div className="mt-2">
          {feedItems.map((item, idx) => {
            if (item.type === 'workers') {
              return <NearYouStrip key="workers-strip" />;
            }
            return (
              <PostCard
                key={item.data.id}
                post={item.data}
                onLike={handleLike}
                onSave={handleSave}
              />
            );
          })}
        </div>

        {/* Bottom spacer label */}
        <div className="flex items-center justify-center py-6 gap-2">
          <span className="text-[12px] text-text-disabled font-medium">You're all caught up 🎉</span>
        </div>
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
