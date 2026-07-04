import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic, PenLine, Plus, X, ChevronRight, ChevronDown, RotateCcw, Sparkles, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function CreatePost() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const accessToken = token || localStorage.getItem('token'); // Fallback

  const [inputMethod, setInputMethod] = useState('speak');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [images, setImages] = useState([]);  // max 3
  const [step, setStep] = useState('input');
  // steps: 'input' | 'loading' | 'result' | 'success'
  const [aiResult, setAiResult] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showRetrySheet, setShowRetrySheet] = useState(false);
  const [retryReason, setRetryReason] = useState('');
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [additionalDetails, setAdditionalDetails] = useState({
    urgency_tag: 'flexible',
    no_exp_needed: true,
    job_nature: 'full_day',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [showSuccessContent, setShowSuccessContent] = useState(false);

  // Auto show success content fallback
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => setShowSuccessContent(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const getLanguageCode = (pref) => {
    switch (pref?.toLowerCase()) {
      case 'tamil': return 'ta-IN';
      case 'hindi': return 'hi-IN';
      default: return 'en-IN';
    }
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input not supported on this browser');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = getLanguageCode(user?.preferred_language);
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      setTranscript(e.results[0][0].transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) {
      alert('Maximum 3 images allowed');
      return;
    }
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (idx) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const refineWithAI = async (reason = null) => {
    setStep('loading');
    setLoadingStep(0);

    // Simulate loading steps
    setTimeout(() => setLoadingStep(1), 800);
    setTimeout(() => setLoadingStep(2), 1800);

    const input = inputMethod === 'speak' ? transcript : typedInput;

    try {
      const data = await api.post('/api/posts/ai-refine', {
        raw_input: input,
        retry_reason: reason,
        previous_result: reason ? aiResult : null
      });
      const refined = data.result || data;
      if (!refined.area_name) {
        refined.area_name = user?.area_name || '';
      }
      setAiResult(refined);
    } catch (err) {
      console.error("AI Refine Exception:", err);
      setStep('input');
      alert("Sorry, please retry.");
    }
    
    setTimeout(() => {
      setStep('result');
      if (reason) {
        setShowRetrySheet(false);
        setRetryReason('');
      }
    }, 2500);
  };

  const confirmAndPost = async () => {
    const formData = new FormData();
    formData.append('ai_result', JSON.stringify(aiResult));
    formData.append('additional_details', JSON.stringify(additionalDetails));
    formData.append('raw_input', inputMethod === 'speak' ? transcript : typedInput);
    formData.append('input_method', inputMethod);
    images.forEach((img, i) => formData.append(`image_${i}`, img.file));

    try {
      await api.post('/api/posts/create', formData);
      setStep('success');
    } catch (e) {
      console.error("Post Creation Exception:", e);
      alert("Sorry, please retry.");
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setAdditionalDetails(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setAdditionalDetails(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleResultChange = (key, val) => {
    setAiResult(prev => ({ ...prev, [key]: val }));
  };

  const isInputEmpty = inputMethod === 'speak' ? !transcript : !typedInput;

  return (
    <div className="page-bg relative min-h-screen pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-[#E2E8F0]">
        <button onClick={() => navigate(-1)} className="text-[#0D1B2A] p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg text-[#0D1B2A]">Create Post</h1>
        <div className="w-8" /> {/* spacer for center alignment */}
      </div>

      <div className="px-5 pt-6 pb-20">
        {/* ================= STEP 1: INPUT ================= */}
        {step === 'input' && (
          <div className="animate-fade-in">
            {/* Tabs */}
            <div className="flex mb-8 border-b border-[#E2E8F0]">
              <button
                className={`flex-1 py-3 text-center text-[15px] ${
                  inputMethod === 'speak'
                    ? 'text-[#2B7EC1] font-bold border-b-2 border-[#2B7EC1]'
                    : 'text-[#94A3B8] font-medium'
                }`}
                onClick={() => setInputMethod('speak')}
              >
                <span className="flex items-center justify-center gap-2">
                  <Mic size={18} /> Speak
                </span>
              </button>
              <button
                className={`flex-1 py-3 text-center text-[15px] ${
                  inputMethod === 'type'
                    ? 'text-[#2B7EC1] font-bold border-b-2 border-[#2B7EC1]'
                    : 'text-[#94A3B8] font-medium'
                }`}
                onClick={() => setInputMethod('type')}
              >
                <span className="flex items-center justify-center gap-2">
                  <PenLine size={18} /> Type
                </span>
              </button>
            </div>

            {/* Input Area */}
            {inputMethod === 'speak' ? (
              <div className="flex flex-col items-center justify-center py-8 min-h-[200px]">
                <button
                  onClick={isRecording ? () => setIsRecording(false) : startRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
                    isRecording
                      ? 'bg-gradient-to-br from-[#2B7EC1] to-[#0D2E5A] mic-recording'
                      : 'bg-white border-2 border-[#C8DFF0] shadow-sm'
                  }`}
                >
                  <Mic size={32} color={isRecording ? 'white' : '#2B7EC1'} />
                </button>

                {isRecording ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="waveform-container playing">
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                      <div className="waveform-bar"></div>
                    </div>
                    <span className="text-[13px] text-[#2B7EC1] font-medium">Listening...</span>
                  </div>
                ) : transcript ? (
                  <div className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 relative">
                    <p className="text-[#0D1B2A] text-[15px] italic">"{transcript}"</p>
                    <button 
                      onClick={() => setTranscript('')}
                      className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow border border-[#E2E8F0] text-[#94A3B8]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-[13px] text-[#94A3B8] text-center max-w-[200px]">
                    Tap and speak your task in your language
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-8">
                <textarea
                  className="input-field min-h-[120px] resize-none !p-4"
                  placeholder="Describe your task... e.g. Need 4 people tomorrow morning to shift furniture, ₹350 each, near Koyambedu"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                />
                <div className="text-right mt-2 text-[11px] text-[#94A3B8]">
                  {typedInput.length} characters
                </div>
              </div>
            )}

            {/* Images Upload */}
            <div className="mb-8">
              <label className="block text-[12px] font-medium text-[#94A3B8] mb-3">
                Add photos (max 3)
              </label>
              <div className="flex gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="w-[80px] h-[80px] relative rounded-[10px] overflow-hidden border border-[#E2E8F0]">
                    <img src={img.preview} alt={`upload ${idx}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-[#E53E3E]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="w-[80px] h-[80px] flex items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#C8DFF0] cursor-pointer hover:bg-[#F8FAFC] transition-colors">
                    <Plus size={24} className="text-[#4A9FD4]" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#E2E8F0]">
              <button
                className="btn-primary flex items-center justify-center gap-2"
                onClick={() => refineWithAI(null)}
                disabled={isInputEmpty}
              >
                <Sparkles size={18} /> Refine with AI
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: LOADING ================= */}
        {step === 'loading' && (
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-20">
            <img 
              src="/assets/Neighbourly_logo_1_.png" 
              alt="Logo" 
              className="w-[72px] h-[72px] logo-glow logo-floating mb-12 object-contain" 
            />
            
            <div className="flex flex-col gap-5 w-[220px]">
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  {loadingStep >= 1 ? <Check size={18} className="text-green-500" /> : <Loader2 size={18} className="text-[#2B7EC1] animate-spin" />}
                </div>
                <span className={`text-[13px] ${loadingStep >= 1 ? 'text-[#0D1B2A]' : 'text-[#94A3B8]'}`}>
                  Reading your input...
                </span>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  {loadingStep >= 2 ? (
                    <Check size={18} className="text-green-500" />
                  ) : loadingStep === 1 ? (
                    <Loader2 size={18} className="text-[#2B7EC1] animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#E2E8F0]" />
                  )}
                </div>
                <span className={`text-[13px] ${loadingStep >= 2 ? 'text-[#0D1B2A]' : loadingStep === 1 ? 'text-[#2B7EC1] font-medium' : 'text-[#94A3B8]'}`}>
                  Understanding task details...
                </span>
              </div>
              
              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  {loadingStep === 2 ? (
                    <Loader2 size={18} className="text-[#2B7EC1] animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#E2E8F0]" />
                  )}
                </div>
                <span className={`text-[13px] ${loadingStep === 2 ? 'text-[#2B7EC1] font-medium' : 'text-[#94A3B8]'}`}>
                  Structuring your post...
                </span>
              </div>
            </div>
            
            <p className="text-[#94A3B8] text-[11px] italic mt-12">This usually takes 3-5 seconds</p>
          </div>
        )}

        {/* ================= STEP 3: RESULT ================= */}
        {step === 'result' && aiResult && (
          <div className="animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-1.5 text-[#2B7EC1] font-bold text-[13px]">
                <Sparkles size={16} /> AI Sparkle
              </div>
              <button 
                onClick={() => setShowRetrySheet(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#C8DFF0] text-[#64748B] text-[11px] font-medium active:bg-[#F8FAFC]"
              >
                <RotateCcw size={12} /> Retry
              </button>
            </div>

            {/* AI Result Card */}
            <div className="card p-4 mb-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">📍</span>
                <input 
                  value={aiResult.area_name || ''} 
                  onChange={e => handleResultChange('area_name', e.target.value)}
                  className="flex-1 text-[14px] text-[#0D1B2A] font-medium bg-transparent focus:outline-none border-b border-transparent focus:border-[#4A9FD4] pb-0.5"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">📅</span>
                <div className="flex-1 flex gap-2">
                  <input 
                    value={aiResult.work_date || ''} 
                    onChange={e => handleResultChange('work_date', e.target.value)}
                    className="w-1/2 text-[14px] text-[#0D1B2A] font-medium bg-transparent focus:outline-none border-b border-transparent focus:border-[#4A9FD4] pb-0.5"
                  />
                  <input 
                    value={aiResult.work_time_slot || ''} 
                    onChange={e => handleResultChange('work_time_slot', e.target.value)}
                    className="w-1/2 text-[14px] text-[#0D1B2A] font-medium bg-transparent focus:outline-none border-b border-transparent focus:border-[#4A9FD4] pb-0.5"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">💰</span>
                <div className="flex-1 flex items-center text-[14px] text-[#0D1B2A] font-medium">
                  ₹<input 
                    value={aiResult.pay_per_person || ''} 
                    onChange={e => handleResultChange('pay_per_person', e.target.value)}
                    placeholder="type your pay here"
                    className="w-32 mx-1 bg-transparent focus:outline-none border-b border-dashed border-[#94A3B8] focus:border-[#4A9FD4] pb-0.5 text-center placeholder:text-[11px] placeholder:text-[#94A3B8] placeholder:font-normal placeholder:italic"
                  /> / person
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">👥</span>
                <div className="flex-1 flex items-center text-[14px] text-[#0D1B2A] font-medium">
                  <input 
                    value={aiResult.workers_needed || ''} 
                    onChange={e => handleResultChange('workers_needed', e.target.value)}
                    className="w-8 mr-1 text-center bg-transparent focus:outline-none border-b border-transparent focus:border-[#4A9FD4] pb-0.5"
                  /> People
                </div>
              </div>

              <div className="h-[1px] bg-[#C8DFF0] my-2 w-full"></div>

              <div>
                <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Task Details</div>
                <input 
                  value={aiResult.title || ''} 
                  onChange={e => handleResultChange('title', e.target.value)}
                  className="w-full text-[14px] font-bold text-[#0D1B2A] bg-transparent focus:outline-none border-b border-transparent focus:border-[#4A9FD4] mb-2 pb-0.5"
                />
                <textarea 
                  value={aiResult.description || ''} 
                  onChange={e => handleResultChange('description', e.target.value)}
                  className="w-full text-[13px] text-[#64748B] bg-transparent focus:outline-none border-b border-transparent focus:border-[#4A9FD4] resize-none h-[40px] mb-3 leading-relaxed"
                />
                <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                  Skill:
                  <input 
                    value={aiResult.task_type || ''} 
                    onChange={e => handleResultChange('task_type', e.target.value)}
                    className="bg-[#F1F5F9] px-2 py-0.5 rounded-full text-[11px] font-medium focus:outline-none border border-transparent focus:border-[#4A9FD4]"
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="mb-6">
              <button 
                onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                className="w-full flex justify-between items-center py-2"
              >
                <div className="flex items-center gap-2 text-[13px] text-[#64748B] font-medium">
                  <Plus size={16} /> Add more details
                </div>
                {showAdditionalDetails ? <ChevronDown size={16} className="text-[#94A3B8]" /> : <ChevronRight size={16} className="text-[#94A3B8]" />}
              </button>

              {showAdditionalDetails && (
                <div className="mt-2 bg-[#F8FAFC] border border-[#C8DFF0] rounded-xl p-4 flex flex-col gap-5">
                  
                  {/* Urgency */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#64748B] mb-2">Urgency</label>
                    <div className="flex flex-wrap gap-2">
                      {['Today', 'Tomorrow', 'This Week', 'Flexible'].map(opt => {
                        const val = opt.toLowerCase().replace(' ', '_');
                        const isActive = additionalDetails.urgency_tag === val;
                        return (
                          <button
                            key={opt}
                            onClick={() => setAdditionalDetails(prev => ({ ...prev, urgency_tag: val }))}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                              isActive ? 'bg-[#2B7EC1] text-white' : 'bg-white border border-[#CBD5E1] text-[#64748B]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-[#64748B]">Anyone can do this</label>
                    <button 
                      onClick={() => setAdditionalDetails(prev => ({ ...prev, no_exp_needed: !prev.no_exp_needed }))}
                      className={`w-11 h-6 rounded-full relative transition-colors ${additionalDetails.no_exp_needed ? 'bg-[#34C759]' : 'bg-[#E2E8F0]'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${additionalDetails.no_exp_needed ? 'translate-x-5 shadow-sm' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* Work Type */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#64748B] mb-2">Work type</label>
                    <div className="flex flex-wrap gap-2">
                      {['Full Day', 'Part Time', 'One Day', 'Helper Needed'].map(opt => {
                        const val = opt.toLowerCase().replace(' ', '_');
                        const isActive = additionalDetails.job_nature === val;
                        return (
                          <button
                            key={opt}
                            onClick={() => setAdditionalDetails(prev => ({ ...prev, job_nature: val }))}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                              isActive ? 'bg-[#2B7EC1] text-white' : 'bg-white border border-[#CBD5E1] text-[#64748B]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#64748B] mb-2">Tags (optional)</label>
                    <input 
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#2B7EC1] mb-2"
                      placeholder="+ Add tag (Press Enter)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                    <div className="flex flex-wrap gap-2">
                      {additionalDetails.tags.map(tag => (
                        <div key={tag} className="flex items-center gap-1 bg-[#E2E8F0] px-2.5 py-1 rounded-full text-[11px] text-[#475569] font-medium">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)}><X size={12} className="text-[#94A3B8] hover:text-[#64748B]" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Images Preview Row */}
            {images.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                {images.map((img, idx) => (
                  <div key={idx} className="min-w-[72px] h-[72px] relative rounded-lg overflow-hidden border border-[#E2E8F0] shrink-0">
                    <img src={img.preview} alt={`upload ${idx}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-white/80 p-0.5 rounded-full text-[#E53E3E]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#E2E8F0] flex gap-3">
              <button 
                className="btn-outline w-[40%] !px-0"
                onClick={() => setStep('input')}
              >
                ← Edit input
              </button>
              <button 
                className="btn-primary w-[60%] !px-0"
                onClick={confirmAndPost}
              >
                Confirm & Post →
              </button>
            </div>
            
            {/* Retry Bottom Sheet Overlay */}
            {showRetrySheet && (
              <div className="fixed inset-0 bg-black/30 z-30 flex flex-col justify-end animate-fade-in">
                <div className="bg-white rounded-t-[20px] shadow-[0_-4px_24px_rgba(43,126,193,0.15)] p-6">
                  <h3 className="text-[16px] font-bold text-[#0D1B2A] mb-4 text-center">What needs to be corrected?</h3>
                  <textarea 
                    className="input-field min-h-[80px] mb-5 !p-3"
                    placeholder="Tell us what's wrong..."
                    value={retryReason}
                    onChange={(e) => setRetryReason(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button className="btn-outline w-[45%]" onClick={() => setShowRetrySheet(false)}>Cancel</button>
                    <button className="btn-primary w-[55%]" onClick={() => refineWithAI(retryReason)} disabled={!retryReason.trim()}>Refine Again</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 4: SUCCESS ================= */}
        {step === 'success' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B7EC1]/15 backdrop-blur-sm px-5">
            <div className="bg-white rounded-[20px] p-8 shadow-2xl max-w-[300px] w-full flex flex-col items-center text-center animate-fade-in">
              
              <div className="w-full h-[160px] rounded-xl overflow-hidden bg-[#0D2E5A] mb-6">
                <video
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => setShowSuccessContent(true)}
                  className="w-full h-full object-cover rounded-xl"
                >
                  <source src="/assets/logo-animation.mp4" type="video/mp4" />
                  <img
                    src="/assets/Neighbourly_logo_1_.png"
                    alt="Neighbourly"
                    className="w-full h-full object-contain p-4 logo-glow"
                  />
                </video>
              </div>

              {showSuccessContent && (
                <div className="fade-in-up w-full">
                  <h2 className="text-[#2B7EC1] font-bold text-[18px] mb-2 flex items-center justify-center gap-2">
                    <Check size={20} className="text-[#34C759]" /> Post is live!
                  </h2>
                  <p className="text-[#64748B] text-[13px] mb-6">Your post is now visible to workers nearby</p>
                  
                  <div className="flex justify-between gap-3">
                    <button className="btn-primary w-[48%] !px-0 !py-3 !text-[13px]" onClick={() => navigate('/home', { replace: true })}>
                      View my post
                    </button>
                    <button className="btn-outline w-[48%] !px-0 !py-3 !text-[13px]" onClick={() => navigate('/home', { replace: true })}>
                      Go to feed
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
