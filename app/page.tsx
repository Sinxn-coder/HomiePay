"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Wallet, ArrowRight, Sparkles, DollarSign, Send, Landmark, Coins, LogOut, Megaphone, Lock, Settings2 } from "lucide-react"
import { LoginPage } from "@/components/login-page"
import { SecurityQuestionModal } from "@/components/security-question-modal"
import { supabase } from "@/lib/supabase"

// Import the main container dynamically with SSR disabled to make loading instantaneous
const ExpenseSplitter = dynamic(
  () => import("@/components/expense-splitter").then((mod) => mod.ExpenseSplitter),
  { ssr: false }
)

const MAINTENANCE_MESSAGES = [
  "HomiePay is currently undergoing scheduled upgrades to improve your experience. We'll be right back!",
  "We are tuning up the engines to make splitting bills even faster and smoother.",
  "Hang tight! Our developers are adding some fresh new magic to the app."
];

function MaintenanceScreen() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % MAINTENANCE_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
      <div className="relative w-64 h-64 mb-8">
        <div className="absolute inset-0 bg-emerald-100 rounded-full blur-3xl animate-pulse"></div>
        <img src="/maintenance.webp" alt="Maintenance Mode" className="w-full h-full object-contain relative z-10 drop-shadow-sm" />
      </div>
      <h1 className="text-4xl font-black text-emerald-900 tracking-tight mb-4 flex items-center justify-center gap-3 w-full">
        System Maintenance
      </h1>
      <div className="h-24 flex items-center justify-center w-full max-w-md mx-auto">
        <p
          key={msgIndex}
          className="text-emerald-700 text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          {MAINTENANCE_MESSAGES[msgIndex]}
        </p>
      </div>
      <div className="mt-8 flex gap-2 justify-center">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
      </div>
    </div>
  );
}

