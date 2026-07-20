import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, MapPin, Navigation,
  Briefcase, Star, Clock, ChevronRight,
  Home as HomeIcon, Compass, MessageSquare, UserCircle,
  X, Zap, Users, BadgeCheck, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { timeAgo } from '../utils/helpers';

// ─── Utilities ────────────────────────────────────────────────────────────────
const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const API_URL = import.meta.env.VITE_API_URL || '';
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ─── Category Filter Chips ─────────────────────────────────────────────────
const FILTERS = [
  { id: 'all',       label: 'All',       emoji: '🌐' },
  { id: 'jobs',      label: 'Jobs',      emoji: '💼' },
  { id: 'workers',   label: 'Workers',   emoji: '👷' },
  { id: 'urgent',    label: 'Urgent',    emoji: '🚨' },
  { id: 'volunteer', label: 'Volunteer', emoji: '🌿' },
  { id: 'no_exp',    label: 'No Exp',    emoji: '🔰' },
];

// ─── Job Type → Gradient ──────────────────────────────────────────────────────
const JOB_COLORS = {
  cleaning:    ['#06B6D4', '#0891B2'],
  cooking:     ['#F59E0B', '#D97706'],
  gardening:   ['#10B981', '#059669'],
  driving:     ['#8B5CF6', '#6D28D9'],
  teaching:    ['#3B82F6', '#2563EB'],
  carpentry:   ['#92400E', '#78350F'],
  plumbing:    ['#64748B', '#475569'],
  tailoring:   ['#EC4899', '#DB2777'],
  delivery:    ['#F97316', '#EA580C'],
  default:     ['#2B7EC1', '#1A4F7A'],
};

function jobGradient(type) {
  const k = (type || '').toLowerCase();
  const found = Object.keys(JOB_COLORS).find(k2 => k.includes(k2));
  return JOB_COLORS[found || 'default'];
}

