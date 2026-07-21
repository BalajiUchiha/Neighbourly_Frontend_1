import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, FileText, ExternalLink, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { formatDate, timeAgo } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import apiFetch from '../utils/api'

const formatTime = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function Chat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const { token: accessToken, user } = useAuth()
  const currentUserId = user?.id


  // State management
  const [chat, setChat] = useState(null)
  const [post, setPost] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [currentBargain, setCurrentBargain] = useState(null)
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showBargainSheet, setShowBargainSheet] = useState(false)
  const [showCounterSheet, setShowCounterSheet] = useState(false)
  const [showDateSheet, setShowDateSheet] = useState(false)
  const [bargainAmount, setBargainAmount] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Derived — must come after state declarations
  const isPoster = chat && currentUserId ? currentUserId === chat.poster_id : false
  const isWorkDatePassed = chat?.work_date
    ? new Date(chat.work_date) <= new Date()
    : false
  
  const chatAreaRef = useRef(null)
  const inputRef = useRef(null)

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
    }
  }

  const handleMarkComplete = async () => {
    try {
      const res = await apiFetch(
        `/api/chats/${chatId}/complete`,
        {
          method: 'POST'
        }
      )
      if (res.ok) {
        navigate(`/chat/${chatId}/rate`)
      }
    } catch (err) {
      console.error('Failed to mark work as complete:', err)
    }
  }

  const handleGenerateAgreement = async () => {
    try {
      const res = await apiFetch(
        `/api/chats/${chatId}/generate-agreement`,
        { method: 'POST' }
      )
      const data = await res.json()
      setChat(prev => ({ ...prev, agreement_pdf_url: data.agreement_pdf_url }))
    } catch (err) {
      console.error('Failed to generate agreement:', err)
    }
  }

  // Fetch chat details
  const fetchChat = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiFetch(
        `/api/chats/${chatId}`
      )
      if (!res.ok) {
        throw new Error('Failed to load chat details')
      }
      const data = await res.json()
      setChat(data.chat)
      setPost(data.post)
      setOtherUser(data.other_user)
      setMessages(data.messages || [])
      setCurrentBargain(data.current_bargain || null)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (chatId && accessToken) {
      fetchChat()
    }
  }, [chatId, accessToken])

  // Scroll to bottom on load and whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages.length, isLoading])

  // Listen for avatar reply insertion
  useEffect(() => {
    const handleAvatarReply = (e) => {
      setInputText(e.detail.text)
      // Focus the input
      inputRef.current?.focus()
    }
    window.addEventListener('avatarInsertReply', handleAvatarReply)
    return () => window.removeEventListener('avatarInsertReply', handleAvatarReply)
  }, [])

  // Input disabling logic
  const isInputDisabled = chat && post ? (
    (chat.work_date_confirmed && post.status === 'completed') ||
    post.status === 'completed' ||
    post.status === 'cancelled'
  ) : false

  const getPlaceholder = () => {
    if (!post) return 'Type a message...'
    if (post.status === 'completed') return 'Job completed. Chat is closed.'
    if (post.status === 'cancelled') return 'Job cancelled. Chat is closed.'
    return 'Type a message...'
  }

  // Handlers
  const handleSend = async () => {
    if (!inputText.trim() || isInputDisabled) return
    const text = inputText.trim()
    setInputText('')
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    setMessages(prev => [...prev, {
      role: 'user', 
      sender_id: currentUserId,
      content: text, 
      message_type: 'text',
      sent_at: new Date().toISOString()
    }])

    try {
      await apiFetch(`/api/chats/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, message_type: 'text' })
      })
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const handleAcceptPay = async () => {
    try {
      const res = await apiFetch(
        `/api/chats/${chatId}/accept-pay`,
        { method: 'POST' }
      )
      const data = await res.json()
      setChat(prev => ({ ...prev, bargain_status: 'skipped', agreed_pay: data.agreed_pay }))
      setMessages(prev => [...prev, {
        content: `Pay accepted at ₹${data.agreed_pay}/day`,
        message_type: 'system', 
        sent_at: new Date().toISOString()
      }])
    } catch (err) {
      console.error('Failed to accept pay:', err)
    }
  }

  const handleSendBargain = async () => {
    if (!bargainAmount) return
    setShowBargainSheet(false)
    setShowCounterSheet(false)
    try {
      const res = await apiFetch(
        `/api/chats/${chatId}/bargain`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposed_amount: parseInt(bargainAmount) })
        }
      )
      const data = await res.json()
      setCurrentBargain(data.bargain_round)
      setChat(prev => ({ ...prev, bargain_status: 'in_progress' }))
      setMessages(prev => [...prev, {
        content: `Counter offer: ₹${bargainAmount}/day (Round ${data.bargain_round.round_number} of 3)`,
        message_type: 'bargain_offer', 
        sent_at: new Date().toISOString()
      }])
      setBargainAmount('')
    } catch (err) {
      console.error('Failed to send bargain offer:', err)
    }
  }

  const handleBargainResponse = async (action) => {
    try {
      const res = await apiFetch(
        `/api/chats/${chatId}/bargain-respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, bargain_round_id: currentBargain.id })
        }
      )
      const data = await res.json()
      if (action === 'accept') {
        setChat(prev => ({ ...prev, bargain_status: 'agreed', agreed_pay: data.agreed_pay }))
        setMessages(prev => [...prev, {
          content: `Pay locked at ₹${data.agreed_pay}/day — both agreed`,
          message_type: 'bargain_accept', 
          sent_at: new Date().toISOString()
        }])
        setCurrentBargain(null)
      } else {
        setCurrentBargain(data.next_bargain || null)
        if (!data.next_bargain) {
          setChat(prev => ({ ...prev, bargain_status: 'skipped', agreed_pay: post.pay_per_person }))
        }
      }
    } catch (err) {
      console.error('Failed to respond to bargain:', err)
    }
  }

  const handleConfirmDate = async () => {
    if (!selectedDate || !selectedTimeSlot) return
    setShowDateSheet(false)
    try {
      const res = await apiFetch(
        `/api/chats/${chatId}/confirm-date`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ work_date: selectedDate, work_time_slot: selectedTimeSlot })
        }
      )
      const data = await res.json()
      setChat(prev => ({
        ...prev,
        work_date_confirmed: true,
        work_date: selectedDate,
        work_time_slot: selectedTimeSlot,
        agreement_pdf_url: data.agreement_pdf_url
      }))
      setMessages(prev => [...prev, {
        content: `Work confirmed for ${formatDate(selectedDate)} ${selectedTimeSlot}. Agreement generated.`,
        message_type: 'system', 
        sent_at: new Date().toISOString()
      }])
    } catch (err) {
      console.error('Failed to confirm date:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[13px] text-text-secondary">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (error || !chat || !post || !otherUser) {
    return (
      <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center font-sans px-6 text-center">
        <p className="text-danger text-[14px] font-semibold mb-2">Error Loading Chat</p>
        <p className="text-[13px] text-text-secondary mb-4">{error || 'Chat or associated post details could not be found.'}</p>
        <button onClick={() => navigate(-1)} className="btn-outline max-w-[200px] text-[13px] py-2 rounded-xl">
          Go Back
        </button>
      </div>
    )
  }

  const isBargainOrCounter = showBargainSheet || showCounterSheet
  const bargainTitle = showCounterSheet ? 'Counter this offer' : 'Make a counter offer'
  const handleCancelBargainSheet = () => {
    setShowBargainSheet(false)
    setShowCounterSheet(false)
  }

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col font-sans relative">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="active:scale-95 transition-transform">
            <ArrowLeft size={20} className="text-text-primary" />
          </button>
          <img 
            src={otherUser.photo_url || '/assets/default-avatar.png'} 
            className="w-9 h-9 rounded-full object-cover border border-border" 
            alt={otherUser.name} 
          />
          <div>
            <p className="font-bold text-[14px] text-text-primary leading-tight">{otherUser.name}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">{post.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chat.status === 'open' && (
            <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full font-medium">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Bargaining Banner — shown when bargain_status is not_started or in_progress */}
      {(chat.bargain_status === 'not_started' || chat.bargain_status === 'in_progress') && !chat.agreed_pay && (
        <div className="bg-surface border-b border-border px-4 py-3 sticky top-14 z-40 shadow-sm animate-fade-in-up">
          {chat.bargain_status === 'not_started' && (
            <div className="flex gap-2">
              <button
                onClick={handleAcceptPay}
                className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white text-[12px] font-bold py-2.5 rounded-xl active:scale-95 transition-transform"
              >
                ✓ Accept ₹{post.pay_per_person}/day
              </button>
              <button
                onClick={() => setShowBargainSheet(true)}
                className="flex-1 btn-outline text-[12px] py-2.5 rounded-xl active:scale-95 transition-transform"
              >
                💬 Start bargaining
              </button>
            </div>
          )}

          {chat.bargain_status === 'in_progress' && currentBargain && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-text-primary">
                  Counter offer: ₹{currentBargain.proposed_amount}/day
                </p>
                <span className="text-[10px] text-text-secondary">
                  Round {currentBargain.round_number} of 3
                </span>
              </div>
              {currentBargain.proposed_by !== currentUserId && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBargainResponse('accept')}
                    className="flex-1 bg-gradient-to-r from-primary to-primary-dark text-white text-[12px] font-bold py-2 rounded-xl active:scale-95 transition-transform"
                  >
                    ✓ Accept ₹{currentBargain.proposed_amount}
                  </button>
                  {currentBargain.round_number < 3 && (
                    <button
                      onClick={() => setShowCounterSheet(true)}
                      className="flex-1 btn-outline text-[12px] py-2 rounded-xl active:scale-95 transition-transform"
                    >
                      Counter offer
                    </button>
                  )}
                  <button
                    onClick={() => handleBargainResponse('reject')}
                    className="px-3 py-2 border border-danger text-danger text-[12px] rounded-xl active:scale-95 transition-transform"
                  >
                    ✗
                  </button>
                </div>
              )}
              {currentBargain.proposed_by === currentUserId && (
                <p className="text-[11px] text-text-secondary text-center py-1">
                  Waiting for {otherUser.name.split(' ')[0]} to respond...
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pay Locked Banner — shown when bargain_status is agreed or skipped */}
      {(chat.bargain_status === 'agreed' || chat.bargain_status === 'skipped') && chat.agreed_pay && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2.5 sticky top-14 z-40 flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[12px] font-semibold text-green-700">
              Pay locked at ₹{chat.agreed_pay}/day
            </span>
          </div>
          {!chat.work_date_confirmed && (
            <button
              onClick={() => setShowDateSheet(true)}
              className="text-[11px] text-primary font-semibold border border-primary rounded-full px-3 py-1 bg-white hover:bg-primary hover:text-white transition-colors active:scale-95"
            >
              Confirm date
            </button>
          )}
          {chat.work_date_confirmed && (
            <span className="text-[11px] text-green-600 font-medium">
              ✓ {formatDate(chat.work_date)} confirmed
            </span>
          )}
        </div>
      )}

      {/* Agreement PDF Section — shown after date confirmed */}
      {chat.work_date_confirmed && (
        <div className="mx-4 mt-2 mb-2 flex flex-col gap-2">
          {chat.agreement_pdf_url ? (
            <a
              href={`${import.meta.env.VITE_API_URL}${chat.agreement_pdf_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3"
            >
              <FileText size={18} className="text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-text-primary">Job Agreement</p>
                <p className="text-[11px] text-text-secondary">Tap to view your agreement PDF</p>
              </div>
              <ExternalLink size={14} className="text-text-secondary" />
            </a>
          ) : (
            <button
              onClick={handleGenerateAgreement}
              className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3"
            >
              <FileText size={18} className="text-primary flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-[13px] font-semibold text-text-primary">Generate Agreement</p>
                <p className="text-[11px] text-text-secondary">Create your job agreement PDF</p>
              </div>
              <ChevronRight size={14} className="text-text-secondary" />
            </button>
          )}
        </div>
      )}

      {/* Mark Work Completed Button */}
      {isPoster && chat.work_date_confirmed && !chat.completed && isWorkDatePassed && (
        <div className="mx-4 mt-2 mb-2">
          <button
            onClick={handleMarkComplete}
            className="btn-primary py-3 rounded-xl w-full text-[13px]"
          >
            ✓ Mark work as completed
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={chatAreaRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scrollbar-hide"
        style={{ paddingBottom: '90px' }}
      >
        {messages.map((msg, i) => {
          // Identify bubble style based on message_type
          if (msg.message_type === 'system') {
            return (
              <div key={i} className="flex justify-center my-1">
                <span className="text-[11px] text-text-secondary bg-surface border border-border px-3 py-1.5 rounded-full text-center">
                  {msg.content}
                </span>
              </div>
            )
          }

          if (msg.message_type === 'bargain_offer') {
            return (
              <div key={i} className="flex justify-center my-1">
                <span className="text-[11px] text-warning bg-warning bg-opacity-10 border border-warning border-opacity-30 px-3 py-1.5 rounded-full text-center">
                  💰 {msg.content}
                </span>
              </div>
            )
          }

          if (msg.message_type === 'bargain_accept') {
            return (
              <div key={i} className="flex justify-center my-1">
                <span className="text-[11px] text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-center">
                  ✓ {msg.content}
                </span>
              </div>
            )
          }

          // Default text bubbles
          const isMe = msg.sender_id === currentUserId
          return (
            <div
              key={i}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                isMe
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-surface border border-border text-text-primary rounded-bl-sm'
              }`}>
                <p className="text-[13px] leading-relaxed break-words">{msg.content}</p>
                <div className="flex items-center justify-end mt-1 gap-2">
                  <p className={`text-[10px] ${
                    isMe ? 'text-white text-opacity-70' : 'text-text-secondary'
                  }`}>
                    {formatTime(msg.sent_at || msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-3 py-2.5 flex flex-col gap-2 z-40 shadow-md">
        <div className="flex bg-surface border border-border rounded-2xl px-3 py-2 items-end gap-2 min-h-[44px]">
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
            placeholder={getPlaceholder()}
            disabled={isInputDisabled}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-disabled resize-none outline-none max-h-24 py-1"
          />
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isInputDisabled}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95 ${
              inputText.trim() && !isInputDisabled
                ? 'bg-gradient-to-br from-primary to-primary-dark shadow-md'
                : 'bg-surface border border-border'
            }`}
          >
            <Send
              size={16}
              className={inputText.trim() && !isInputDisabled ? 'text-white' : 'text-[#B0BEC9]'}
            />
          </button>
        </div>
      </div>

      {/* Bargain Bottom Sheet */}
      {isBargainOrCounter && (
        <div 
          className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-xs transition-opacity duration-300" 
          onClick={handleCancelBargainSheet}
        >
          <div 
            className="w-full bg-white rounded-t-2xl shadow-lg p-5 animate-fade-in-up" 
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <p className="font-bold text-[15px] text-text-primary mb-1">{bargainTitle}</p>
            <p className="text-[12px] text-text-secondary mb-4">
              Posted rate: ₹{post.pay_per_person}/day
            </p>
            <div className="input-field flex items-center gap-2 mb-4 no-left-icon no-right-icon">
              <span className="text-text-secondary text-[13px]">₹</span>
              <input
                type="number"
                value={bargainAmount}
                onChange={e => setBargainAmount(e.target.value)}
                placeholder="Enter your amount"
                className="flex-1 outline-none text-[14px] text-text-primary bg-transparent"
              />
              <span className="text-text-secondary text-[12px]">/day</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCancelBargainSheet} 
                className="flex-1 btn-outline py-3 rounded-xl text-[13px] active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendBargain} 
                className="flex-1 btn-primary py-3 rounded-xl text-[13px] active:scale-95 transition-transform"
              >
                Send offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Confirmation Bottom Sheet */}
      {showDateSheet && (
        <div 
          className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-xs transition-opacity duration-300" 
          onClick={() => setShowDateSheet(false)}
        >
          <div 
            className="w-full bg-white rounded-t-2xl shadow-lg p-5 animate-fade-in-up" 
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <p className="font-bold text-[15px] text-text-primary mb-4">Confirm work date</p>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="input-field no-left-icon no-right-icon mb-3"
            />
            <select
              value={selectedTimeSlot}
              onChange={e => setSelectedTimeSlot(e.target.value)}
              className="input-field no-left-icon no-right-icon mb-4"
            >
              <option value="">Select time slot</option>
              <option value="morning">Morning (6AM - 12PM)</option>
              <option value="afternoon">Afternoon (12PM - 6PM)</option>
              <option value="evening">Evening (6PM - 10PM)</option>
            </select>
            <button 
              onClick={handleConfirmDate} 
              className="btn-primary py-3 rounded-xl text-[13px] w-full active:scale-95 transition-transform"
            >
              Confirm date
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
