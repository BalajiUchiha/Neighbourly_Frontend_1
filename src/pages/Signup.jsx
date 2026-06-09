import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Lock, Eye, EyeOff, Camera, 
  MapPin, Briefcase, Heart, CheckCircle, XCircle, 
  ArrowLeft, ArrowRight, ChevronDown, Check, X, 
  AlertTriangle, AtSign, Volume2, RotateCcw
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import NeighbourlyLogo from '../assets/Neighbourly_logo_1_.png';


export function Signup() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Redirect to home if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && !showComfortPopup) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Voice Assistance state
  const [highlightedButton, setHighlightedButton] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const highlightMapRef = useRef([]);
  
  // Replay message tooltip states
  const [showReplayTooltip, setShowReplayTooltip] = useState(false);
  const [hasReplayed, setHasReplayed] = useState(false);
  
  // Post-signup Comfort classification state
  const [showComfortPopup, setShowComfortPopup] = useState(false);
  const [selectedComfort, setSelectedComfort] = useState(null);
  const [submittingComfort, setSubmittingComfort] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null, true, false
  const [locationDetected, setLocationDetected] = useState(false);
  const [districtsList, setDistrictsList] = useState([]);
  
  const [selectedSkills, setSelectedSkills] = useState([]);

  // Main Form Data State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    date_of_birth: '',
    gender: '',
    preferred_language: 'english',
    photo_url: '',
    latitude: null,
    longitude: null,
    area_name: '',
    city: '',
    state: '',
    district: '',
    location_accuracy: 'district_level',
    is_worker: false,
    worker_profile: {
      skills: [],
      experience_levels: {},
      availability_days: [],
      availability_slots: [],
      wage_min: null,
      wage_max: null,
      open_to_no_exp_jobs: true,
      feed_preferences: [],
      willing_to_travel: true
    }
  });

  // Map Refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  // Load districts list on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const res = await api.get('/api/location/districts');
        if (res && res.districts) {
          setDistrictsList(res.districts);
        }
      } catch (e) {
        console.error("Failed to load districts list", e);
      }
    };
    fetchDistricts();
  }, []);

  // Load and play audio on Step 4 or Tech Comfort Popup
  useEffect(() => {
    let activeAudio = null;
    const isComfortPopup = showComfortPopup;
    const isStep4 = currentStep === 4 && !isComfortPopup;
    
    if (isStep4 || isComfortPopup) {
      const fetchAndPlayAudio = async () => {
        try {
          const screenName = isComfortPopup ? "tech_comfort" : "worker_question";
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || ''}/api/onboarding/audio?screen=${screenName}&language=${formData.preferred_language}`
          );
          if (!res.ok) {
            console.warn("Failed to fetch onboarding audio");
            return;
          }
          const data = await res.json();
          
          const audio = new Audio(data.audio_url);
          audioRef.current = audio;
          activeAudio = audio;
          highlightMapRef.current = data.highlight_map || [];
          
          audio.addEventListener('timeupdate', () => {
            const current = audio.currentTime;
            const active = highlightMapRef.current.find(
              h => current >= h.from && current < h.to
            );
            setHighlightedButton(active?.highlight || null);
          });
          
          audio.addEventListener('ended', () => {
            setAudioPlaying(false);
            setHighlightedButton(null);
          });

          audio.addEventListener('error', (e) => {
            console.error("Audio playback error:", e);
            setAudioPlaying(false);
            setHighlightedButton(null);
          });
          
          await audio.play();
          setAudioPlaying(true);
        } catch (err) {
          console.error("Failed to load or play onboarding audio:", err);
          setAudioPlaying(false);
        }
      };
      
      fetchAndPlayAudio();
    }
    
    return () => {
      if (activeAudio) {
        activeAudio.pause();
        activeAudio.src = '';
      }
      setAudioPlaying(false);
      setHighlightedButton(null);
      setHasReplayed(false);
      setShowReplayTooltip(false);
    };
  }, [currentStep, showComfortPopup, formData.preferred_language]);

  const handleReplayAudio = async () => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setAudioPlaying(true);
        
        // Show tooltip after first replay
        if (!hasReplayed) {
          setHasReplayed(true);
          setShowReplayTooltip(true);
          setTimeout(() => {
            setShowReplayTooltip(false);
          }, 3000);
        }
      } catch (err) {
        console.error("Failed to replay audio:", err);
      }
    }
  };

  // Debounced Username availability check
  useEffect(() => {
    if (!formData.username || formData.username.trim().length < 4) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/auth/check-username?username=${formData.username.trim()}`);
        if (res && res.available) {
          setUsernameAvailable(true);
        } else {
          setUsernameAvailable(false);
        }
      } catch (e) {
        setUsernameAvailable(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

  // Leaflet map setup on step 3 if GPS detection is not successful
  useEffect(() => {
    let timer;
    if (currentStep === 3 && !locationDetected) {
      // Small timeout to allow DOM node to render
      timer = setTimeout(() => {
        if (!mapRef.current) return;
        const L = window.L;
        if (!L) {
          console.error("Leaflet.js is not loaded on the window object");
          return;
        }

        // Fix Leaflet marker icon paths for bundle builds
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const defaultLat = formData.latitude || 13.0827; // Chennai
        const defaultLng = formData.longitude || 80.2707;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 12);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([defaultLat, defaultLng], {
          draggable: true
        }).addTo(map);
        markerInstanceRef.current = marker;

        // Listen for drag end to capture location and reverse-geocode it
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          setFormData(prev => ({
            ...prev,
            latitude: parseFloat(pos.lat.toFixed(6)),
            longitude: parseFloat(pos.lng.toFixed(6))
          }));

          try {
            const res = await api.post('/api/location/reverse-geocode', {
              latitude: pos.lat,
              longitude: pos.lng
            });
            if (res) {
              setFormData(prev => ({
                ...prev,
                area_name: res.area_name || '',
                city: res.city || '',
                state: res.state || '',
                district: res.district || '',
                location_accuracy: res.location_accuracy || 'district_level'
              }));
            }
          } catch (e) {
            console.error("Leaflet reverse geocode error:", e);
          }
        });
      }, 100);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [currentStep, locationDetected]);


  // Handle image upload & base64 encoding
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photo_url: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // GPS Location Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser");
      return;
    }

    setIsLoadingLocation(true);
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));

        try {
          const res = await api.post('/api/location/reverse-geocode', {
            latitude: lat,
            longitude: lng
          });
          if (res) {
            setFormData(prev => ({
              ...prev,
              area_name: res.area_name || '',
              city: res.city || '',
              state: res.state || '',
              district: res.district || '',
              location_accuracy: 'exact'
            }));
            setLocationDetected(true);
          }
        } catch (e) {
          console.error("GPS Reverse geocode failed:", e);
          setLocationDetected(false);
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (err) => {
        console.error("GPS detection error:", err);
        setErrorMessage("Could not detect GPS location. Please drag the map pin or select your district below.");
        setLocationDetected(false);
        setIsLoadingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  // Form submission handler
  const handleFinalSubmit = async (customIsWorkerValue = null) => {
    setIsLoading(true);
    setErrorMessage('');

    const targetIsWorker = customIsWorkerValue !== null ? customIsWorkerValue : formData.is_worker;
    
    // Prepare exact final payload
    const payload = {
      ...formData,
      is_worker: targetIsWorker,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      photo_url: formData.photo_url || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      area_name: formData.area_name || null,
      city: formData.city || null,
      state: formData.state || null,
      district: formData.district || null,
      worker_profile: targetIsWorker ? {
        skills: selectedSkills,
        experience_levels: formData.worker_profile.experience_levels,
        availability_days: formData.worker_profile.availability_days,
        availability_slots: formData.worker_profile.availability_slots,
        wage_min: formData.worker_profile.wage_min ? parseInt(formData.worker_profile.wage_min, 10) : null,
        wage_max: formData.worker_profile.wage_max ? parseInt(formData.worker_profile.wage_max, 10) : null,
        open_to_no_exp_jobs: formData.worker_profile.open_to_no_exp_jobs,
        feed_preferences: formData.worker_profile.feed_preferences,
        willing_to_travel: formData.worker_profile.willing_to_travel
      } : null
    };

    try {
      const data = await api.post('/api/auth/signup', payload);
      const token = data.access_token || data.token;
      if (token) {
        login(token, data.user || null);
        // Switch UI language if returned preferred language is Tamil
        const userLanguage = data.user?.preferred_language || 'english';
        localStorage.setItem('ui_language', userLanguage);
        setShowComfortPopup(true);
      } else {
        setErrorMessage("Signup succeeded but no token was returned.");
      }
    } catch (err) {
      setErrorMessage(err.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComfortSubmit = async () => {
    if (!selectedComfort) return;
    setSubmittingComfort(true);
    try {
      await api.patch('/api/users/me/preferences', {
        tech_comfort_level: selectedComfort
      });
      navigate('/home');
    } catch (err) {
      console.error("Failed to save tech comfort preference:", err);
      navigate('/home');
    } finally {
      setSubmittingComfort(false);
      setShowComfortPopup(false);
    }
  };

  // Multi-step validation helper
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        // name, username available, email or phone, passwords match and min 6 chars
        const emailOrPhonePresent = !!(formData.email.trim() || formData.phone.trim());
        const usernameValid = !!(formData.username.trim() && usernameAvailable === true);
        const nameValid = !!formData.name.trim();
        const pwdValid = formData.password.length >= 6 && formData.password === confirmPassword;
        return nameValid && usernameValid && emailOrPhonePresent && pwdValid;
      case 2:
        // date_of_birth, gender, preferred_language
        return !!(formData.date_of_birth && formData.gender && formData.preferred_language);
      case 3:
        // GPS location detected or district selected manually
        return !!(locationDetected || formData.district);
      case 4:
        // Handled by stacked buttons directly
        return true;
      case 5:
        // at least one skill selected
        return selectedSkills.length > 0;
      default:
        return false;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (!isStepValid()) return;
    setErrorMessage('');
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Toggle skills selection
  const handleSkillToggle = (skill) => {
    setSelectedSkills(prev => {
      const isSelected = prev.includes(skill);
      const updated = isSelected ? prev.filter(s => s !== skill) : [...prev, skill];
      
      // Update levels
      const newLevels = { ...formData.worker_profile.experience_levels };
      if (!isSelected) {
        newLevels[skill] = 'beginner';
      } else {
        delete newLevels[skill];
      }

      setFormData(prevData => ({
        ...prevData,
        worker_profile: {
          ...prevData.worker_profile,
          skills: updated,
          experience_levels: newLevels
        }
      }));

      return updated;
    });
  };

  const handleSkillExperienceChange = (skill, level) => {
    setFormData(prev => ({
      ...prev,
      worker_profile: {
        ...prev.worker_profile,
        experience_levels: {
          ...prev.worker_profile.experience_levels,
          [skill]: level
        }
      }
    }));
  };

  // Toggle general list array selections (days, slots, feed)
  const handlePillToggle = (field, value) => {
    setFormData(prev => {
      const arr = prev.worker_profile[field] || [];
      const updated = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return {
        ...prev,
        worker_profile: {
          ...prev.worker_profile,
          [field]: updated
        }
      };
    });
  };

  // Passwords match validation triggers
  const passwordsMatch = formData.password === confirmPassword;
  const showPasswordError = confirmPassword.length > 0 && !passwordsMatch;

  return (
    <div className="page-bg min-h-[100dvh] w-full flex flex-col items-center px-6 pt-8 pb-28 relative">
      {/* ── Center Container ── */}
      <div className="w-full max-w-[420px] flex flex-col items-center">
        
        {/* ── Top Header Section (Same as login) ── */}
        <div className="flex flex-col items-center mb-6">
          <img 
            src={NeighbourlyLogo} 
            alt="Neighbourly Logo" 
            className="h-16 w-auto logo-glow" 
          />
          <h1 className="text-[26px] font-bold tracking-tight mt-2 text-primary-dark font-sans">
            Neighbourly
          </h1>
          
          {/* Step Progress Dots */}
          <div className="flex justify-center items-center gap-2.5 mt-4 mb-1">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                  step <= currentStep
                    ? 'bg-primary'
                    : 'border-2 border-primary bg-white'
                }`}
              />
            ))}
          </div>
          <span className="text-text-secondary text-xs font-semibold">
            Step {currentStep} of 5
          </span>
        </div>

        {/* ── Error Display ── */}
        {errorMessage && (
          <div className="w-full mb-4 flex items-start rounded-2xl p-3.5 text-sm"
            style={{ background: '#FDECEA', color: '#C0392B', border: '1px solid #FADBD8' }}>
            <AlertTriangle size={16} className="mr-2.5 mt-0.5 flex-shrink-0" />
            <span className="font-semibold leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* ── Step Cards ── */}
        <div className="w-full">
          
          {/* ──────────────── STEP 1: CREDENTIALS ──────────────── */}
          {currentStep === 1 && (
            <div className="card p-6 flex flex-col gap-5">
              <div className="mb-1">
                <h2 className="text-[20px] font-bold text-primary-dark">Create your account</h2>
                <p className="text-text-secondary text-xs mt-0.5">Let's get you started</p>
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <span className="input-icon-left"><User size={16} /></span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Username</label>
                <div className="input-wrapper">
                  <span className="input-icon-left"><AtSign size={16} /></span>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                  />
                </div>
                {/* Username live indicator */}
                {usernameAvailable === true && (
                  <span className="flex items-center gap-1 mt-1 text-success text-[11px] font-semibold">
                    <CheckCircle size={12} /> Available
                  </span>
                )}
                {usernameAvailable === false && (
                  <span className="flex items-center gap-1 mt-1 text-danger text-[11px] font-semibold">
                    <XCircle size={12} /> Already taken
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Email address (optional)</label>
                <div className="input-wrapper">
                  <span className="input-icon-left"><Mail size={16} /></span>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="Email address (optional)"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Phone number (optional)</label>
                <div className="input-wrapper">
                  <span className="input-icon-left"><Phone size={16} /></span>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="Phone number (optional)"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                  />
                </div>
                <span className="text-[11px] text-text-secondary mt-1">
                  At least one of email or phone is required
                </span>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon-left"><Lock size={16} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Create password (min 6 chars)"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-icon-right border-none bg-transparent"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="input-icon-left"><Lock size={16} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {showPasswordError && (
                  <span className="text-danger text-[12px] mt-1">
                    Passwords do not match
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ──────────────── STEP 2: BASIC PROFILE ──────────────── */}
          {currentStep === 2 && (
            <div className="card p-6 flex flex-col gap-5">
              <div className="mb-1">
                <h2 className="text-[20px] font-bold text-primary-dark">Tell us about you</h2>
                <p className="text-text-secondary text-xs mt-0.5">This appears on your profile</p>
              </div>

              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-1.5 mt-2">
                <label className="relative w-[80px] h-[80px] rounded-full border-2 border-dashed border-primary flex justify-center items-center cursor-pointer overflow-hidden group">
                  {formData.photo_url ? (
                    <img 
                      src={formData.photo_url} 
                      alt="Avatar Preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Camera className="text-primary group-hover:scale-110 transition-transform" size={24} />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoChange} 
                  />
                </label>
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Date of birth</label>
                <input
                  type="date"
                  className="input-field no-left-icon no-right-icon"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Gender</label>
                <div className="flex gap-2.5">
                  {['Male', 'Female', 'Prefer not to say'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                      className={`flex-1 rounded-[20px] py-2.5 text-xs font-semibold border transition-all ${
                        formData.gender === g
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-primary border-primary hover:bg-slate-50/50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Preferred language</label>
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                  {['Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam', 'English'].map((l) => {
                    const val = l.toLowerCase();
                    const isSelected = formData.preferred_language === val;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, preferred_language: val }))}
                        className={`whitespace-nowrap rounded-[20px] px-4.5 py-2 text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-primary border-primary hover:bg-slate-50/50'
                        }`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 3: LOCATION ──────────────── */}
          {currentStep === 3 && (
            <div className="card p-6 flex flex-col gap-5">
              <div className="mb-1">
                <h2 className="text-[20px] font-bold text-primary-dark">Where are you?</h2>
                <p className="text-text-secondary text-xs mt-0.5">We use this to show nearby opportunities</p>
              </div>

              {/* GPS Button */}
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLoadingLocation}
                className="btn-outline flex items-center justify-center gap-2"
              >
                {isLoadingLocation ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Detecting location...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Detect my location
                  </>
                )}
              </button>

              {/* GPS Confirmation */}
              {locationDetected && (
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-success/30 bg-success/5 text-success">
                  <CheckCircle size={20} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider">Location detected</p>
                    <p className="text-sm font-semibold truncate leading-tight mt-0.5">
                      {formData.area_name ? `${formData.area_name}, ` : ''}{formData.city || ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Leaflet Map Block */}
              {!locationDetected && (
                <div className="flex flex-col gap-2">
                  <div 
                    ref={mapRef} 
                    className="w-full h-[200px] rounded-xl border border-border shadow-inner relative z-10" 
                  />
                  <span className="text-[11px] text-text-secondary font-semibold text-center mt-1">
                    Drag the blue pin to adjust your location exactly
                  </span>
                </div>
              )}

              {/* District Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="form-label">Select your district</label>
                <div className="relative">
                  <select
                    className="input-field no-left-icon appearance-none cursor-pointer"
                    value={formData.district || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  >
                    <option value="">Select your district</option>
                    {districtsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                    <ChevronDown size={16} />
                  </span>
                </div>
                <span className="text-[11px] text-text-secondary mt-1">
                  Can't detect location? Select your district above
                </span>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 4: WORKER QUESTION ──────────────── */}
          {currentStep === 4 && (
            <div className="w-full flex flex-col items-center text-center px-4 py-8">
              <Briefcase size={48} className="text-primary mb-5" />
              <h2 className="text-[22px] font-bold text-primary leading-tight">
                Are you looking for work?
              </h2>
              <p className="text-text-secondary text-[13px] mt-1.5 mb-6 max-w-[280px]">
                You can always update this later from your profile
              </p>

              {/* Audio Guidance Card */}
              <div 
                className="card w-full p-4 mb-6 flex flex-col items-center relative"
                style={{ backgroundColor: '#F0F6FC', borderColor: '#C8DFF0' }}
              >
                <div className="flex items-center gap-2.5 w-full justify-center">
                  <Volume2 size={20} className="text-[#2B7EC1] shrink-0" />
                  <span className="text-primary-dark font-bold text-sm">
                    Let me explain your options
                  </span>
                </div>
                
                {/* Waveform animation */}
                <div className="my-4">
                  <div className={`waveform-container ${audioPlaying ? 'playing' : ''}`}>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                    <div className="waveform-bar"></div>
                  </div>
                </div>
                
                {/* Language label */}
                <span className="text-text-secondary text-[12px] capitalize">
                  Playing in {formData.preferred_language}...
                </span>
                
                {/* Replay Button */}
                <div className="mt-3.5 relative flex flex-col items-center">
                  <button
                    type="button"
                    onClick={handleReplayAudio}
                    className={`w-10 h-10 rounded-full border border-primary text-primary flex items-center justify-center bg-white hover:bg-slate-50 transition-all cursor-pointer ${
                      highlightedButton === 'replay-btn' ? 'btn-highlighted' : ''
                    }`}
                    aria-label="Replay audio"
                  >
                    <RotateCcw size={16} />
                  </button>
                  {showReplayTooltip && (
                    <div className="absolute top-11 whitespace-nowrap bg-primary-dark text-white text-[10px] font-semibold py-1 px-2.5 rounded-lg shadow-md animate-fade-in z-20">
                      Tap anytime to hear again
                    </div>
                  )}
                </div>
              </div>

              {/* Button 1: YES */}
              <div className="w-full flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, is_worker: true }));
                    setCurrentStep(5);
                  }}
                  className={`btn-primary flex items-center justify-center gap-2 ${
                    highlightedButton === 'worker-btn' ? 'btn-highlighted' : ''
                  }`}
                >
                  <Briefcase size={16} />
                  Yes, find me work nearby
                </button>
                <p className="text-xs text-text-secondary mt-1.5 mb-4">
                  Apply to local jobs and get discovered by employers
                </p>
              </div>

              {/* Button 2: NO */}
              <div className="w-full flex flex-col items-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, is_worker: false }));
                    handleFinalSubmit(false);
                  }}
                  className={`btn-outline flex items-center justify-center gap-2 border-primary ${
                    highlightedButton === 'poster-btn' ? 'btn-highlighted' : ''
                  }`}
                >
                  <Heart size={16} />
                  No, I want to post or volunteer
                </button>
                <p className="text-xs text-text-secondary mt-1.5">
                  Post tasks or join community activities
                </p>
              </div>

              {/* Top back button for step 4 since we hide navigation bar */}
              <button
                type="button"
                onClick={handleBack}
                className="mt-10 text-xs font-bold text-primary flex items-center gap-1 hover:underline bg-transparent border-none cursor-pointer"
              >
                <ArrowLeft size={14} /> Go Back
              </button>
            </div>
          )}

          {/* ──────────────── STEP 5: WORKER DETAILS ──────────────── */}
          {currentStep === 5 && (
            <div className="card p-6 flex flex-col gap-6">
              <div className="mb-0.5">
                <h2 className="text-[20px] font-bold text-primary-dark">Your work profile</h2>
                <p className="text-text-secondary text-xs mt-0.5">Helps us match you to the right jobs</p>
              </div>

              {/* Skills Section */}
              <div className="flex flex-col gap-3">
                <label className="text-primary text-[13px] font-semibold">Your skills</label>
                <div className="flex flex-wrap gap-2.5">
                  {['Farming', 'Lifting', 'Cleaning', 'Driving', 'Cooking', 'Plumbing', 'Electrical', 'Carpentry', 'Event Setup', 'Security'].map((skill) => {
                    const val = skill.toLowerCase();
                    const isSelected = selectedSkills.includes(val);
                    return (
                      <div key={skill} className="flex flex-col gap-1.5 items-start">
                        <button
                          type="button"
                          onClick={() => handleSkillToggle(val)}
                          className={`rounded-[20px] px-[14px] py-[6px] text-xs font-semibold border transition-all duration-200 ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-white text-primary border-primary hover:bg-slate-50/50'
                          }`}
                        >
                          {skill}
                        </button>
                        {isSelected && (
                          <div className="relative w-24">
                            <select
                              value={formData.worker_profile.experience_levels[val] || 'beginner'}
                              onChange={(e) => handleSkillExperienceChange(val, e.target.value)}
                              className="input-field no-left-icon no-right-icon !py-1 !pl-2.5 !pr-6 !min-h-0 bg-white border-primary/30 cursor-pointer"
                              style={{ height: '32px', fontSize: '12px' }}
                            >
                              <option value="beginner">Beginner</option>
                              <option value="experienced">Experienced</option>
                              <option value="expert">Expert</option>
                            </select>
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none scale-75">
                              <ChevronDown size={12} />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Available Days */}
              <div className="flex flex-col gap-3">
                <label className="text-primary text-[13px] font-semibold">Available days</label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const val = day.toLowerCase();
                    const isSelected = formData.worker_profile.availability_days.includes(val);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handlePillToggle('availability_days', val)}
                        className={`rounded-[20px] px-[14px] py-[6px] text-xs font-semibold border transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-primary border-primary hover:bg-slate-50/50'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="flex flex-col gap-3">
                <label className="text-primary text-[13px] font-semibold">Preferred time</label>
                <div className="flex gap-2">
                  {['Morning', 'Afternoon', 'Evening'].map((slot) => {
                    const val = slot.toLowerCase();
                    const isSelected = formData.worker_profile.availability_slots.includes(val);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handlePillToggle('availability_slots', val)}
                        className={`flex-1 rounded-[20px] px-[14px] py-[6px] text-xs font-semibold border transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-primary border-primary hover:bg-slate-50/50'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wage Range */}
              <div className="flex flex-col gap-3">
                <label className="text-primary text-[13px] font-semibold">Expected daily wage</label>
                <div className="flex justify-between items-center w-full">
                  <input
                    type="number"
                    placeholder="Min ₹"
                    className="input-field no-left-icon no-right-icon w-[48%]"
                    value={formData.worker_profile.wage_min || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      worker_profile: {
                        ...prev.worker_profile,
                        wage_min: e.target.value ? parseInt(e.target.value, 10) : null
                      }
                    }))}
                  />
                  <span className="text-text-secondary font-bold">-</span>
                  <input
                    type="number"
                    placeholder="Max ₹"
                    className="input-field no-left-icon no-right-icon w-[48%]"
                    value={formData.worker_profile.wage_max || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      worker_profile: {
                        ...prev.worker_profile,
                        wage_max: e.target.value ? parseInt(e.target.value, 10) : null
                      }
                    }))}
                  />
                </div>
              </div>

              {/* Open to no experience toggle */}
              <div className="flex items-center mt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.worker_profile.open_to_no_exp_jobs}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      worker_profile: {
                        ...prev.worker_profile,
                        open_to_no_exp_jobs: e.target.checked
                      }
                    }))}
                  />
                  <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ml-3 text-[13px] font-semibold text-primary">
                    Open to any work, no experience needed
                  </span>
                </label>
              </div>

              {/* Feed Preferences */}
              <div className="flex flex-col gap-3 mt-1">
                <label className="text-primary text-[13px] font-semibold">What are you looking for</label>
                <div className="flex flex-wrap gap-2">
                  {['Part time', 'One day gigs', 'No experience', 'Skill based'].map((pref) => {
                    const val = pref.toLowerCase().replace(/\s/g, '-');
                    const isSelected = formData.worker_profile.feed_preferences.includes(val);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => handlePillToggle('feed_preferences', val)}
                        className={`rounded-[20px] px-[14px] py-[6px] text-xs font-semibold border transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-primary border-primary hover:bg-slate-50/50'
                        }`}
                      >
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Bottom Navigation Buttons (Fixed Bottom Style for steps except 4) ── */}
        {currentStep !== 4 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-[#E2E8F0] px-6 py-4 flex justify-center z-30 shadow-[0_-4px_12px_rgba(13,46,90,0.05)]">
            <div className="w-full max-w-[420px] flex justify-between items-center gap-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="btn-outline w-[40%] flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              
              {currentStep === 5 ? (
                <button
                  type="submit"
                  onClick={() => handleFinalSubmit(true)}
                  disabled={!isStepValid() || isLoading}
                  className="btn-primary w-[56%] flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  Next
                  <Check size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="btn-primary w-[56%] flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Full Screen Loading Overlay ── */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col justify-center items-center">
          <div className="relative flex justify-center items-center">
            {/* Blue pulse animation using primary color */}
            <div className="absolute w-24 h-24 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute w-16 h-16 rounded-full bg-primary/40 animate-pulse" />
            <img 
              src={NeighbourlyLogo} 
              alt="Neighbourly Logo" 
              className="h-16 w-auto relative z-10" 
            />
          </div>
          <span className="text-primary-dark text-sm font-bold tracking-widest uppercase mt-8 animate-pulse">
            Creating account...
          </span>
        </div>
      )}

      {/* ── Comfort Classification Overlay Popup ── */}
      {showComfortPopup && (
        <div className="fixed inset-0 bg-[#0D2E5A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="card w-full max-w-[380px] p-[28px] bg-white flex flex-col items-center">
            <h2 className="text-[18px] font-bold text-primary text-center mb-1 leading-snug">
              Help us personalise your experience
            </h2>
            <p className="text-text-secondary text-[13px] text-center mb-5 max-w-[280px]">
              How comfortable are you with smartphones and apps?
            </p>

            {/* Popup Audio Guidance Card */}
            <div 
              className="card w-full p-3 mb-4 flex flex-col items-center relative"
              style={{ backgroundColor: '#F0F6FC', borderColor: '#C8DFF0' }}
            >
              <div className="flex items-center gap-2 w-full justify-center">
                <Volume2 size={16} className="text-[#2B7EC1] shrink-0" />
                <span className="text-primary-dark font-bold text-xs">
                  Let me explain what each option means
                </span>
              </div>
              
              <div className="my-2">
                <div className={`waveform-container ${audioPlaying ? 'playing' : ''}`}>
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                  <div className="waveform-bar"></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between w-full mt-1 px-1">
                <span className="text-text-secondary text-[11px] capitalize">
                  Playing in {formData.preferred_language}...
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleReplayAudio}
                    className={`w-7 h-7 rounded-full border border-primary text-primary flex items-center justify-center bg-white hover:bg-slate-50 transition-all cursor-pointer ${
                      highlightedButton === 'replay-btn' ? 'btn-highlighted' : ''
                    }`}
                    aria-label="Replay audio"
                  >
                    <RotateCcw size={12} />
                  </button>
                  {showReplayTooltip && (
                    <div className="absolute right-0 top-8 whitespace-nowrap bg-primary-dark text-white text-[9px] font-semibold py-1 px-2 rounded-lg shadow-md animate-fade-in z-20">
                      Tap anytime to hear again
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Three option cards */}
            <div className="w-full flex flex-col gap-3">
              {[
                {
                  id: 'new_to_this',
                  emoji: '🌱',
                  title: 'New to this',
                  sub: "I haven't used apps like this before, I need guidance"
                },
                {
                  id: 'getting_comfortable',
                  emoji: '📱',
                  title: 'Getting comfortable',
                  sub: 'I use some apps but sometimes need help'
                },
                {
                  id: 'know_my_way_around',
                  emoji: '⚡',
                  title: 'I know my way around',
                  sub: 'I am comfortable using smartphones and apps'
                }
              ].map(opt => {
                const isSelected = selectedComfort === opt.id;
                const isHighlighted = highlightedButton === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedComfort(opt.id)}
                    className={`relative w-full p-4 border border-[#C8DFF0] rounded-xl flex items-center gap-3.5 text-left cursor-pointer transition-all duration-250 ${
                      isSelected ? 'border-primary bg-[#F0F6FC]' : 'bg-white hover:bg-slate-50'
                    } ${isHighlighted ? 'btn-highlighted' : ''}`}
                  >
                    <span className="text-2xl select-none">{opt.emoji}</span>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-bold text-[14px] text-text-primary leading-tight">{opt.title}</p>
                      <p className="text-text-secondary text-[12px] leading-snug mt-0.5">{opt.sub}</p>
                    </div>
                    {isSelected && (
                      <span className="absolute top-2.5 right-2.5 bg-primary text-white rounded-full p-0.5">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Continue Button */}
            {selectedComfort && (
              <button
                type="button"
                onClick={handleComfortSubmit}
                disabled={submittingComfort}
                className="btn-primary mt-5 flex items-center justify-center gap-1.5"
              >
                {submittingComfort ? 'Saving...' : 'Continue'}
                {!submittingComfort && <ArrowRight size={16} />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Signup;
