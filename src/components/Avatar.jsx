import { useState, useRef, useEffect, useMemo } from 'react';
import { X, ChevronLeft, Play, Pause } from 'lucide-react';
import { timeAgo } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

import idleImg from '../assets/avatar/Neutral.png';
import greetingImg from '../assets/avatar/Greeting.png';
import listeningImg from '../assets/avatar/Listening.png';
import confirmingImg from '../assets/avatar/Confirming.png';
import thinkingImg from '../assets/avatar/Thinking.png';
import explainingImg from '../assets/avatar/Explaining.png';
import apologisingImg from '../assets/avatar/Apologising.png';
import happyImg from '../assets/avatar/Happy.png';

const AVATAR_IMAGES = {
  idle: idleImg,
  greeting: greetingImg,
  listening: listeningImg,
  confirming: confirmingImg,
  thinking: thinkingImg,
  explaining: explainingImg,
  apologising: apologisingImg,
  happy: happyImg
};

/* ── Step mapping for the progress bar ── */
const AVATAR_STEPS = ['greeting', 'listening', 'confirming', 'thinking', 'explaining'];
const getStepIndex = (state) => {
  const idx = AVATAR_STEPS.indexOf(state);
  if (idx >= 0) return idx;
  if (state === 'happy') return AVATAR_STEPS.length;
  if (state === 'apologising') return 3;
  return 0;
};

