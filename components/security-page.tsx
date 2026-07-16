"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ShieldCheck, Lock, CheckCircle, AlertCircle, Eye, EyeOff, Key, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { SECURITY_QUESTIONS } from "@/components/security-question-modal"

interface SecurityPageProps {
  userSession: { id: string; username: string; full_name: string }
  onBack: () => void
}

export function SecurityPage({ userSession, onBack }: SecurityPageProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<"password" | "question">("password")
  
  useEffect(() => setMounted(true), [])
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Security Question State
  const [questionCurrentPassword, setQuestionCurrentPassword] = useState("")
  const [newQuestion, setNewQuestion] = useState(SECURITY_QUESTIONS[0])
  const [newAnswer, setNewAnswer] = useState("")
  const [questionError, setQuestionError] = useState("")
  const [questionSuccess, setQuestionSuccess] = useState("")
  const [isUpdatingQuestion, setIsUpdatingQuestion] = useState(false)

  // Secure browser-native SHA-256 password hashing
  const hashText = async (text: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.")
      return
    }

    setIsUpdatingPassword(true)
    try {
      // Hash current password and verify
      const hashedCurrent = await hashText(currentPassword)
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", userSession.id)
        .single()

      if (fetchError || !userData) {
        throw new Error("Could not verify current password.")
      }

      if (userData.password_hash !== hashedCurrent) {
        throw new Error("Current password is incorrect.")
      }

      // Hash new password and update
      const hashedNew = await hashText(newPassword)
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: hashedNew })
        .eq("id", userSession.id)

      if (updateError) throw updateError

      setPasswordSuccess("Password successfully updated.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setPasswordError(err.message || "An error occurred.")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuestionError("")
    setQuestionSuccess("")

    if (!questionCurrentPassword || !newAnswer) {
      setQuestionError("Password and new answer are required.")
      return
    }

    setIsUpdatingQuestion(true)
    try {
      // Hash current password and verify
      const hashedCurrent = await hashText(questionCurrentPassword)
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", userSession.id)
        .single()

      if (fetchError || !userData) {
        throw new Error("Could not verify current password.")
      }

      if (userData.password_hash !== hashedCurrent) {
        throw new Error("Current password is incorrect.")
      }

      // Hash new answer and update
      const hashedAnswer = await hashText(newAnswer.trim().toLowerCase())
      const { error: updateError } = await supabase
        .from("users")
        .update({ 
          security_question: newQuestion,
          security_answer_hash: hashedAnswer
        })
        .eq("id", userSession.id)

      if (updateError) throw updateError

      setQuestionSuccess("Security question successfully updated.")
      setQuestionCurrentPassword("")
      setNewAnswer("")
    } catch (err: any) {
      setQuestionError(err.message || "An error occurred.")
    } finally {
      setIsUpdatingQuestion(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Privacy & Security
        </h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="p-6 max-w-lg mx-auto w-full flex-1 pb-20">
        
        {/* Tabs */}
        <div className="flex bg-slate-200 dark:bg-slate-900 p-1 rounded-xl mb-8">
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "password"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Change Password
          </button>
          <button
            onClick={() => setActiveTab("question")}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "question"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Security Question
          </button>
        </div>

        {/* Change Password Tab */}
        {activeTab === "password" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-3">
                <Lock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Update Password</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ensure your account stays secure by updating your password regularly.</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Current Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="pl-9 py-5 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pl-9 py-5 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-9 py-5 rounded-xl text-sm"
                  />
                </div>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {passwordSuccess}
                </div>
              )}

              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
              >
                {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isUpdatingPassword ? "Saving..." : "Save New Password"}
              </Button>
            </form>
          </div>
        )}

        {/* Security Question Tab */}
        {activeTab === "question" && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Security Question</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update your security question to ensure you can recover your account.</p>
            </div>

            <form onSubmit={handleUpdateQuestion} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Current Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={questionCurrentPassword}
                    onChange={(e) => setQuestionCurrentPassword(e.target.value)}
                    required
                    className="pl-9 py-5 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Choose Question</label>
                <div className="relative">
                  <select
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">New Answer</label>
                <Input
                  type="text"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Your secret answer..."
                  required
                  className="py-5 rounded-xl text-sm font-semibold"
                />
              </div>

              {questionError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {questionError}
                </div>
              )}

              {questionSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {questionSuccess}
                </div>
              )}

              <Button
                type="submit"
                disabled={isUpdatingQuestion}
                className="w-full py-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
              >
                {isUpdatingQuestion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isUpdatingQuestion ? "Saving..." : "Update Security Question"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
