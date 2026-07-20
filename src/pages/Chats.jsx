import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, ChevronRight, Star, Clock, AlertCircle,
  Home as HomeIcon, Compass, UserCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../utils/api';
import { timeAgo, formatDate } from '../utils/helpers';

// Helper for initials/avatar fallback
function UserAvatar({ name, photoUrl, size = 44 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const palette = ['#2B7EC1','#6D28D9','#059669','#D97706','#DC2626','#0284C7'];
  const ci = name ? name.charCodeAt(0) % palette.length : 0;

  if (photoUrl) {
    return (
      <img
        src={photoUrl.startsWith('http') || photoUrl.startsWith('data:') || photoUrl.startsWith('blob:')
          ? photoUrl
          : `${import.meta.env.VITE_API_URL || ''}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`
        }
        alt={name}
        className="rounded-full object-cover flex-shrink-0 border border-border"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 border border-border"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${palette[ci]}, ${palette[(ci+2)%palette.length]})`
      }}
    >
      {initials}
    </div>
  );
}

export default function Chats() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/chats');
      if (!res.ok) {
        throw new Error('Failed to fetch your conversations');
      }
      const data = await res.json();
      setChats(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchChats();
    }
  }, [token]);

  const activeNav = 'chats';

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col font-sans pb-24">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50 shadow-sm">
        <p className="font-bold text-[17px] text-text-primary">Chats</p>
        <span className="bg-[#EFF6FF] text-[#2B7EC1] text-[11px] font-bold px-2.5 py-1 rounded-full">
          {chats.length} {chats.length === 1 ? 'chat' : 'chats'}
        </span>
      </div>

      {/* ── List of Chats ── */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-3 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4 bg-white border border-border rounded-2xl flex items-center gap-3">
                <div className="w-11 h-11 rounded-full skeleton" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 skeleton rounded w-1/3" />
                  <div className="h-3 skeleton rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-6 text-center bg-white border border-border rounded-2xl mt-4">
            <AlertCircle size={32} className="text-danger mx-auto mb-2" />
            <p className="font-bold text-[14px] text-text-primary">Error Loading Chats</p>
            <p className="text-[12px] text-text-secondary mt-1">{error}</p>
            <button onClick={fetchChats} className="btn-outline mt-3 text-[12px] py-1.5 px-4 rounded-xl">
              Retry
            </button>
          </div>
        ) : chats.length === 0 ? (
          <div className="card p-8 text-center bg-white border border-border rounded-2xl mt-4">
            <div className="w-14 h-14 bg-blue-50 text-[#2B7EC1] rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={24} />
            </div>
            <p className="font-bold text-[15px] text-[#0D1B2A]">No conversations yet</p>
            <p className="text-[12px] text-text-secondary mt-1 max-w-[240px] mx-auto leading-relaxed">
              When you apply for jobs or workers message you, your conversations will show up here.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="mt-4 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-primary to-primary-dark"
            >
              Browse home feed
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {chats.map(chat => {
              const statusText =
                chat.post_status === 'completed' ? 'Job Completed' :
                chat.work_date_confirmed ? `✓ Confirmed for ${formatDate(chat.work_date)}` :
                chat.bargain_status === 'agreed' ? `Pay Agreed: ₹${chat.agreed_pay}/day` :
                chat.bargain_status === 'in_progress' ? 'Bargaining in progress' :
                'Active conversation';

              const statusColor =
                chat.post_status === 'completed' ? '#64748B' :
                chat.work_date_confirmed ? '#10B981' :
                chat.bargain_status === 'agreed' ? '#2563EB' :
                chat.bargain_status === 'in_progress' ? '#D97706' :
                '#475569';

              const statusBg =
                chat.post_status === 'completed' ? '#F1F5F9' :
                chat.work_date_confirmed ? '#EFF6FF' :
                chat.bargain_status === 'agreed' ? '#EFF6FF' :
                chat.bargain_status === 'in_progress' ? '#FEF3C7' :
                '#F8FAFC';

              return (
                <div
                  key={chat.id}
                  className="card p-3.5 bg-white border border-border rounded-2xl cursor-pointer hover:border-primary active:scale-[0.98] transition-all"
                  onClick={() => navigate(`/chat/${chat.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar name={chat.other_user_name} photoUrl={chat.other_user_photo} size={46} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-[14px] text-text-primary truncate">
                          {chat.other_user_name}
                        </p>
                        <span className="text-[10px] text-text-disabled flex-shrink-0 flex items-center gap-1">
                          <Clock size={10} /> {timeAgo(chat.created_at)}
                        </span>
                      </div>
                      <p className="text-[12px] font-semibold text-primary mt-0.5 truncate">
                        {chat.post_title}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between">
                        <span
                          className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ color: statusColor, background: statusBg }}
                        >
                          {statusText}
                        </span>
                        <ChevronRight size={14} className="text-text-secondary" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white"
        style={{ boxShadow: '0 -1px 16px rgba(43,126,193,0.10)', borderTop: '1px solid #EEF3F8' }}>
        <div className="flex items-center justify-around py-2">
          {[
            { id: 'home',    icon: <HomeIcon size={22} />,      label: 'Home',    path: '/home' },
            { id: 'explore', icon: <Compass size={22} />,       label: 'Explore', path: '/explore' },
            { id: 'chats',   icon: <MessageSquare size={22} />, label: 'Chats',   path: '/chats' },
            { id: 'profile', icon: <UserCircle size={22} />,    label: 'Profile', path: '/profile' },
          ].map(nav => {
            const isActive = activeNav === nav.id;
            return (
              <button key={nav.id} id={`nav-${nav.id}`}
                onClick={() => navigate(nav.path)}
                className="flex flex-col items-center gap-0.5 px-4 py-1 relative">
                <span className="relative">
                  <span style={{ color: isActive ? '#2B7EC1' : '#94A3B8' }}>{nav.icon}</span>
                </span>
                <span className="text-[10px] font-semibold" style={{ color: isActive ? '#2B7EC1' : '#94A3B8' }}>
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