export default function Avatar() {
  const { token, user } = useAuth();

  const [avatarState, setAvatarState] = useState('idle');
  const [mainText, setMainText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const [capturedContent, setCapturedContent] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [smartAction, setSmartAction] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [explanation, setExplanation] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');

  const holdTimer = useRef(null);
  const canvasRef = useRef(null);
  const circlePoints = useRef([]);
  const isDrawing = useRef(false);
  const audioRef = useRef(null);
  const greetingTimeoutRef = useRef(null);
  const subtitleScheduleRef = useRef([]);

  const progressPercent = useMemo(() => {
    const step = getStepIndex(avatarState);
    return Math.min(((step + 1) / AVATAR_STEPS.length) * 100, 100);
  }, [avatarState]);

  useEffect(() => {
    let active = true;
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/api/avatar/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (active) {
            setHistory(data.sessions || []);
          }
        })
        .catch(err => {
          console.error('History fetch error:', err);
        });
    }
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    return () => {
      if (greetingTimeoutRef.current) clearTimeout(greetingTimeoutRef.current);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  useEffect(() => {
    if (avatarState === 'listening' && showFullScreen) {
      const handleResize = () => {
        initCanvas();
      };
      window.addEventListener('resize', handleResize);
      const t = setTimeout(() => {
        initCanvas();
      }, 50);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(t);
      };
    }
  }, [avatarState, showFullScreen]);

  const getPos = (e, touch = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (touch) {
      if (!e.touches || e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawPath = (points) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* ── Drawing Circle Stroke with a vibrant red/purple gradient ── */
    const lineGrad = ctx.createLinearGradient(
      points[0]?.x || 0, points[0]?.y || 0,
      points[points.length - 1]?.x || 0, points[points.length - 1]?.y || 0
    );
    lineGrad.addColorStop(0, '#DC2626');
    lineGrad.addColorStop(0.5, '#9333EA');
    lineGrad.addColorStop(1, '#DC2626');

    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  };

  /* ── Imperative Touch Handlers to support e.preventDefault() on mobile mode ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || avatarState !== 'listening') return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      circlePoints.current = [getPos(e, true)];
      isDrawing.current = true;
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      circlePoints.current.push(getPos(e, true));
      drawPath(circlePoints.current);
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      isDrawing.current = false;
      extractContentFromCircle();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [avatarState, showFullScreen]);

  // Early return if not authenticated, placed after all Hook declarations to satisfy Rules of Hooks.
  if (!token) return null;

  const fetchHistory = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/avatar/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setHistory(data.sessions || []);
    } catch (err) {
      console.error('History refresh error:', err);
    }
  };

  const playAudio = async (type, audioUrlOrPath = null, customSubtitleSchedule = null) => {
    try {
      let audioUrl = audioUrlOrPath;
      let newSubtitleSchedule = customSubtitleSchedule || [];

      if (type === 'pre_written' || type === 'confirming') {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/avatar/audio?type=${type}&language=${user?.preferred_language || 'english'}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        audioUrl = data.audio_url;
        newSubtitleSchedule = data.subtitle_schedule || [];
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (!audioUrl) return;

      const fullAudioUrl = audioUrl.startsWith('http')
        ? audioUrl
        : `${import.meta.env.VITE_API_URL}${audioUrl}`;

      audioRef.current = new Audio(fullAudioUrl);
      subtitleScheduleRef.current = newSubtitleSchedule;

      audioRef.current.addEventListener('timeupdate', () => {
        if (!audioRef.current) return;
        const current = audioRef.current.currentTime;
        const active = subtitleScheduleRef.current?.find(
          s => current >= s.from && current < s.to
        );
        setCurrentSubtitle(active ? active.text : '');
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentSubtitle('');
      });

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Audio error:', err);
      setIsPlaying(false);
    }
  };

  const toggleAudioPlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const openFullScreen = () => {
    setShowFullScreen(true);
    setShowHistory(false);
    setAvatarState('greeting');
    setMainText(`Hi, naan Monica\nUnga AI Spoken English\nPartner`);
    setSubtitleText('Hold and draw a circle around anything you need help with');
    playAudio('pre_written', null);

    if (greetingTimeoutRef.current) clearTimeout(greetingTimeoutRef.current);
    greetingTimeoutRef.current = setTimeout(() => {
      setAvatarState('listening');
      setMainText('Circle what you need help with');
      setSubtitleText('');
    }, 1500);
  };

  const closeFullScreen = () => {
    setShowFullScreen(false);
    setAvatarState('idle');
    setMainText('');
    setSubtitleText('');
    setCapturedContent('');
    setSessionId(null);
    setRetryCount(0);
    setSmartAction(null);
    if (greetingTimeoutRef.current) clearTimeout(greetingTimeoutRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentSubtitle('');
  };

  const handleHoldStart = (e) => {
    if (e.type === 'mousedown' && 'ontouchstart' in window) return;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      openFullScreen();
    }, 600);
  };

  const handleHoldEnd = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  const handleAvatarTap = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setShowHistory(true);
  };

  const handleCanvasMouseDown = (e) => {
    circlePoints.current = [getPos(e)];
    isDrawing.current = true;
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing.current) return;
    circlePoints.current.push(getPos(e));
    drawPath(circlePoints.current);
  };

  const handleCanvasMouseUp = () => {
    isDrawing.current = false;
    extractContentFromCircle();
  };

  const getBoundingBox = (points) => {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      right: Math.max(...xs),
      bottom: Math.max(...ys)
    };
  };

  const extractContentFromCircle = () => {
    if (circlePoints.current.length < 10) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      circlePoints.current = [];
      return;
    }
    const box = getBoundingBox(circlePoints.current);

    const allElements = document.querySelectorAll('p, h1, h2, h3, span, button, div');
    const captured = [];

    allElements.forEach(el => {
      if (el.closest('.avatar-fullscreen-overlay') || el.closest('.avatar-history-panel')) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const elCenterX = rect.left + rect.width / 2;
      const elCenterY = rect.top + rect.height / 2;
      if (
        elCenterX >= box.left &&
        elCenterX <= box.right &&
        elCenterY >= box.top &&
        elCenterY <= box.bottom &&
        el.innerText?.trim() &&
        el.children.length === 0
      ) {
        captured.push(el.innerText.trim());
      }
    });

    const capturedText = [...new Set(captured)].join(' ');
    if (capturedText) {
      setCapturedContent(capturedText);
      setAvatarState('confirming');
      setMainText('Is this what you need help with?');
      setSubtitleText(`"${capturedText.slice(0, 60)}${capturedText.length > 60 ? '...' : ''}"`);
      playAudio('confirming');
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      circlePoints.current = [];
    }
  };

  const handleRetryCircle = () => {
    if (retryCount >= 5) return;
    setRetryCount(prev => prev + 1);
    setAvatarState('listening');
    setMainText('Circle what you need help with');
    setSubtitleText('');
    setCapturedContent('');
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    circlePoints.current = [];
  };

  const handleConfirmContent = async () => {
    setAvatarState('thinking');
    setMainText('Thinking...');
    setSubtitleText('');

    try {
      const screenContext = window.location.pathname;
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/avatar/explain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            selected_content: capturedContent,
            screen_context: screenContext,
            language: user?.preferred_language || 'english',
            session_id: sessionId
          })
        }
      );
      const data = await res.json();
      setSessionId(data.session_id);
      setExplanation(data);
      setAvatarState('explaining');
      setMainText(data.simplified_text);
      setSubtitleText('');
      setSmartAction(data.smart_action || null);
      playAudio('ai_generated', data.audio_url, data.subtitle_schedule || []);
      fetchHistory();
    } catch (err) {
      console.error('Confirm error:', err);
      setAvatarState('apologising');
      setMainText('Something went wrong');
      setSubtitleText('Please try again');
    }
  };

  const handleThatHelped = () => {
    setAvatarState('happy');
    setMainText('Great! Glad I could help 😊');
    setSubtitleText('');
    setTimeout(closeFullScreen, 1500);
  };

  const handleResay = () => {
    if (explanation && explanation.audio_url) {
      playAudio('ai_generated', explanation.audio_url, explanation.subtitle_schedule || []);
      setMainText(explanation.simplified_text);
    }
  };

  const handleReexplain = async () => {
    setAvatarState('apologising');
    setMainText('Sorry about that, let me try again...');
    setSubtitleText('');
    await new Promise(r => setTimeout(r, 1500));
    await handleConfirmContent();
  };

  const handleSmartAction = async () => {
    if (!smartAction) return;
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/avatar/action`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            session_id: sessionId,
            action_type: smartAction.type,
            action_reference_id: smartAction.reference_id
          })
        }
      );
      handleThatHelped();
    } catch (err) {
      console.error('Smart action error:', err);
    }
  };

  const openReplaySession = (session) => {
    setShowHistory(false);
    setShowFullScreen(true);
    setSessionId(session.id);
    setCapturedContent(session.selected_content);
    setAvatarState('explaining');
    setMainText(session.simplified_text || '');
    setSubtitleText('');
    setSmartAction(session.smart_action || null);
    setExplanation(session);
    playAudio('ai_generated', session.audio_url, session.subtitle_schedule || []);
  };

  const isListeningState = avatarState === 'listening';

  return (
    <>
      {/* ── Floating Avatar Button (Red theme) ── */}
      <div className="fixed bottom-20 left-4 z-[9999]">
        <button
          onClick={handleAvatarTap}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          className="w-14 h-14 rounded-full border-2 overflow-hidden relative cursor-pointer active:scale-95 transition-transform"
          style={{
            borderColor: '#DC2626',
            background: 'linear-gradient(135deg, #1a0505 0%, #3b0a0a 100%)',
            boxShadow: '0 0 20px rgba(220, 38, 38, 0.5), 0 0 40px rgba(220, 38, 38, 0.2)'
          }}
        >
          <img
            src={AVATAR_IMAGES.idle}
            alt="Monica Avatar"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white animate-pulse"
            style={{ backgroundColor: '#22c55e' }}
          />
        </button>
      </div>

      {/* ── History Panel ── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-[100000] flex items-end transition-opacity duration-300"
          style={{ background: 'rgba(10,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full rounded-t-2xl shadow-lg max-h-[70vh] overflow-y-auto avatar-history-panel"
            style={{
              background: 'linear-gradient(180deg, #1a0808 0%, #0d0d0d 100%)',
              borderTop: '1px solid rgba(220, 38, 38, 0.3)',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(220,38,38,0.5)' }} />
            </div>
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div
                className="w-10 h-10 rounded-full overflow-hidden"
                style={{
                  background: 'radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 70%)',
                  border: '2px solid rgba(220,38,38,0.5)'
                }}
              >
                <img
                  src={AVATAR_IMAGES.idle}
                  className="w-full h-full object-cover"
                  alt="Monica Profile"
                />
              </div>
              <div>
                <p className="font-bold text-[15px] text-white tracking-wide">Monica</p>
                <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Your AI assistant</p>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>No conversations yet</p>
                <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Hold the avatar button to start</p>
              </div>
            ) : (
              <div className="px-4 py-2 flex flex-col gap-2">
                {history.map(session => (
                  <div
                    key={session.id}
                    className="rounded-xl p-3 cursor-pointer transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onClick={() => {
                      openReplaySession(session);
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(220,38,38,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white truncate">
                          {session.screen_context}
                        </p>
                        <p className="text-[12px] mt-0.5 line-clamp-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {session.selected_content?.slice(0, 80)}...
                        </p>
                      </div>
                      <p className="text-[11px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {timeAgo(session.created_at)}
                      </p>
                    </div>
                    <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#DC2626' }}>
                      Tap to replay →
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Full-screen Avatar Overlay ── */}
      {showFullScreen && (
        <div
          className="fixed inset-0 z-[99999] avatar-fullscreen-overlay"
          style={{
            background: isListeningState
              ? 'rgba(0, 0, 0, 0.08)'
              : 'linear-gradient(180deg, #0D0D12 0%, #140a10 30%, #1a0a0a 60%, #0D0D12 100%)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'background 0.3s ease'
          }}
        >
          {/* ── Corner L-shaped borders & subtle red pinches when in listening/rounding state ── */}
          {isListeningState && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Top Left */}
              <div
                style={{
                  position: 'absolute', top: '16px', left: '16px',
                  width: '28px', height: '28px',
                  borderTop: '3px solid #DC2626',
                  borderLeft: '3px solid #DC2626',
                  borderTopLeftRadius: '6px',
                  boxShadow: '-2px -2px 6px rgba(220, 38, 38, 0.45)',
                  background: 'radial-gradient(circle at top left, rgba(220, 38, 38, 0.15) 0%, transparent 70%)'
                }}
              />
              {/* Top Right */}
              <div
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  width: '28px', height: '28px',
                  borderTop: '3px solid #DC2626',
                  borderRight: '3px solid #DC2626',
                  borderTopRightRadius: '6px',
                  boxShadow: '2px -2px 6px rgba(220, 38, 38, 0.45)',
                  background: 'radial-gradient(circle at top right, rgba(220, 38, 38, 0.15) 0%, transparent 70%)'
                }}
              />
              {/* Bottom Left */}
              <div
                style={{
                  position: 'absolute', bottom: '16px', left: '16px',
                  width: '28px', height: '28px',
                  borderBottom: '3px solid #DC2626',
                  borderLeft: '3px solid #DC2626',
                  borderBottomLeftRadius: '6px',
                  boxShadow: '-2px 2px 6px rgba(220, 38, 38, 0.45)',
                  background: 'radial-gradient(circle at bottom left, rgba(220, 38, 38, 0.15) 0%, transparent 70%)'
                }}
              />
              {/* Bottom Right */}
              <div
                style={{
                  position: 'absolute', bottom: '16px', right: '16px',
                  width: '28px', height: '28px',
                  borderBottom: '3px solid #DC2626',
                  borderRight: '3px solid #DC2626',
                  borderBottomRightRadius: '6px',
                  boxShadow: '2px 2px 6px rgba(220, 38, 38, 0.45)',
                  background: 'radial-gradient(circle at bottom right, rgba(220, 38, 38, 0.15) 0%, transparent 70%)'
                }}
              />
            </div>
          )}

          {/* ── Top Bar with back button + progress bar + cancel option (z-30 to sit on top of canvas) ── */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 px-4 pt-12 pb-3 z-30"
          >
            {/* Back Button */}
            <button
              onClick={closeFullScreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer active:scale-95 transition-all"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.15)'
              }}
            >
              <ChevronLeft size={16} className="text-white" />
              <span className="text-white text-[12px] font-semibold">Back</span>
            </button>

            {/* Progress Bar */}
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)',
                  boxShadow: '0 0 8px rgba(147, 51, 234, 0.5)'
                }}
              />
            </div>

            {/* Cancel Button */}
            <button
              onClick={closeFullScreen}
              className="text-white text-[13px] font-bold px-3 py-1.5 rounded-full cursor-pointer active:scale-95 transition-all"
              style={{
                background: 'rgba(220,38,38,0.2)',
                border: '1px solid rgba(220,38,38,0.4)',
              }}
            >
              Cancel
            </button>
          </div>

          {/* ── Drawing Area for Listening State (z-10 Absolute Layout) ── */}
          {isListeningState && (
            <>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full z-10"
                style={{ touchAction: 'none' }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              />
              <p
                className="absolute bottom-28 left-0 right-0 text-center text-[14px] pointer-events-none font-bold px-4 tracking-wide z-20 animate-pulse"
                style={{
                  color: '#FFFFFF',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.9), 0 0 16px rgba(220, 38, 38, 0.8)'
                }}
              >
                Draw a circle around what you need help with
              </p>
            </>
          )}

          {/* ── Content for all other states (z-20 positioned layout) ── */}
          {!isListeningState && (
            <div className="absolute inset-0 pt-28 pb-12 px-6 flex flex-col justify-between z-20 pointer-events-none">
              
              {/* Avatar Center Content */}
              <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Red gradient glow behind avatar */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -60%)',
                    width: '340px',
                    height: '340px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, rgba(180,20,20,0.2) 35%, rgba(120,10,10,0.1) 55%, transparent 70%)',
                    filter: 'blur(20px)',
                    pointerEvents: 'none',
                    zIndex: 0,
                    animation: 'red-glow-pulse 3s ease-in-out infinite'
                  }}
                />

                {/* Avatar image */}
                <div className="relative mb-6" style={{ zIndex: 2 }}>
                  <img
                    src={AVATAR_IMAGES[avatarState] || AVATAR_IMAGES.idle}
                    className="w-56 h-56 object-contain"
                    alt={`Monica ${avatarState}`}
                    style={{
                      filter: 'drop-shadow(0 8px 32px rgba(220,38,38,0.25))',
                      transition: 'all 0.4s ease',
                      mixBlendMode: 'screen'
                    }}
                  />
                  {avatarState === 'thinking' && (
                    <div
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-full px-3 py-1.5"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{
                            backgroundColor: '#DC2626',
                            animationDelay: `${i * 150}ms`
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Main text */}
                <p
                  className="text-white text-center font-bold tracking-tight mb-2 transition-all duration-300"
                  style={{
                    fontSize: '24px',
                    maxWidth: '300px',
                    zIndex: 2,
                    whiteSpace: 'pre-line',
                    lineHeight: '1.25',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}
                >
                  {mainText}
                </p>

                {subtitleText && (
                  <p
                    className="text-center text-[14px] leading-relaxed transition-all duration-300 font-medium"
                    style={{
                      maxWidth: '280px',
                      color: 'rgba(255,255,255,0.6)',
                      zIndex: 2,
                      textShadow: '0 1px 4px rgba(0,0,0,0.4)'
                    }}
                  >
                    {subtitleText}
                  </p>
                )}

                {/* Tap to Play button */}
                {isPlaying !== undefined && audioRef.current && (
                  <button
                    onClick={toggleAudioPlayPause}
                    className="mt-4 flex items-center gap-2 rounded-full px-4 py-2 cursor-pointer active:scale-95 transition-all pointer-events-auto"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      zIndex: 2
                    }}
                  >
                    {isPlaying ? (
                      <Pause size={14} className="text-white" />
                    ) : (
                      <Play size={14} className="text-white" style={{ marginLeft: '2px' }} />
                    )}
                    <span className="text-white text-[12px] font-medium">
                      {isPlaying ? 'Playing...' : 'Tap to Play'}
                    </span>
                  </button>
                )}

                {isPlaying && currentSubtitle && (
                  <div
                    className="mt-4 rounded-xl px-4 py-3 max-w-xs"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      zIndex: 2,
                      animation: 'fade-in-up 0.5s ease forwards'
                    }}
                  >
                    <p className="text-white text-[13px] text-center leading-relaxed font-medium">
                      {currentSubtitle}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Actions Area */}
              <div className="flex flex-col gap-3 z-20 pointer-events-auto">
                {/* Greeting: Hello CTA */}
                {avatarState === 'greeting' && (
                  <button
                    onClick={() => {
                      setAvatarState('listening');
                      setMainText('Circle what you need help with');
                      setSubtitleText('');
                      if (greetingTimeoutRef.current) clearTimeout(greetingTimeoutRef.current);
                    }}
                    className="w-full text-white text-[16px] font-bold py-4 rounded-2xl cursor-pointer active:scale-95 transition-all tracking-wide"
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)',
                      boxShadow: '0 4px 20px rgba(147, 51, 234, 0.4)'
                    }}
                  >
                    Hello!
                  </button>
                )}

                {avatarState === 'confirming' && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleRetryCircle}
                      className="flex-1 text-white text-[13px] font-semibold py-3.5 rounded-2xl cursor-pointer active:scale-95 transition-all tracking-wide"
                      style={{
                        border: '1px solid rgba(220, 38, 38, 0.4)',
                        background: 'rgba(220, 38, 38, 0.08)',
                      }}
                    >
                      Circle again
                    </button>
                    <button
                      onClick={handleConfirmContent}
                      className="flex-1 text-white text-[13px] font-bold py-3.5 rounded-2xl cursor-pointer active:scale-95 transition-all tracking-wide"
                      style={{
                        background: 'linear-gradient(135deg, #DC2626 0%, #9333EA 100%)',
                        boxShadow: '0 4px 16px rgba(220, 38, 38, 0.35)'
                      }}
                    >
                      Yes, explain this
                    </button>
                  </div>
                )}

                {avatarState === 'explaining' && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleThatHelped}
                      className="w-full text-white text-[14px] font-bold py-3.5 rounded-2xl cursor-pointer active:scale-95 transition-all tracking-wide"
                      style={{
                        background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)',
                        boxShadow: '0 4px 16px rgba(147, 51, 234, 0.4)'
                      }}
                    >
                      That helped ✓
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={handleResay}
                        className="flex-1 text-white text-[13px] font-semibold py-3 rounded-2xl cursor-pointer active:scale-95 transition-all tracking-wide"
                        style={{
                          border: '1px solid rgba(220, 38, 38, 0.4)',
                          background: 'rgba(220, 38, 38, 0.08)',
                        }}
                      >
                        Re-say
                      </button>
                      <button
                        onClick={handleReexplain}
                        className="flex-1 text-white text-[13px] font-semibold py-3 rounded-2xl cursor-pointer active:scale-95 transition-all tracking-wide"
                        style={{
                          border: '1px solid rgba(220, 38, 38, 0.4)',
                          background: 'rgba(220, 38, 38, 0.08)',
                        }}
                      >
                        Re-explain
                      </button>
                    </div>

                    {smartAction && (
                      <button
                        onClick={handleSmartAction}
                        className="w-full text-white text-[13px] font-semibold py-3 rounded-2xl mt-1 cursor-pointer active:scale-95 transition-all tracking-wide"
                        style={{
                          background: 'rgba(220, 38, 38, 0.12)',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                        }}
                      >
                        {smartAction.label}
                      </button>
                    )}
                  </div>
                )}

                {avatarState === 'apologising' && (
                  <p className="text-center text-[13px] animate-pulse font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Let me try explaining that differently...
                  </p>
                )}

                {isPlaying && (
                  <div className="flex justify-center items-end gap-1 h-6">
                    {[3, 5, 7, 5, 3, 7, 4, 6, 3, 5].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full origin-bottom"
                        style={{
                          height: `${h * 3}px`,
                          background: 'linear-gradient(180deg, #DC2626 0%, #9333EA 100%)',
                          animation: `soundbar 0.8s ease-in-out infinite`,
                          animationDelay: `${i * 80}ms`
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