export default function Home() {
  const [isStarted, setIsStarted] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [userSession, setUserSession] = useState<{ id: string; username: string; full_name: string } | null>(null)
  const [animationDone, setAnimationDone] = useState(false)
  const [needsSecurityQuestion, setNeedsSecurityQuestion] = useState(false)
  const [systemSettings, setSystemSettings] = useState<{ maintenance_mode: boolean, announcement_message: string | null } | null>(null)

  // Fetch System Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle()
        if (!error && data) {
          setSystemSettings(data)
        }
      } catch (e) {
        console.error("Failed to fetch system settings", e)
      }
    }
    fetchSettings()
  }, [])

  // Push Notifications Setup
  const registerPushNotifications = async (userId: string) => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      
      // VAPID Public Key generated for the app
      const vapidPublicKey = 'BA8b7deu7x4Y8zadSwR1HXtLWzhHrvI7WKB2jCEM5l8BGrUIxkQSgHlSxgz0y_VG-1SelmJunP7LWJTN_34gg6Q';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      const subData = JSON.parse(JSON.stringify(subscription));

      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subData.endpoint,
        p256dh: subData.keys.p256dh,
        auth: subData.keys.auth
      }, { onConflict: 'user_id,endpoint' });
      
    } catch (e) {
      console.error("Push registration failed", e);
    }
  }

  // Utility to convert Base64 URL safe to Uint8Array for VAPID
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if a logged-in user needs to set a security question
  const checkSecurityQuestion = async (userId: string) => {
    try {
      if (!navigator.onLine) return // skip check offline
      const { data, error } = await supabase
        .from("users")
        .select("security_question")
        .eq("id", userId)
        .maybeSingle()
      if (!error && data && !data.security_question) {
        setNeedsSecurityQuestion(true)
      }
    } catch (e) {
      // silently skip — don't block the user if DB check fails
    }
  }

  // Recover active session from localStorage on mount
  useEffect(() => {
    const cachedSession = localStorage.getItem("homiepay-user-session")
    if (cachedSession) {
      try {
        const session = JSON.parse(cachedSession)
        setUserSession(session)
        setIsStarted(true) // Automatically bypass landing page if logged in!
        checkSecurityQuestion(session.id)
        registerPushNotifications(session.id)
      } catch (e) {
        localStorage.removeItem("homiepay-user-session")
      }
    }
  }, [])

  const handleLaunch = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsStarted(true)
    }, 600) // matches transition duration
  }

  const handleLogout = () => {
    localStorage.removeItem("homiepay-user-session")
    setUserSession(null)
  }

  if (systemSettings?.maintenance_mode) {
    return (
      <MaintenanceScreen />
    )
  }

  if (isStarted) {
    return (
      <div 
        className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300 ${
          animationDone ? "" : "animate-in fade-in zoom-in-95 duration-500"
        }`}
        onAnimationEnd={() => setAnimationDone(true)}
      >
        {/* Global Announcement Banner */}
        {systemSettings?.announcement_message && (
          <div className="w-full bg-indigo-600 text-white px-4 py-2.5 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-md z-50 animate-in slide-in-from-top-2">
            <Megaphone className="h-4 w-4 shrink-0" />
            <span className="truncate">{systemSettings.announcement_message}</span>
          </div>
        )}

        {/* Dynamic Main Workspace Container */}
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:py-8 flex flex-col justify-center">
          {!userSession ? (
            <LoginPage onSuccess={(session) => {
              setUserSession(session);
              localStorage.setItem("homiepay-user-session", JSON.stringify(session));
              checkSecurityQuestion(session.id);
              registerPushNotifications(session.id);
            }} />
          ) : (
            <ExpenseSplitter 
              userSession={userSession} 
              onProfileUpdate={(updatedSession) => {
                setUserSession(updatedSession);
                localStorage.setItem("homiepay-user-session", JSON.stringify(updatedSession));
              }}
            />
          )}

          {/* Security Question Setup Modal — shown for users who haven't set one yet */}
          {userSession && needsSecurityQuestion && (
            <SecurityQuestionModal
              userId={userSession.id}
              fullName={userSession.full_name}
              onComplete={() => setNeedsSecurityQuestion(false)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/20 text-slate-800 flex flex-col relative overflow-hidden transition-all duration-700 ${
        isExiting ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* React 19 Standard Stylesheet Injection for Advanced Animations */}
      <style>{`
        @keyframes float-soft {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(0.5deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(8px); }
        }
        @keyframes laser-flow {
          0% { stroke-dashoffset: 80; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.15); }
        }
        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-30px, 30px) scale(1.1); }
        }
        @keyframes cash-pulse {
          0%, 100% { transform: scale(1) translate(-50%, -50%); opacity: 0.8; }
          50% { transform: scale(1.2) translate(-50%, -50%); opacity: 1; }
        }
        @keyframes cash-flow-1 {
          0% { left: 20%; top: 30%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 80%; top: 30%; opacity: 0; }
        }
        @keyframes cash-flow-2 {
          0% { left: 45%; top: 75%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 80%; top: 30%; opacity: 0; }
        }
        .animate-float-soft {
          animation: float-soft 6s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 5s ease-in-out infinite;
        }
        .animate-laser {
          stroke-dasharray: 8;
          animation: laser-flow 3.5s linear infinite;
        }
        .animate-orb-1 {
          animation: orb-float-1 16s ease-in-out infinite;
        }
        .animate-orb-2 {
          animation: orb-float-2 12s ease-in-out infinite;
        }
        .animate-cash-1 {
          animation: cash-flow-1 4s infinite linear;
        }
        .animate-cash-2 {
          animation: cash-flow-2 4s infinite linear;
          animation-delay: 2s;
        }
        .text-glow {
          text-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .pulse-emerald {
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          animation: pulse-emerald-seq 2s infinite;
        }
        @keyframes pulse-emerald-seq {
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* Fresh Light Theme Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-emerald-300/10 blur-[130px] pointer-events-none animate-orb-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-teal-300/10 blur-[130px] pointer-events-none animate-orb-2" />

      {/* Modern Light Theme Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_45%,#000_70%,transparent_100%)] opacity-20" />

      {/* Minimal Header */}
      <header className="relative w-full max-w-4xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/15 border border-emerald-400/20">
            <Wallet className="h-5 w-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <span className="text-sm font-black text-slate-900 tracking-wider uppercase">HomiePay</span>
            <span className="text-[8px] block text-emerald-600 font-extrabold tracking-widest mt-[-2px] uppercase">PRO EDITION</span>
          </div>
        </div>

        <button 
          onClick={handleLaunch}
          className="text-xs font-bold text-slate-800 hover:text-emerald-700 transition-all border border-slate-200 hover:border-emerald-300/60 px-3.5 py-1.5 rounded-xl bg-white/70 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1"
        >
          Launch App
          <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
        </button>
      </header>

      {/* Fully Redesigned Center Hero Section */}
      <main className="relative flex-1 max-w-3xl mx-auto px-6 flex flex-col items-center justify-center text-center gap-9 z-10 py-10">
        
        {/* Animated Badge Tag */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 rounded-full text-[10px] font-extrabold text-emerald-700 tracking-widest uppercase shadow-sm">
          <Sparkles className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} />
          Zero math friction • Optimal settlement engine
        </div>

        {/* Clean, Impactful Header Copy */}
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 leading-[1.08] tracking-tight">
            Perfect bill splits.<br />
            <span className="relative inline-block mt-1">
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent text-glow">
                Zero hassle.
              </span>
              <span className="absolute bottom-1 left-0 w-full h-[6px] bg-emerald-400/20 rounded-full blur-[1px]" />
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-lg mx-auto font-medium">
            Take the headache out of group outings, shared grocery bills, and roommate expenses. Split complex bills dynamically among multiple payers under strict budget constraints, backed up securely to the cloud.
          </p>
        </div>

        {/* Sleek Pulse Glow Launch Button */}
        <div className="w-full sm:w-auto relative">
          <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 blur-md animate-pulse" />
          <button
            onClick={handleLaunch}
            className="relative group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider rounded-xl shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer uppercase border border-slate-800"
          >
            Launch HomiePay
            <ArrowRight className="h-4 w-4 stroke-[3] group-hover:translate-x-1 transition-transform text-emerald-400" />
          </button>
        </div>



      </main>

      {/* Minimal Footer */}
      <footer className="relative w-full py-6 flex justify-center items-center z-10 text-[9px] text-slate-400 font-bold tracking-widest uppercase">
        <span>HomiePay PRO • Zero Math Friction</span>
      </footer>
    </div>
  )
}
