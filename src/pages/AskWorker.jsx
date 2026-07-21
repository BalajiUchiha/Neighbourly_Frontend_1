import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Zap } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { timeAgo } from '../utils/helpers'
import apiFetch from '../utils/api'
import idleImg from '../assets/avatar/Neutral.png'

const formatTime = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getSuggestedQuestions = (taskType, workerName) => {
  if (!workerName) return []
  const first = workerName.split(' ')[0]
  const base = [
    `Has ${first} done ${taskType} work before?`,
    `What do previous posters say about ${first}?`,
    `Does ${first} usually bargain for higher pay?`,
    `Has ${first} ever cancelled a confirmed job?`,
    `Is ${first} available on weekends?`
  ]
  return base
}

export default function AskWorker() {
  const { postId, workerId } = useParams()
  const navigate = useNavigate()

  const [worker, setWorker] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [credits, setCredits] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState('rag_suggestion')
  // source — 'rag_suggestion' if from worker card below post
  // 'applicant_list' if from applicant list screen

  const chatAreaRef = useRef(null)
  const inputRef = useRef(null)



  useEffect(() => {
    initSession()
  }, [postId, workerId])

  const initSession = async () => {
    setIsLoading(true)
    try {
      // Check if existing session exists for this post + worker + user
      const res = await apiFetch(
        `/api/rag/session?post_id=${postId}&worker_id=${workerId}`
      )
      const data = await res.json()

      // Load worker info
      setWorker(data.worker)

      // Load credits
      setCredits(data.credits_remaining)

      if (data.session) {
        // Existing session — load history
        setSessionId(data.session.id)
        setMessages(data.session.messages || [])
      } else {
        // New session — will be created on first message
        setSessionId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Session init error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (text = null) => {
    const question = (typeof text === 'string' ? text : inputText).trim()
    if (!question || credits === 0 || isTyping) return

    setInputText('')
    setIsTyping(true)

    // Optimistically add user message
    const userMsg = {
      role: 'user',
      content: question,
      credits_charged: 1,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])

    // Scroll to bottom
    setTimeout(() => {
      chatAreaRef.current?.scrollTo({
        top: chatAreaRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }, 100)

    try {
      const res = await apiFetch(
        `/api/rag/ask`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            post_id: postId,
            worker_id: workerId,
            question,
            session_id: sessionId,
            source
          })
        }
      )
      const data = await res.json()

      // Update session id if newly created
      if (!sessionId) setSessionId(data.session_id)

      // Add AI reply
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        credits_charged: 0,
        created_at: new Date().toISOString()
      }])

      // Update credits
      setCredits(data.credits_remaining)

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        credits_charged: 0,
        created_at: new Date().toISOString()
      }])
    } finally {
      setIsTyping(false)
      setTimeout(() => {
        chatAreaRef.current?.scrollTo({
          top: chatAreaRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 100)
    }
  }

  const handleSuggestedQuestion = (q) => {
    handleSend(q)
  }

  const handleInvite = async () => {
    await apiFetch(
      `/api/rag/invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: postId,
          worker_id: workerId,
          session_id: sessionId
        })
      }
    )
    navigate(-1)
  }

  if (isLoading || !worker) {
    return <div className="min-h-screen bg-page flex items-center justify-center">Loading...</div>
  }

  const suggestedQuestions = getSuggestedQuestions('this', worker.name);

  return (
    <div className="min-h-[100dvh] bg-page flex flex-col font-sans">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
        
        {/* Left — back + worker info */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-text-primary" />
          </button>
          <img
            src={worker.photo_url || '/assets/default-avatar.png'}
            className="w-9 h-9 rounded-full object-cover border border-border cursor-pointer"
            onClick={() => navigate(`/profile/${worker.id}`)}
          />
          <div>
            <p className="font-bold text-[14px] text-text-primary">Ask Monica✨ about {worker.name.split(' ')[0]}</p>
            <p className="text-[11px] text-text-secondary">
              ★ {worker.trust_score_display || 'New'} · {worker.distance_km || 0} km away
            </p>
          </div>
        </div>

        {/* Right — credit counter */}
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">
          <Zap size={12} className="text-[#E74C3C]" />
          <span className="text-[11px] font-bold text-[#E74C3C]">
            {credits} credits
          </span>
        </div>

      </div>

      <div
        ref={chatAreaRef}
        className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3"
        style={{ paddingBottom: '100px' }}
      >
        <div className="mt-3 mb-2 bg-surface border border-border rounded-2xl p-3">
          
          {/* Worker snapshot */}
          <div className="flex items-center gap-3 mb-3">
            <img
              src={worker.photo_url || '/assets/default-avatar.png'}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="font-bold text-[14px] text-text-primary">{worker.name}</p>
              <div className="flex gap-1.5 mt-0.5 flex-wrap">
                {worker.skills?.slice(0, 3).map(skill => (
                  <span key={skill} className="text-[10px] bg-white border border-border text-text-secondary px-2 py-0.5 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-[#E74C3C]">★ {worker.trust_score_display || 'New'}</p>
              <p className="text-[10px] text-text-secondary">{worker.total_jobs || 0} jobs</p>
            </div>
          </div>

          {/* Quick stat pills */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] bg-white border border-border text-text-secondary px-2.5 py-1 rounded-full">
              ⚡ Avg response: {worker.avg_response_time || 'Fast'}
            </span>
            <span className="text-[11px] bg-white border border-border text-text-secondary px-2.5 py-1 rounded-full">
              💰 Bargain attempts: {worker.bargain_attempts || 0}
            </span>
            <span className="text-[11px] bg-white border border-border text-text-secondary px-2.5 py-1 rounded-full">
              ✅ Completion rate: {worker.completion_rate || '—'}
            </span>
          </div>

          {/* AI intro message */}
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-2.5">
            <p className="text-[12px] text-[#E74C3C] font-bold flex items-center gap-1.5">
              ✨ Ask Monica✨ about {worker.name.split(' ')[0]}
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Past work, ratings, reliability, bargaining history — I have it all.
            </p>
          </div>

        </div>

        {messages.length === 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-text-secondary mb-2 font-medium">
              Try asking:
            </p>
            <div className="flex flex-col gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(q)}
                  className="text-left bg-surface border border-border rounded-xl px-3 py-2.5 text-[12px] text-text-primary hover:border-[#E74C3C] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Assistant avatar using Monica neutral avatar */}
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-red-300 flex-shrink-0 self-end mr-2 bg-slate-900 shadow-sm">
                <img src={idleImg} alt="Monica✨" className="w-full h-full object-cover" />
              </div>
            )}

            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
              msg.role === 'user'
                ? 'text-white rounded-br-sm'
                : 'bg-surface border border-border text-text-primary rounded-bl-sm'
            }`}
            style={{
              background: msg.role === 'user' ? 'linear-gradient(135deg, #E74C3C, #C0392B)' : undefined
            }}
            >
              <p className="text-[13px] leading-relaxed">{msg.content}</p>
              <div className="flex items-center justify-between mt-1 gap-2">
                <p className={`text-[10px] ${
                  msg.role === 'user' ? 'text-white text-opacity-70' : 'text-text-secondary'
                }`}>
                  {formatTime(msg.created_at)}
                </p>
                {msg.role === 'user' && msg.credits_charged > 0 && (
                  <span className="text-[10px] text-white text-opacity-70">
                    -{msg.credits_charged} credit
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* AI typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-red-300 flex-shrink-0 self-end mr-2 bg-slate-900 shadow-sm">
              <img src={idleImg} alt="Monica✨" className="w-full h-full object-cover" />
            </div>
            <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-[#E74C3C] rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <div className="w-1.5 h-1.5 bg-[#E74C3C] rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <div className="w-1.5 h-1.5 bg-[#E74C3C] rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
            </div>
          </div>
        )}

        {credits === 0 && (
          <div className="mb-3 bg-surface border border-border rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-text-primary">No credits left</p>
              <p className="text-[11px] text-text-secondary">Buy more to continue asking</p>
            </div>
            <button
              onClick={() => navigate('/credits/buy')}
              className="bg-gradient-to-r from-primary to-[#1A4F7A] text-white text-[12px] font-semibold px-4 py-2 rounded-lg"
            >
              Buy credits
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-3 py-2.5 flex flex-col gap-2 z-40">
        
        {messages.length >= 2 && (
          <div className="flex gap-2 pb-1 px-1">
            <button
              onClick={handleInvite}
              className="flex-1 bg-gradient-to-r from-primary to-[#1A4F7A] text-white text-[13px] font-bold py-2.5 rounded-xl shadow-md"
            >
              ✉️ Invite {worker.name.split(' ')[0]}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="btn-outline text-[13px] py-2.5 px-4 rounded-xl flex-1"
            >
              Back
            </button>
          </div>
        )}

        <div className="flex-1 bg-surface border border-border rounded-2xl px-3 py-2 flex items-end gap-2 min-h-[44px]">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={credits > 0 ? "Ask anything about this worker..." : "No credits remaining"}
            disabled={credits === 0 || isTyping}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-disabled resize-none outline-none max-h-24"
          />
          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || credits === 0 || isTyping}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              inputText.trim() && credits > 0 && !isTyping
                ? 'bg-gradient-to-br from-primary to-[#1A4F7A] shadow-md'
                : 'bg-surface border border-border'
            }`}
          >
            <Send
              size={16}
              className={inputText.trim() && credits > 0 ? 'text-white' : 'text-[#B0BEC9]'}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
