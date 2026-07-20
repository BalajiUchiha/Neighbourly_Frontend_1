import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import NeighbourlyLogo from '../assets/Neighbourly_logo_1_.png';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // State management
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect to home if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Field validation
    if (!identifier.trim()) {
      setErrorMessage('Please enter your username, email or phone');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const data = await api.post('/api/auth/login', { identifier, password });
      
      const token = data.token || data.access_token || data.accessToken;
      if (token) {
        login(token, data.user || null);
        navigate('/home');
      } else {
        setErrorMessage('Authentication succeeded but no token was returned.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center items-center px-4 py-10"
  style={{ background: '#F0F6FC' }}>
  <div className="w-full max-w-[400px] bg-white rounded-[36px] overflow-hidden shadow-[0_2px_32px_rgba(13,46,90,0.10)] flex flex-col">

    {/* ── Blob hero top ── */}
    <div className="relative h-48 bg-white flex-shrink-0">
      {/* blobs */}
      <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full"
        style={{ background: '#2B7EC1', opacity: 0.18 }} />
      <div className="absolute top-2 right-2 w-[90px] h-[90px] rounded-full"
        style={{ background: '#4A9FD4', opacity: 0.28 }} />
      <div className="absolute -top-5 right-12 w-16 h-16 rounded-full"
        style={{ background: '#85C4E8', opacity: 0.45 }} />
      {/* heading */}
      <div className="absolute bottom-4 left-7">
        <h1 className="text-[26px] font-bold tracking-tight mb-1"
          style={{ color: '#0D2E5A' }}>Login</h1>
        <p className="text-xs font-normal" style={{ color: '#4A6F8A' }}>
          Please sign in to continue
        </p>
      </div>
    </div>

    {/* ── Form body ── */}
    <div className="flex flex-col gap-5 px-7 pt-7 pb-4">

      {/* Identifier */}
      <div className="flex flex-col gap-1.5">
        <label className="form-label">Username, Email or Phone</label>
        <div className="flex items-center gap-2 pb-2"
          style={{ borderBottom: '1.5px solid #C8DFF0' }}>
          <User size={15} strokeWidth={2} style={{ color: '#4A9FD4', flexShrink: 0 }} />
          <input
            type="text"
            className="flex-1 border-none outline-none bg-transparent text-sm"
            style={{ color: '#0D1B2A', fontFamily: 'inherit' }}
            placeholder="Enter username, email or phone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={isLoading}
          />
          {identifier && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#2B7EC1" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="form-label">Password</label>
        <div className="flex items-center gap-2 pb-2"
          style={{ borderBottom: '1.5px solid #C8DFF0' }}>
          <Lock size={15} strokeWidth={2} style={{ color: '#4A9FD4', flexShrink: 0 }} />
          <input
            type={showPassword ? 'text' : 'password'}
            className="flex-1 border-none outline-none bg-transparent text-sm"
            style={{ color: '#0D1B2A', fontFamily: 'inherit' }}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="focus:outline-none" disabled={isLoading}
            style={{ color: '#A0BDD0' }}>
            {showPassword
              ? <EyeOff size={15} strokeWidth={2} />
              : <Eye size={15} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Forgot */}
      <div className="flex justify-end -mt-3">
        <a href="#forgot-password" onClick={(e) => e.preventDefault()}
          className="text-[11px] font-medium hover:underline"
          style={{ color: '#4A9FD4' }}>
          Forgot password?
        </a>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="flex items-start rounded-xl p-3 text-sm"
          style={{ background: '#FDECEA', color: '#C0392B', border: '1px solid #FADBD8' }}>
          <AlertTriangle size={15} className="mr-2 mt-0.5 flex-shrink-0" />
          <span className="font-medium leading-tight">{errorMessage}</span>
        </div>
      )}

      {/* Login button */}
      <button type="submit" onClick={handleSubmit}
        className="w-full rounded-full py-3.5 text-white text-xs font-bold tracking-widest uppercase disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #2B7EC1 0%, #0D2E5A 100%)',
          boxShadow: '0 8px 24px -6px rgba(13,46,90,0.35)',
          border: 'none'
        }}
        disabled={isLoading}>
        {isLoading ? (
          <span className="flex justify-center items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Logging in...
          </span>
        ) : 'Login'}
      </button>
    </div>

    {/* ── Bottom ── */}
    <div className="flex flex-col items-center gap-3 px-7 pb-8 pt-2">
      <div className="flex items-center gap-2.5 w-full">
        <div className="flex-1 h-px" style={{ background: '#C8DFF0' }} />
        <span className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: '#A0BDD0' }}>or</span>
        <div className="flex-1 h-px" style={{ background: '#C8DFF0' }} />
      </div>
      <p className="text-xs" style={{ color: '#4A6F8A' }}>
        Don't have an account?{' '}
        <button onClick={() => navigate('/signup')}
          className="font-semibold bg-transparent border-none cursor-pointer p-0"
          style={{ color: '#2B7EC1' }}>
          Sign up
        </button>
      </p>
      <p className="text-[10px] text-center max-w-[240px] leading-relaxed"
        style={{ color: '#A0BDD0' }}>
        By continuing you agree to our{' '}
        <a href="#" className="underline" style={{ color: '#A0BDD0' }}>Terms</a> &{' '}
        <a href="#" className="underline" style={{ color: '#A0BDD0' }}>Privacy Policy</a>
      </p>
    </div>

  </div>
</div>
  )
};
export default Login;