// ─── Worker Avatar initials ───────────────────────────────────────────────────
function WorkerAvatar({ name, photoUrl, size = 40 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const palette = ['#2B7EC1','#6D28D9','#059669','#D97706','#DC2626','#0284C7'];
  const ci = name ? name.charCodeAt(0) % palette.length : 0;

  if (photoUrl) {
    return (
      <img src={getImageUrl(photoUrl)} alt={name}
        className="rounded-full object-cover flex-shrink-0 border-2 border-white"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 border-2 border-white"
      style={{
        width: size, height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, ${palette[ci]}, ${palette[(ci+2)%palette.length]})`
      }}>
      {initials}
    </div>
  );
}

// ─── Job Card (strip) ─────────────────────────────────────────────────────────
function JobCard({ post, isActive, onClick }) {
  const [g1, g2] = jobGradient(post.task_type || post.type);
  return (
    <div
      id={`explore-card-${post.id}`}
      onClick={onClick}
      className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.97]"
      style={{
        width: 220,
        background: '#fff',
        border: isActive ? `2px solid ${g1}` : '2px solid transparent',
        boxShadow: isActive
          ? `0 4px 20px ${g1}44`
          : '0 2px 12px rgba(13,46,90,0.10)',
      }}
    >
      {/* Colour bar */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg,${g1},${g2})` }} />

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg,${g1}22,${g2}22)` }}>
            <Briefcase size={16} style={{ color: g1 }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[13px] text-[#0D1B2A] truncate leading-tight">{post.title}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{post.area_name || 'Nearby'}</p>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2.5">
          {(post.pay_per_person || post.wage) && (
            <span className="text-[12px] font-bold text-[#0D1B2A]">
              ₹{post.pay_per_person || post.wage}
            </span>
          )}
          {post.work_date && (
            <span className="flex items-center gap-0.5 text-[11px] text-[#64748B]">
              <Clock size={10} /> {post.work_date}
            </span>
          )}
          {post.no_exp_needed && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">
              No Exp
            </span>
          )}
        </div>

        {/* Poster */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <WorkerAvatar name={post.poster?.name} photoUrl={post.poster?.photo_url} size={22} />
            <span className="text-[11px] text-[#64748B] truncate max-w-[80px]">
              {post.poster?.name?.split(' ')[0]}
            </span>
          </div>
          <span className="text-[10px] text-[#94A3B8]">
            {timeAgo(post.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Worker Card (strip) ───────────────────────────────────────────────────────
function WorkerCard({ worker, isActive, onClick }) {
  const palette = ['#2B7EC1','#6D28D9','#059669'];
  const ci = worker.name ? worker.name.charCodeAt(0) % palette.length : 0;
  const accent = palette[ci];

  return (
    <div
      id={`explore-worker-${worker.id}`}
      onClick={onClick}
      className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all active:scale-[0.97]"
      style={{
        width: 170,
        background: '#fff',
        border: isActive ? `2px solid ${accent}` : '2px solid transparent',
        boxShadow: isActive
          ? `0 4px 20px ${accent}44`
          : '0 2px 12px rgba(13,46,90,0.10)',
      }}
    >
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg,${accent},${palette[(ci+1)%palette.length]})` }} />
      <div className="p-3 flex flex-col items-center text-center">
        <WorkerAvatar name={worker.name} photoUrl={worker.photo_url} size={44} />
        <p className="font-bold text-[13px] text-[#0D1B2A] mt-2 truncate w-full">
          {worker.name?.split(' ')[0]}
        </p>
        <p className="text-[11px] text-[#64748B] truncate w-full">{worker.skills?.[0] || 'Worker'}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star size={10} fill="#F59E0B" className="text-amber-400" />
          <span className="text-[11px] font-semibold text-[#0D1B2A]">{worker.worker_rating || 'New'}</span>
          {worker.distance_km && (
            <span className="text-[10px] text-[#94A3B8]">· {worker.distance_km}km</span>
          )}
        </div>
        <div className="mt-2 w-full">
          <button className="w-full py-1.5 rounded-xl text-[11px] font-bold text-white"
            style={{ background: `linear-gradient(135deg,${accent},${palette[(ci+1)%palette.length]})` }}>
            Invite
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Popup Detail Sheet ───────────────────────────────────────────────────────
function DetailSheet({ item, type, onClose, onNavigate }) {
  if (!item) return null;
  const isJob = type === 'job';
  const [g1, g2] = isJob ? jobGradient(item.task_type || item.type) : ['#2B7EC1', '#1A4F7A'];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full bg-white rounded-t-3xl shadow-2xl pb-8"
        style={{ maxHeight: '70vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Colour accent strip */}
        <div className="h-1 mx-4 rounded-full mb-4" style={{ background: `linear-gradient(90deg,${g1},${g2})` }} />

        <div className="px-5">
          {isJob ? (
            <>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${g1}22,${g2}22)` }}>
                  <Briefcase size={22} style={{ color: g1 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[17px] text-[#0D1B2A] leading-tight">{item.title}</p>
                  <p className="text-[13px] text-[#64748B] mt-0.5">{item.area_name || 'Nearby'}</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <X size={14} className="text-slate-500" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {(item.pay_per_person || item.wage) && (
                  <div className="bg-[#F8FAFC] rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                    <p className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-0.5">Pay</p>
                    <p className="font-bold text-[15px] text-[#0D1B2A]">₹{item.pay_per_person || item.wage}</p>
                  </div>
                )}
                {item.workers_needed && (
                  <div className="bg-[#F8FAFC] rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                    <p className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-0.5">People</p>
                    <p className="font-bold text-[15px] text-[#0D1B2A]">{item.workers_needed}</p>
                  </div>
                )}
                {item.work_date && (
                  <div className="bg-[#F8FAFC] rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                    <p className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-0.5">Date</p>
                    <p className="font-bold text-[13px] text-[#0D1B2A]">{item.work_date}</p>
                  </div>
                )}
                {item.work_time_slot && (
                  <div className="bg-[#F8FAFC] rounded-xl px-3 py-2.5 border border-[#E2E8F0]">
                    <p className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-0.5">Time</p>
                    <p className="font-bold text-[13px] text-[#0D1B2A]">{item.work_time_slot}</p>
                  </div>
                )}
              </div>

              {item.description && (
                <p className="text-[13px] text-[#475569] leading-relaxed mb-4">{item.description}</p>
              )}

              <button
                onClick={() => onNavigate(item)}
                className="w-full py-3.5 rounded-2xl font-bold text-[15px] text-white transition-all active:scale-[0.97]"
                style={{ background: `linear-gradient(135deg,${g1},${g2})`, boxShadow: `0 6px 20px ${g1}55` }}
              >
                I'm Interested →
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <WorkerAvatar name={item.name} photoUrl={item.photo_url} size={60} />
                <div className="flex-1">
                  <p className="font-bold text-[17px] text-[#0D1B2A]">{item.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={12} fill="#F59E0B" className="text-amber-400" />
                    <span className="text-[13px] font-semibold text-[#0D1B2A]">{item.worker_rating || 'New'}</span>
                    {item.distance_km && (
                      <span className="text-[12px] text-[#94A3B8]">· {item.distance_km} km away</span>
                    )}
                  </div>
                  {item.trust_score && (
                    <div className="flex items-center gap-1 mt-1">
                      <BadgeCheck size={12} className="text-blue-500" />
                      <span className="text-[11px] text-blue-600 font-semibold">Trust: {item.trust_score}</span>
                    </div>
                  )}
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center self-start">
                  <X size={14} className="text-slate-500" />
                </button>
              </div>

              {item.skills && item.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.skills.map((skill, i) => (
                    <span key={i} className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB]">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <button
                className="w-full py-3.5 rounded-2xl font-bold text-[15px] text-white transition-all active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg,#2B7EC1,#1A4F7A)', boxShadow: '0 6px 20px rgba(43,126,193,0.4)' }}
              >
                Invite to My Post →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Explore ─────────────────────────────────────────────────────────────
export default function Explore() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const stripRef = useRef(null);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(null); // { id, type: 'job'|'worker' }
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // ── Load data from /api/explore/map ────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setIsLoading(true);
      try {
        let url = '/api/explore/map?radius=15';

        if (userLocation) {
          url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
        } else if (user?.district) {
          url += `&district=${encodeURIComponent(user.district)}`;
        }

        // pass filter for worker query optimisation
        url += `&filter=${activeFilter}`;

        const data = await api.get(url);
        setPosts(data.posts || []);
        setWorkers(data.workers || []);
      } catch (err) {
        console.error('Explore load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token, userLocation, activeFilter]);

  // ── Get user location ────────────────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 13.0827, lng: 80.2707 }) // Chennai default
      );
    } else {
      setUserLocation({ lat: 13.0827, lng: 80.2707 });
    }
  }, []);

  // ── Init Leaflet map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !userLocation || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // User location marker
    const userIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:18px; height:18px; border-radius:50%;
        background:linear-gradient(135deg,#2B7EC1,#1A4F7A);
        border:3px solid white;
        box-shadow:0 2px 8px rgba(43,126,193,0.6);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation]);

  // ── Plot pins whenever posts/workers change ──────────────────────────────────
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const items = getFilteredItems();

    items.forEach(item => {
      const isWorker = item._type === 'worker';
      const lat = item.latitude || item.lat;
      const lng = item.longitude || item.lng;
      if (!lat || !lng) return;

      const [g1, g2] = isWorker ? ['#6D28D9', '#8B5CF6'] : jobGradient(item.task_type || item.type);
      const emoji = isWorker ? '👷' : '💼';

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          position:relative;
          width:40px; height:40px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:linear-gradient(135deg,${g1},${g2});
          box-shadow:0 3px 12px ${g1}66;
          border:2.5px solid white;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer;
        ">
          <span style="transform:rotate(45deg); font-size:16px; line-height:1;">${emoji}</span>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .on('click', () => {
          setActiveCard({ id: item.id, type: isWorker ? 'worker' : 'job' });
          setDetailItem(item);
          setDetailType(isWorker ? 'worker' : 'job');
          // Scroll card strip
          scrollToCard(item.id, isWorker ? 'worker' : 'job');
        });

      markersRef.current.push(marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, workers, activeFilter, search, mapInstanceRef.current]);

  // ── Filtered items ──────────────────────────────────────────────────────────
  const getFilteredItems = useCallback(() => {
    let items = [];

    if (activeFilter !== 'workers') {
      let filtered = posts;
      if (activeFilter === 'jobs') filtered = posts;
      else if (activeFilter === 'urgent') filtered = posts.filter(p => p.type === 'urgent');
      else if (activeFilter === 'volunteer') filtered = posts.filter(p => p.type === 'volunteer');
      else if (activeFilter === 'no_exp') filtered = posts.filter(p => p.no_exp_needed);

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(p =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.area_name || '').toLowerCase().includes(q)
        );
      }

      items = [...items, ...filtered.map(p => ({ ...p, _type: 'job' }))];
    }

    if (activeFilter === 'all' || activeFilter === 'workers') {
      let wFiltered = workers;
      if (search) {
        const q = search.toLowerCase();
        wFiltered = workers.filter(w =>
          (w.name || '').toLowerCase().includes(q) ||
          (w.skills || []).some(s => s.toLowerCase().includes(q))
        );
      }
      items = [...items, ...wFiltered.map(w => ({ ...w, _type: 'worker' }))];
    }

    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, workers, activeFilter, search]);

  const filteredItems = getFilteredItems();
  const jobItems = filteredItems.filter(i => i._type === 'job');
  const workerItems = filteredItems.filter(i => i._type === 'worker');
  const showItems = activeFilter === 'workers' ? workerItems : (activeFilter === 'all' ? filteredItems : jobItems);

  // ── Scroll card strip to item ───────────────────────────────────────────────
  function scrollToCard(id, type) {
    const cardEl = document.getElementById(
      type === 'worker' ? `explore-worker-${id}` : `explore-card-${id}`
    );
    if (cardEl && stripRef.current) {
      cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // ── Center map on item ───────────────────────────────────────────────────────
  function centerOnItem(item) {
    const lat = item.latitude || item.lat;
    const lng = item.longitude || item.lng;
    if (lat && lng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 15, { animate: true, duration: 0.8 });
    }
  }

  // ── Navigate to center ────────────────────────────────────────────────────────
  function recenter() {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { animate: true, duration: 0.8 });
    }
  }

  const activeNav = 'explore';

  return (
    <div id="explore-screen" className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#F0F4F8' }}>

      {/* ═══ MAP AREA (top 70%) ═════════════════════════════════════════════════ */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>

        {/* Map container */}
        <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 1 }} />

        {/* ── Top bar overlaid on map ── */}
        <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-12 pb-3 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(13,46,90,0.72) 0%, transparent 100%)' }}>
          <div className="flex items-center gap-2.5 pointer-events-auto">
            {/* Search box */}
            <div className="bg-white rounded-2xl px-3.5 py-2.5 flex items-center gap-2 shadow-lg flex-1"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <Search size={15} className="text-[#94A3B8] flex-shrink-0" />
              <input
                id="explore-search"
                type="text"
                placeholder="Search jobs or workers nearby..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-[13px] font-medium text-[#0D1B2A] placeholder-[#94A3B8] outline-none flex-1 min-w-0"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X size={13} className="text-[#94A3B8]" />
                </button>
              )}
            </div>

            {/* Filter button */}
            <button
              id="explore-filter-btn"
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
              style={{
                background: 'linear-gradient(135deg,#2B7EC1,#1A4F7A)',
                boxShadow: '0 4px 16px rgba(43,126,193,0.45)'
              }}>
              <SlidersHorizontal size={18} className="text-white" />
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1 pointer-events-auto">
            {FILTERS.map(f => {
              const isAct = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  id={`explore-filter-${f.id}`}
                  onClick={() => setActiveFilter(f.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold flex-shrink-0 transition-all active:scale-95"
                  style={{
                    background: isAct
                      ? 'linear-gradient(135deg,#2B7EC1,#1A4F7A)'
                      : 'rgba(255,255,255,0.92)',
                    color: isAct ? '#fff' : '#0D1B2A',
                    boxShadow: isAct
                      ? '0 2px 10px rgba(43,126,193,0.5)'
                      : '0 1px 6px rgba(0,0,0,0.10)',
                    border: isAct ? 'none' : '1px solid rgba(255,255,255,0.5)',
                  }}>
                  <span>{f.emoji}</span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Recenter button ── */}
        <button
          id="explore-recenter"
          onClick={recenter}
          className="absolute right-4 z-30 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90"
          style={{
            bottom: 16,
            background: 'white',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
          <Navigation size={18} className="text-[#2B7EC1]" />
        </button>

        {/* ── Stats pill ── */}
        <div className="absolute left-4 z-30 pointer-events-none"
          style={{ bottom: 16 }}>
          <div className="flex items-center gap-1.5 bg-white rounded-2xl px-3.5 py-2"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[12px] font-bold text-[#0D1B2A]">
              {jobItems.length} jobs · {workerItems.length} workers
            </span>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center"
            style={{ background: 'rgba(240,244,248,0.7)' }}>
            <div className="bg-white rounded-2xl px-5 py-3.5 shadow-lg flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#2B7EC1] border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] font-semibold text-[#0D1B2A]">Finding nearby opportunities…</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ CARD STRIP (bottom 30%) ═══════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white"
        style={{
          height: '30%',
          borderTop: '1px solid #EEF3F8',
          boxShadow: '0 -4px 24px rgba(13,46,90,0.10)',
        }}>

        {/* Section header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-[#2B7EC1]" />
            <span className="text-[13px] font-bold text-[#0D1B2A]">
              {activeFilter === 'workers' ? 'Nearby Workers' :
               activeFilter === 'all' ? 'Nearby Opportunities' :
               FILTERS.find(f => f.id === activeFilter)?.label + 's'}
            </span>
            {showItems.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2B7EC1]">
                {showItems.length}
              </span>
            )}
          </div>
          <button
            className="text-[12px] font-bold text-[#2B7EC1] flex items-center gap-0.5 active:opacity-70"
            onClick={() => navigate('/home')}>
            All posts <ChevronRight size={14} />
          </button>
        </div>

        {/* Horizontal scroll strip */}
        <div
          ref={stripRef}
          className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide"
          style={{ height: 'calc(100% - 48px)' }}
        >
          {!isLoading && showItems.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <span className="text-[32px]">🗺️</span>
              <p className="text-[13px] font-semibold text-[#64748B] text-center">
                No {activeFilter === 'workers' ? 'workers' : 'jobs'} found nearby.<br />
                Try adjusting your search.
              </p>
            </div>
          )}

          {showItems.map(item =>
            item._type === 'worker' ? (
              <WorkerCard
                key={`w-${item.id}`}
                worker={item}
                isActive={activeCard?.id === item.id && activeCard?.type === 'worker'}
                onClick={() => {
                  setActiveCard({ id: item.id, type: 'worker' });
                  setDetailItem(item);
                  setDetailType('worker');
                  centerOnItem(item);
                }}
              />
            ) : (
              <JobCard
                key={`j-${item.id}`}
                post={item}
                isActive={activeCard?.id === item.id && activeCard?.type === 'job'}
                onClick={() => {
                  setActiveCard({ id: item.id, type: 'job' });
                  setDetailItem(item);
                  setDetailType('job');
                  centerOnItem(item);
                }}
              />
            )
          )}
        </div>
      </div>

      {/* ═══ BOTTOM NAV ════════════════════════════════════════════════════════ */}
      <nav className="flex-shrink-0 bg-white"
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
                onClick={() => nav.path && navigate(nav.path)}
                className="flex flex-col items-center gap-0.5 px-4 py-1 relative">
                <span className="relative">
                  <span style={{ color: isActive ? '#2B7EC1' : '#94A3B8' }}>{nav.icon}</span>
                </span>
                <span className="text-[10px] font-semibold" style={{ color: isActive ? '#2B7EC1' : '#94A3B8' }}>
                  {nav.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-[#2B7EC1] -mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ═══ DETAIL SHEET ══════════════════════════════════════════════════════ */}
      {detailItem && (
        <DetailSheet
          item={detailItem}
          type={detailType}
          onClose={() => { setDetailItem(null); setActiveCard(null); }}
          onNavigate={() => navigate('/home')}
        />
      )}
    </div>
  );
}
