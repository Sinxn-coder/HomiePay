"use client"

import { useState, useCallback } from "react"
import { Wallet, User, Lock, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff, CheckCircle, Mail, ChevronDown, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { SECURITY_QUESTIONS } from "@/components/security-question-modal"

interface LoginPageProps {
  onSuccess: (session: { id: string; username: string; full_name: string }) => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [registerStep, setRegisterStep] = useState<1 | 2>(1)
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Security question state (registration only)
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0])
  const [securityAnswer, setSecurityAnswer] = useState("")

  // Track failed login to show "Forgot password?" option
  const [loginFailed, setLoginFailed] = useState(false)
  const [failedUsername, setFailedUsername] = useState("")

  // Secure browser-native SHA-256 password hashing
  const hashText = async (text: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
  }

  // Build the forgot-password mailto link with a pre-filled template
  const buildForgotPasswordLink = (uname: string) => {
    const subject = encodeURIComponent(`[HomiePay] Password Reset Request — @${uname}`)
    const body = encodeURIComponent(
`Hello HomiePay Support,

I am unable to access my account and would like to request a password reset.

Account Details:
  Username: @${uname}

Please help me regain access to my account. I understand that my identity may need to be verified before a reset can be processed.

Thank you,
${uname}`
    )
    return `mailto:nexlytestudio@gmail.com?subject=${subject}&body=${body}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setSuccessMsg("")
    setLoginFailed(false)

    // Internet connection check for authentication
    if (typeof window !== "undefined" && !navigator.onLine) {
      setErrorMsg("An active internet connection is required to login or register. Please connect to the internet and try again.")
      return
    }

    // Advance to step 2 if registering and on step 1
    if (activeTab === "register" && registerStep === 1) {
      setRegisterStep(2)
      return
    }

    setIsLoading(true)

    // Form Validation
    const cleanUsername = username.trim().toLowerCase()
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg("Username must be at least 3 characters long.")
      setIsLoading(false)
      return
    }

    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.")
      setIsLoading(false)
      return
    }

    try {
      const hashedPassword = await hashText(password)

      if (activeTab === "register") {
        const cleanFullName = fullName.trim()
        if (!cleanFullName || cleanFullName.length < 2) {
          setErrorMsg("Please enter your full name.")
          setIsLoading(false)
          return
        }

        const cleanAnswer = securityAnswer.trim()
        if (!cleanAnswer || cleanAnswer.length < 2) {
          setErrorMsg("Please provide an answer to your security question.")
          setIsLoading(false)
          return
        }

        // 1. Verify if username is unique in database
        const { data: existingUser, error: checkErr } = await supabase
          .from("users")
          .select("username")
          .eq("username", cleanUsername)
          .maybeSingle()

        if (checkErr) throw checkErr

        if (existingUser) {
          setErrorMsg("Username is already taken. Try another one!")
          setIsLoading(false)
          return
        }

        // 2. Hash the security answer
        const hashedAnswer = await hashText(cleanAnswer.toLowerCase())

        // 3. Insert new user profile with security question
        const { data: newUser, error: registerErr } = await supabase
          .from("users")
          .insert({
            username: cleanUsername,
            password_hash: hashedPassword,
            full_name: cleanFullName,
            security_question: securityQuestion,
            security_answer_hash: hashedAnswer,
          })
          .select("id, username, full_name")
          .single()

        if (registerErr) throw registerErr

        setSuccessMsg("Account created successfully!")
        setTimeout(() => {
          onSuccess(newUser)
        }, 800)
      } else {
        // LOGIN FLOW
        const { data: user, error: loginErr } = await supabase
          .from("users")
          .select("id, username, password_hash, full_name")
          .eq("username", cleanUsername)
          .maybeSingle()

        if (loginErr) throw loginErr

        if (!user || user.password_hash !== hashedPassword) {
          setLoginFailed(true)
          setFailedUsername(cleanUsername)
          setErrorMsg("Wrong password. Please check and try again.")
          setIsLoading(false)
          return
        }

        setSuccessMsg(`Welcome back, ${user.full_name}!`)
        setTimeout(() => {
          onSuccess({
            id: user.id,
            username: user.username,
            full_name: user.full_name,
          })
        }, 800)
      }
    } catch (err: any) {
      console.error("Authentication failed:", err)
      setErrorMsg(err.message || "A database sync error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-200/80 border border-slate-200/85 relative overflow-hidden">
        
        {/* Glowing visual effect background */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-teal-500/5 blur-xl pointer-events-none" />

        {/* Logo and Greeting Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/10 border border-emerald-400/20 mb-3">
            <Wallet className="h-6 w-6 text-white stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {activeTab === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xs">
            {activeTab === "login" 
              ? "Access your group settlements and split bills instantly" 
              : "Register a unique username to store splits securely in the cloud"}
          </p>
        </div>

        {/* Custom HSL Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 rounded-xl mb-6 border border-slate-200/50">
          <button
            onClick={() => {
              setActiveTab("login")
              setRegisterStep(1)
              setErrorMsg("")
              setSuccessMsg("")
              setLoginFailed(false)
            }}
            className={`py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === "login"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200/30"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setActiveTab("register")
              setRegisterStep(1)
              setErrorMsg("")
              setSuccessMsg("")
              setLoginFailed(false)
            }}
            className={`py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === "register"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200/30"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Alert/Status Banners */}
        {errorMsg && (
          <div className="mb-5 space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-150 rounded-xl text-rose-700 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>

            {/* Forgot Password link — only shown after a failed login */}
            {loginFailed && activeTab === "login" && (
              <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <Mail className="h-4 w-4 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="text-[10px] text-amber-700 font-semibold leading-snug">
                    Forgot your password?
                  </p>
                  <a
                    href={buildForgotPasswordLink(failedUsername)}
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 underline underline-offset-2 hover:text-amber-900 mt-0.5 cursor-pointer"
                  >
                    <Mail className="h-3 w-3" />
                    Email us to reset your password →
                  </a>
                  <p className="text-[9px] text-amber-600 mt-0.5">
                    Tap the link above to open your email app with a ready-to-send reset request.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-700 text-xs font-semibold mb-5 animate-in fade-in duration-300">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === "register" && registerStep === 1 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-9.5 py-5.5 rounded-xl border-slate-200 focus-visible:ring-emerald-500 text-xs"
                />
              </div>
            </div>
          )}

          {(activeTab === "login" || (activeTab === "register" && registerStep === 1)) && (
            <>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="e.g. johndoe"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
                  setLoginFailed(false) // reset forgot link if they re-type username
                }}
                disabled={isLoading}
                required
                className="pl-9.5 py-5.5 rounded-xl border-slate-200 focus-visible:ring-emerald-500 text-xs lowercase"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pl-9.5 pr-10 py-5.5 rounded-xl border-slate-200 focus-visible:ring-emerald-500 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          </>
          )}

          {/* Security Question section — registration only */}
          {activeTab === "register" && registerStep === 2 && (
            <div className="space-y-3 pt-1">
              {/* Divider with label */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-100" />
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-widest">Account Recovery</span>
                </div>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Choose a security question and answer. This helps you recover your account if you ever forget your password.
              </p>

              {/* Question Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Security Question
                </label>
                <div className="relative">
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    disabled={isLoading}
                    className="w-full appearance-none pl-4 pr-9 py-3.5 text-xs font-semibold text-slate-700 rounded-xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer transition-all"
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Answer Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Your Answer
                </label>
                <Input
                  type="text"
                  placeholder="Type your answer..."
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  disabled={isLoading}
                  required={activeTab === "register"}
                  autoComplete="off"
                  className="py-5 rounded-xl border-slate-200 focus-visible:ring-emerald-500 text-xs"
                />
                <p className="text-[9px] text-slate-400">
                  Your answer is encrypted and stored securely. Capitalisation is ignored when checking.
                </p>
              </div>
            </div>
          )}

          {activeTab === "register" && registerStep === 2 ? (
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => setRegisterStep(1)}
                className="py-6 rounded-xl border-slate-200 text-slate-600 font-extrabold text-xs tracking-wider uppercase flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="py-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-800 flex-[2]"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Register Account
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase shadow-xl mt-3 flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-800"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {activeTab === "login" ? "Sign In" : "Next"}
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </Button>
          )}
        </form>

      </div>
    </div>
  )
}
