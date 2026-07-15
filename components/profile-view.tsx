"use client"

import { useState, useEffect } from "react"
import { User, Calendar, Hash, ShieldCheck, Check, LogOut, Loader2, Sparkles, Coins, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

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

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const handleLogout = () => {
    localStorage.removeItem("homiepay-user-session")
    window.location.reload() // Force reload to clear all states cleanly
  }

  return (
    <div className="w-[95vw] max-w-3xl relative left-1/2 -translate-x-1/2 sm:w-full sm:left-auto sm:translate-x-0 mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Premium Gradient Header Card */}
      <div className="relative rounded-3xl p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xl shadow-slate-100 dark:shadow-none overflow-hidden flex flex-col sm:flex-row items-center gap-6">
        
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
        
        {/* Initials Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-teal-400 flex items-center justify-center text-white text-2xl font-black shadow-md border-4 border-white dark:border-slate-800 shrink-0 scale-105 animate-pulse-slow">
          {getInitials(userSession.full_name)}
        </div>

        {/* Profile Meta details */}
        <div className="text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{userSession.full_name}</h2>
            <div className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Verified Cloud
            </div>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold tracking-wide">@{userSession.username}</p>
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
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your account is fully protected. Your password is securely encrypted, and all your groups, shared bills, and expenses are safely backed up to the cloud.
            </p>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full py-5 rounded-xl border-rose-200 dark:border-rose-950 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-350 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout from Device
            </Button>
          </div>

        </div>
      </div>

    </div>
  )
}
