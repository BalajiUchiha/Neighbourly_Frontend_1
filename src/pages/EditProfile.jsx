import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, User, Settings2 } from 'lucide-react';

export default function EditProfile() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col font-sans relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
      
      {/* Decorative background glow blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full filter blur-[80px]"
           style={{ background: 'rgba(43, 126, 193, 0.15)' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full filter blur-[70px]"
           style={{ background: 'rgba(139, 92, 246, 0.12)' }} />

      {/* Top Header Bar */}
      <div className="flex items-center gap-3 px-4 py-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full hover:bg-slate-800/80 text-slate-300 transition-all active:scale-90"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="font-bold text-[15px] text-white">Edit Profile</span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        
        {/* Coming soon card */}
        <div className="w-full max-w-[360px] bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[32px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.37)] flex flex-col items-center gap-6 transition-all duration-300 hover:border-slate-700/60 hover:shadow-[0_12px_48px_rgba(43,126,193,0.15)] group">
          
          {/* Animated Glow Icon */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center relative bg-gradient-to-tr from-primary to-[#8B5CF6] p-[2px] transition-transform duration-500 group-hover:rotate-[360deg]">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white">
              <User size={32} className="text-primary group-hover:scale-110 transition-transform" />
            </div>
            {/* Ambient indicator dot */}
            <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
          </div>

          <div>
            <h2 className="text-[22px] font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
              Coming Soon <Sparkles size={18} className="text-amber-400 animate-pulse" />
            </h2>
            <p className="text-[12px] text-slate-400 font-medium leading-relaxed mt-2.5 max-w-[260px] mx-auto">
              We are polishing the profile customizer. You will soon be able to edit your profile information and update your avatar!
            </p>
          </div>

          {/* Premium Progress Meter */}
          <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden border border-slate-700/30">
            <div className="bg-gradient-to-r from-primary to-[#8B5CF6] h-full rounded-full animate-pulse" style={{ width: '85%' }} />
          </div>

          <button 
            onClick={() => navigate(-1)}
            className="w-full py-3.5 rounded-2xl text-[13px] font-bold text-white transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #2B7EC1 0%, #1E40AF 100%)',
              boxShadow: '0 4px 16px rgba(43, 126, 193, 0.25)'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
