"use client"

import { useState, useEffect } from "react"
import { User, Calendar, Hash, ShieldCheck, Check, LogOut, Loader2, Sparkles, Coins, Users, LifeBuoy, Bell, Lock, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { SecurityPage } from "@/components/security-page"
import { AvatarPage } from "@/components/avatar-page"

interface ProfileViewProps {
  userSession: { id: string; username: string; full_name: string }
  onProfileUpdate: (session: { id: string; username: string; full_name: string }) => void
  totalGroups: number
  totalBills: number
}

export function ProfileView({ userSession, onProfileUpdate, totalGroups, totalBills }: ProfileViewProps) {
  const [fullName, setFullName] = useState(userSession.full_name)
  const [isUpdating, setIsUpdating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [mounted, setMounted] = useState(false)
  
  // Support Ticket State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [supportSubject, setSupportSubject] = useState("")
  const [supportMessage, setSupportMessage] = useState("")
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false)
  const [showSecurityPage, setShowSecurityPage] = useState(false)
  const [showAvatarPage, setShowAvatarPage] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [pushEnabled, setPushEnabled] = useState(false)
  const [isTogglingPush, setIsTogglingPush] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedAvatar = localStorage.getItem("homiepay-avatar")
    if (savedAvatar) {
      setAvatarUrl(savedAvatar)
    }
    const checkPush = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(!!subscription);
      }
    }
    checkPush()
  }, [])

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

  const togglePushNotifications = async () => {
    setIsTogglingPush(true)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const registration = await navigator.serviceWorker.ready;
  
      if (pushEnabled) {
        // Turn off
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
          await subscription.unsubscribe();
        }
        localStorage.setItem('homiepay-push-opt-out', 'true');
        setPushEnabled(false);
      } else {
        // Turn on
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert("Please enable notifications in your browser settings.");
          setIsTogglingPush(false);
          return;
        }
        const vapidPublicKey = 'BA8b7deu7x4Y8zadSwR1HXtLWzhHrvI7WKB2jCEM5l8BGrUIxkQSgHlSxgz0y_VG-1SelmJunP7LWJTN_34gg6Q';
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
        const subData = JSON.parse(JSON.stringify(subscription));
        await supabase.from('push_subscriptions').upsert({
          user_id: userSession.id,
          endpoint: subData.endpoint,
          p256dh: subData.keys.p256dh,
          auth: subData.keys.auth
        }, { onConflict: 'user_id,endpoint' });
        localStorage.removeItem('homiepay-push-opt-out');
        setPushEnabled(true);
      }
    } catch (e) {
      console.error("Error toggling push notifications:", e);
    }
    setIsTogglingPush(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setSuccess(false)
    setErrorMsg("")

    const cleanName = fullName.trim()
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg("Please enter a valid full name.")
      setIsUpdating(false)
      return
    }

    try {
      // Update in Supabase users table
      const { error } = await supabase
        .from("users")
        .update({ full_name: cleanName })
        .eq("id", userSession.id)

      if (error) throw error

      // Trigger callback to update parent state
      onProfileUpdate({
        ...userSession,
        full_name: cleanName
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: any) {
      console.error("Failed to update profile name:", err)
      setErrorMsg(err.message || "Could not save changes to the cloud. Try again!")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLogout = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
          await subscription.unsubscribe();
        }
      }
    } catch (e) {
      console.error("Error cleaning up push subscription on logout:", e);
    }
    localStorage.removeItem("homiepay-user-session")
    window.location.reload() // Force reload to clear all states cleanly
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supportSubject.trim() || !supportMessage.trim()) return
    setIsSubmittingTicket(true)
    
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: userSession.id,
        subject: supportSubject.trim(),
        message: supportMessage.trim()
      })
      
      if (error) throw error
      
      setIsSupportModalOpen(false)
      setSupportSubject("")
      setSupportMessage("")
      alert("Support ticket submitted successfully! Our team will look into it.")
    } catch (err: any) {
      console.error("Failed to submit ticket:", err)
      alert(err.message || "Could not submit ticket. Please try again.")
    } finally {
      setIsSubmittingTicket(false)
    }
  }

  if (showSecurityPage) {
    return <SecurityPage userSession={userSession} onBack={() => setShowSecurityPage(false)} />
  }

  if (showAvatarPage) {
    return (
      <AvatarPage 
        currentAvatar={avatarUrl}
        onClose={() => setShowAvatarPage(false)}
        onSave={(url) => {
          setAvatarUrl(url)
          localStorage.setItem("homiepay-avatar", url)
          setShowAvatarPage(false)
        }}
      />
    )
  }

  if (!mounted) return null

  return (
    <div className="w-[95vw] max-w-3xl relative left-1/2 -translate-x-1/2 sm:w-full sm:left-auto sm:translate-x-0 mx-auto space-y-6 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Premium Gradient Header Card */}
      <div className="relative rounded-3xl p-5 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden flex flex-row items-center gap-5 sm:gap-6">
        
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
        
        {/* Initials/Image Avatar */}
        <div className="relative shrink-0 scale-105">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-teal-400 flex items-center justify-center text-white text-3xl sm:text-5xl font-black shadow-md border-4 border-white dark:border-slate-800 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover scale-[1.35]" />
            ) : (
              getInitials(userSession.full_name)
            )}
          </div>
          <button 
            type="button"
            onClick={() => setShowAvatarPage(true)}
            className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-1.5 sm:p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group z-10"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-emerald-500 transition-colors" />
          </button>
        </div>

        {/* Profile Meta details */}
        <div className="text-left flex flex-col justify-center flex-1 space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">{userSession.full_name}</h2>
          <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold tracking-wide">@{userSession.username}</p>
          
          <div className="pt-1.5">
            <div className="inline-flex px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-[9px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide items-center gap-1.5 w-fit">
              <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Verified Cloud
            </div>
          </div>
        </div>
      </div>

      {/* Profile Dashboard Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* left column: Editable details */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/90 dark:border-slate-800/90 shadow-lg shadow-slate-100/50 dark:shadow-none space-y-6">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            Account Details
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Full Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isUpdating}
                  required
                  className="pl-9 py-5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus-visible:ring-emerald-500 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Unique Username (Read-Only)
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  value={userSession.username}
                  disabled
                  className="pl-9 py-5 rounded-xl border-slate-100 dark:border-slate-905 bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 text-xs font-bold font-mono lowercase"
                />
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500">Usernames are globally unique and cannot be modified.</p>
            </div>

            {/* Success and Error messages */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-bold animate-in fade-in duration-300">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Profile details updated in the cloud successfully!</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold animate-in fade-in duration-300">
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isUpdating}
              className="px-6 py-5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white dark:text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </div>

        {/* right column: stats, appearance and security info */}
        <div className="space-y-6">
          
          {/* stats */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-lg shadow-slate-100/50 dark:shadow-none space-y-4">
            <h3 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              My Activity
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/40 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shadow-sm">
                    <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-450" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Active Groups</p>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100">{totalGroups}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/40 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shadow-sm">
                    <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-450" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Settled Bills</p>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100">{totalBills}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* security and cloud status */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800/90 shadow-lg shadow-slate-100/50 dark:shadow-none space-y-3">
            <h3 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-450" />
              Your Privacy & Security
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Your account is fully protected. Your password is securely encrypted, and all your groups, shared bills, and expenses are safely backed up to the cloud.
            </p>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-800/40 rounded-xl mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shadow-sm">
                  <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-450" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Push Notifications</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {pushEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={pushEnabled}
                  onChange={togglePushNotifications}
                  disabled={isTogglingPush}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            <Button
              onClick={() => setShowSecurityPage(true)}
              variant="outline"
              className="w-full py-5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Lock className="h-3.5 w-3.5" />
              Change Password & Security
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full py-5 rounded-xl border-rose-200 dark:border-rose-950 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-350 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout from Device
            </Button>
            
            <Button
              onClick={() => setIsSupportModalOpen(true)}
              variant="outline"
              className="w-full mt-3 py-5 rounded-xl border-indigo-200 dark:border-indigo-950 text-indigo-600 dark:text-indigo-450 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-700 dark:hover:text-indigo-350 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Contact Help Desk
            </Button>
          </div>

        </div>
      </div>

      {/* Etriq Branding Card */}
      <div className="w-full mt-10 mb-6 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-6 duration-500 delay-150">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <span>Powered By</span>
          <span className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 rounded-full"></span>
        </div>
        
        <a 
          href="https://etriq.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200/90 dark:border-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-slate-200 dark:hover:border-slate-700/80 transition-all duration-300 w-full max-w-lg flex flex-col sm:flex-row items-center gap-6 overflow-hidden cursor-pointer"
        >
          {/* Subtle glow effect on hover */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-blue-500/0 group-hover:bg-blue-500/5 blur-3xl transition-colors duration-500 pointer-events-none" />
          
          {/* Etriq Logo / Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-950 flex flex-col items-center justify-center shrink-0 shadow-md border border-slate-200 dark:border-slate-800 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
            <img src="/etriqlogodark.png" alt="Etriq" className="w-full h-full object-contain p-2 dark:hidden" />
            <img src="/etriqlogo.webp" alt="Etriq" className="w-full h-full object-contain p-2 hidden dark:block" />
          </div>

          <div className="text-center sm:text-left space-y-2">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Etriq</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              We build beautiful, highly-functional digital experiences. Discover our latest projects and see how we can transform your ideas into reality.
            </p>
            <div className="pt-1 inline-flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
              Visit Website <Sparkles className="h-3 w-3 ml-1" />
            </div>
          </div>
        </a>
      </div>

      {/* Support Ticket Modal */}
      <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <LifeBuoy className="h-5 w-5" />
              Contact Help Desk
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitTicket} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Subject</label>
              <Input
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                placeholder="e.g. Bug report, Feature request..."
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Message</label>
              <Textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Describe your issue or feedback in detail..."
                required
                className="w-full min-h-[120px] resize-none"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSupportModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingTicket} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmittingTicket ? "Submitting..." : "Submit Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
