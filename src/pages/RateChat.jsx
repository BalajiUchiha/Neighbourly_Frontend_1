import { Star } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { formatDate } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'

export default function RateChat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const { token: accessToken } = useAuth()

  // State management
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bothRevealed, setBothRevealed] = useState(false)
  const [theirRating, setTheirRating] = useState(0)
  const [theirReview, setTheirReview] = useState('')
  const [chat, setChat] = useState(null)
  const [post, setPost] = useState(null)
  const [ratedUser, setRatedUser] = useState(null)
  const [isRatingWorker, setIsRatingWorker] = useState(false)

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const fetchRatingContext = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ratings/context/${chatId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (res.ok) {
        const data = await res.json()
        setChat(data.chat)
        setPost(data.post)
        setRatedUser(data.rated_user)
        setIsRatingWorker(data.is_rating_worker)
      }
    } catch (err) {
      console.error('Failed to fetch rating context:', err)
    }
  }

  useEffect(() => {
    if (chatId && accessToken) {
      fetchRatingContext()
    }
  }, [chatId, accessToken])

  const handleSubmit = async () => {
    if (rating === 0) return
    setIsSubmitting(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ratings/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            chat_id: chatId,
            stars: rating,
            review_text: reviewText,
            tags: selectedTags
          })
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.both_revealed) {
          setTheirRating(data.their_rating)
          setTheirReview(data.their_review)
          setBothRevealed(true)
        } else {
          navigate('/home', { replace: true })
        }
      } else {
        console.error('Failed to submit rating')
      }
    } catch (err) {
      console.error('Error submitting rating:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!chat || !post || !ratedUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary text-[13px] font-medium animate-pulse">Loading rating details...</p>
      </div>
    )
  }

  const workerTags = ['Punctual', 'Hard working', 'Friendly', 'Skilled', 'Reliable', 'Would hire again']
  const posterTags = ['Clear instructions', 'Paid on time', 'Fair pay', 'Good communication', 'Would work again']
  const quickTags = isRatingWorker ? workerTags : posterTags

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-border sticky top-0 z-50">
        <div>
          <p className="font-bold text-[15px] text-text-primary">Rate your experience</p>
          <p className="text-[11px] text-text-secondary">{post.title}</p>
        </div>
      </div>

      {/* User being rated card */}
      <div className="mx-4 mt-4 card p-4 flex items-center gap-3 bg-white border border-border rounded-xl">
        <img
          src={ratedUser.photo_url || '/assets/default-avatar.png'}
          className="w-14 h-14 rounded-full object-cover border-2 border-border"
          alt={ratedUser.name}
        />
        <div>
          <p className="font-bold text-[15px] text-text-primary">{ratedUser.name}</p>
          <p className="text-[12px] text-text-secondary">
            {isRatingWorker ? 'Worker' : 'Job Poster'} · {post.title}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Work date: {formatDate(chat.work_date)}
          </p>
        </div>
      </div>

      {/* Star rating */}
      <div className="mx-4 mt-4 card p-4 bg-white border border-border rounded-xl">
        <p className="font-semibold text-[14px] text-text-primary mb-3 text-center">
          How was your experience?
        </p>
        <div className="flex justify-center gap-3 mb-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="transition-transform active:scale-110"
            >
              <Star
                size={36}
                className={star <= rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-border'
                }
              />
            </button>
          ))}
        </div>
        <p className="text-center text-[12px] text-text-secondary">
          {rating === 1 ? 'Poor' :
           rating === 2 ? 'Below average' :
           rating === 3 ? 'Okay' :
           rating === 4 ? 'Good' :
           rating === 5 ? 'Excellent' : 'Tap to rate'}
        </p>
      </div>

      {/* Review text */}
      <div className="mx-4 mt-3">
        <textarea
          value={reviewText}
          onChange={e => setReviewText(e.target.value)}
          placeholder={`Share your experience with ${ratedUser.name.split(' ')[0]}...`}
          rows={4}
          className="input-field resize-none w-full bg-white border border-border rounded-xl p-3 text-[13px]"
          maxLength={300}
        />
        <p className="text-right text-[10px] text-text-disabled mt-1">
          {reviewText.length}/300
        </p>
      </div>

      {/* Quick tags */}
      <div className="mx-4 mt-3">
        <p className="text-[12px] text-text-secondary mb-2">Quick tags (optional)</p>
        <div className="flex flex-wrap gap-2">
          {quickTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-text-secondary border-border'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Submit button bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4">
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className={`btn-primary py-3.5 rounded-xl text-[14px] w-full ${
            rating === 0 ? 'opacity-50' : ''
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Rating'}
        </button>
        <p className="text-center text-[10px] text-text-disabled mt-2">
          Your review is hidden until the other person submits theirs
        </p>
      </div>

      {/* Reveal Modal */}
      {bothRevealed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl mx-4 p-6 text-center shadow-lg max-w-sm">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-bold text-[17px] text-text-primary mb-1">Reviews revealed!</p>
            <p className="text-[13px] text-text-secondary mb-4">
              Both reviews are now visible on your profiles
            </p>

            {/* Their review of you */}
            <div className="bg-surface border border-border rounded-xl p-3 mb-4 text-left">
              <p className="text-[11px] text-text-secondary mb-1">
                {ratedUser.name.split(' ')[0]} said about you:
              </p>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={14}
                    className={s <= theirRating ? 'text-yellow-400 fill-yellow-400' : 'text-border'} />
                ))}
              </div>
              <p className="text-[13px] text-text-primary italic">
                "{theirReview}"
              </p>
            </div>

            <button
              onClick={() => navigate('/home')}
              className="btn-primary py-3 rounded-xl w-full text-[13px]"
            >
              Back to home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
