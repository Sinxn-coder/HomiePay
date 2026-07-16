"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Shield, Wallet, Lock, User, LogOut, Users, UsersRound, ReceiptText, LayoutDashboard, Settings, MoreVertical, Edit, KeyRound, Ban, CheckCircle2, Trash2, Eye, Flag, AlertTriangle, LifeBuoy, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function AdminPage() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(true)   // only for initial page auth check
  const [isSigningIn, setIsSigningIn] = useState(false) // for login button spinner
  const [loginError, setLoginError] = useState("")
  const [loginMessage, setLoginMessage] = useState("")

  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "groups" | "bills" | "support">("dashboard")
  
  const [stats, setStats] = useState({ users: 0, groups: 0, bills: 0 })
  const [usersList, setUsersList] = useState<any[]>([])
  const [groupsList, setGroupsList] = useState<any[]>([])
  const [billsList, setBillsList] = useState<any[]>([])
  const [supportTicketsList, setSupportTicketsList] = useState<any[]>([])
  const [totalMoneyTracked, setTotalMoneyTracked] = useState(0)

  // User Actions State
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false)
  const [editFullName, setEditFullName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Group Actions State
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [selectedGroupTotal, setSelectedGroupTotal] = useState(0)
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<any>(null)

  // Support Actions State
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)

  useEffect(() => {
    // Only used for the very first page load to check if already logged in
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session)
      setIsLoading(false)
      if (session) fetchDashboardData()
    })
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [usersRes, groupsRes, billsRes, groupsDataRes, billsDataRes, supportRes] = await Promise.all([
        supabase.from("users").select("id, username, full_name, created_at, is_banned", { count: 'exact' }),
        supabase.from("groups").select("id", { count: 'exact', head: true }),
        supabase.from("bills").select("id", { count: 'exact', head: true }),
        supabase.from("groups").select("*, users(username)"),
        supabase.from("bills").select("*, users(username), groups(name)"),
        supabase.from("support_tickets").select("*, users(username)")
      ])

      setStats({
        users: usersRes.count || 0,
        groups: groupsRes.count || 0,
        bills: billsRes.count || 0
      })
      
      if (usersRes.data) {
        setUsersList(usersRes.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
      
      if (groupsDataRes.data) {
        setGroupsList(groupsDataRes.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }

      if (billsDataRes.data) {
        const sortedBills = billsDataRes.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setBillsList(sortedBills)
        const totalVolume = sortedBills.reduce((acc: number, bill: any) => acc + (bill.grand_total || 0), 0)
        setTotalMoneyTracked(totalVolume)
      }

      if (supportRes.data) {
        setSupportTicketsList(supportRes.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    } catch (err) {
      console.error("Error fetching admin data:", err)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSigningIn(true)
    setLoginError("")
    setLoginMessage("")

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginError(error.message)
    } else if (data.session) {
      setSession(data.session)
      fetchDashboardData()
    }
    setIsSigningIn(false)
  }

  const handleForgotPassword = async () => {
    setIsLoading(true)
    setLoginError("")
    setLoginMessage("")
    
    const { error } = await supabase.auth.resetPasswordForEmail('msinankavala786@gmail.com')

    if (error) {
      setLoginError(error.message)
    } else {
      setLoginMessage("Password reset link sent to msinankavala786@gmail.com")
    }
    setIsLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  // Secure browser-native SHA-256 password hashing
  const hashText = async (text: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
  }

  const handleUpdateUserDetails = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: editFullName })
        .eq('id', selectedUser.id)
      
      if (error) throw error
      await fetchDashboardData()
      setIsEditModalOpen(false)
    } catch (err) {
      console.error("Error updating user:", err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || newPassword.length < 6) return
    setActionLoading(true)
    try {
      const hashedNewPassword = await hashText(newPassword)
      const { error } = await supabase
        .from('users')
        .update({ password_hash: hashedNewPassword })
        .eq('id', selectedUser.id)
      
      if (error) throw error
      setIsResetPwdModalOpen(false)
      setNewPassword("")
    } catch (err) {
      console.error("Error resetting password:", err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleBan = async (user: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: !user.is_banned })
        .eq('id', user.id)
      
      if (error) throw error
      await fetchDashboardData()
    } catch (err) {
      console.error("Error toggling ban:", err)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!groupId) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
      
      if (error) throw error
      await fetchDashboardData()
      setIsDeleteGroupModalOpen(false)
      setGroupToDelete(null)
    } catch (err) {
      console.error("Error deleting group:", err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewGroup = async (group: any) => {
    setSelectedGroup(group)
    setSelectedGroupTotal(0)
    setIsGroupModalOpen(true)
    
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('grand_total')
        .eq('group_id', group.id)
      
      if (!error && data) {
        const total = data.reduce((acc: number, bill: any) => acc + (bill.grand_total || 0), 0)
        setSelectedGroupTotal(total)
      }
    } catch (err) {
      console.error("Error fetching group total:", err)
    }
  }

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'closed' })
        .eq('id', ticketId)
      
      if (error) throw error
      await fetchDashboardData()
    } catch (err) {
      console.error("Error closing ticket:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-slate-500 font-semibold">
          <Shield className="h-5 w-5" />
          Loading Admin...
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="h-screen w-screen flex overflow-hidden">
        
        {/* Left Column - Login Form */}
        <div className="w-full md:w-1/2 h-full bg-white flex flex-col px-12 lg:px-20 py-12 overflow-y-auto">
          
          {/* Logo */}
          <div className="flex items-center gap-2 mb-auto pb-10">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-800 tracking-tight">HomiePay Admin</span>
          </div>

          {/* Center content */}
          <div className="flex flex-col justify-center flex-1 max-w-sm mx-auto w-full">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-4xl font-black text-slate-900 leading-[1.1] mb-3">
                Holla,<br />Welcome Back
              </h1>
              <p className="text-sm font-medium text-slate-400">
                Hey, welcome back to your admin dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-semibold">
                  {loginError}
                </div>
              )}
              {loginMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-semibold">
                  {loginMessage}
                </div>
              )}
              
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
                placeholder="admin@homiepay.com"
                required
              />
              
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
                placeholder="••••••••"
                required
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-emerald-600" />
                  <span className="text-xs font-semibold text-slate-500">Remember me</span>
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-xs font-semibold text-slate-400 hover:text-emerald-600 transition-colors">
                  Forgot Password?
                </button>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="h-12 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-emerald-600/30 cursor-pointer"
                  disabled={isSigningIn}
                >
                  {isSigningIn ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Sign In"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Illustration — fills entire right half */}
        <div className="hidden md:block w-1/2 h-full relative overflow-hidden">
          <img
            src="/admin_bg.png"
            alt="Admin Dashboard Illustration"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
      
      {/* Expand-on-hover Side Navigation */}
      <aside className="h-screen w-16 hover:w-64 bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out flex flex-col shrink-0 overflow-hidden group border-r border-slate-800 absolute z-50 left-0 top-0">
        <div className="h-16 flex items-center px-5 shrink-0 bg-slate-950/50">
          <Shield className="h-6 w-6 text-emerald-500 shrink-0" />
          <span className="ml-4 font-bold text-white tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">HomiePay Admin</span>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`relative flex items-center px-5 py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden group/nav ${activeTab === "dashboard" ? "bg-emerald-600/10 text-emerald-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            {activeTab === "dashboard" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full" />
            )}
            <LayoutDashboard className={`h-5 w-5 shrink-0 transition-colors ${activeTab === "dashboard" ? "text-emerald-500" : "group-hover/nav:text-white"}`} />
            <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("users")}
            className={`relative flex items-center px-5 py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden group/nav ${activeTab === "users" ? "bg-emerald-600/10 text-emerald-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            {activeTab === "users" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full" />
            )}
            <Users className={`h-5 w-5 shrink-0 transition-colors ${activeTab === "users" ? "text-emerald-500" : "group-hover/nav:text-white"}`} />
            <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Users Management</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("groups")}
            className={`relative flex items-center px-5 py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden group/nav ${activeTab === "groups" ? "bg-emerald-600/10 text-emerald-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            {activeTab === "groups" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full" />
            )}
            <UsersRound className={`h-5 w-5 shrink-0 transition-colors ${activeTab === "groups" ? "text-emerald-500" : "group-hover/nav:text-white"}`} />
            <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Groups Management</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("bills")}
            className={`relative flex items-center px-5 py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden group/nav ${activeTab === "bills" ? "bg-emerald-600/10 text-emerald-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            {activeTab === "bills" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full" />
            )}
            <ReceiptText className={`h-5 w-5 shrink-0 transition-colors ${activeTab === "bills" ? "text-emerald-500" : "group-hover/nav:text-white"}`} />
            <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Bills & Transactions</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("support")}
            className={`relative flex items-center px-5 py-3 mx-2 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden group/nav ${activeTab === "support" ? "bg-emerald-600/10 text-emerald-500" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            {activeTab === "support" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-emerald-500 rounded-r-full" />
            )}
            <LifeBuoy className={`h-5 w-5 shrink-0 transition-colors ${activeTab === "support" ? "text-emerald-500" : "group-hover/nav:text-white"}`} />
            <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Support & Feedback</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center px-3 py-2 w-full rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto pl-16 w-full">
        <div className="w-full px-8 lg:px-12 py-8">
          
          <header className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
              {activeTab.replace("-", " ")}
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-1.5 rounded-full text-xs font-semibold text-slate-500">
              Admin: {session.user.email}
            </div>
          </header>

          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Total Users</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.users}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                    <UsersRound className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Total Groups</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.groups}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shrink-0">
                    <ReceiptText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Total Bills Split</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.bills}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-400" />
                  Registered Users Directory
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Username</th>
                      <th className="px-6 py-4 font-semibold">Full Name</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Joined Date</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          @{u.username}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.full_name || '—'}</td>
                        <td className="px-6 py-4">
                          {u.is_banned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                              <Ban className="h-3 w-3" /> Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => { setSelectedUser(u); setEditFullName(u.full_name); setIsEditModalOpen(true); }} className="cursor-pointer">
                                <Edit className="h-4 w-4 mr-2 text-slate-500" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsResetPwdModalOpen(true); }} className="cursor-pointer">
                                <KeyRound className="h-4 w-4 mr-2 text-amber-500" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleBan(u)} className="cursor-pointer text-rose-600 focus:text-rose-600">
                                <Ban className="h-4 w-4 mr-2" /> {u.is_banned ? "Unban User" : "Suspend User"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "groups" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UsersRound className="h-5 w-5 text-slate-400" />
                  Groups Directory
                </h3>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Group Name</th>
                      <th className="px-6 py-4 font-semibold">Creator</th>
                      <th className="px-6 py-4 font-semibold">Members</th>
                      <th className="px-6 py-4 font-semibold">Creation Date</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {groupsList.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: g.color || '#10b981' }}>
                              <UsersRound className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{g.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {g.users?.username ? `@${g.users.username}` : 'Unknown'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {Array.isArray(g.members) ? g.members.length : 0} members
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(g.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleViewGroup(g)}
                              className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setGroupToDelete(g)
                                setIsDeleteGroupModalOpen(true)
                              }}
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {groupsList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No groups found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "bills" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
              {/* Analytics Card */}
              <div className="bg-gradient-to-tr from-emerald-900 to-emerald-800 p-8 rounded-3xl shadow-lg flex items-center justify-between border border-emerald-700/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <ReceiptText className="w-32 h-32 text-white" />
                </div>
                <div className="relative z-10">
                  <p className="text-emerald-300 font-semibold mb-2">Total Volume Tracked (Platform-wide)</p>
                  <p className="text-5xl font-black text-white tracking-tight">₹{totalMoneyTracked.toLocaleString()}</p>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ReceiptText className="h-5 w-5 text-slate-400" />
                    Global Expense Feed
                  </h3>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Amount</th>
                        <th className="px-6 py-4 font-semibold">Group / Items</th>
                        <th className="px-6 py-4 font-semibold">Creator</th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold text-right">Flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {billsList.map((bill) => {
                        const isHighValue = bill.grand_total > 50000
                        const itemCount = Array.isArray(bill.products) ? bill.products.length : 0

                        return (
                          <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-bold text-lg text-slate-900 dark:text-white">
                                ₹{bill.grand_total?.toLocaleString() || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {bill.groups?.name || bill.group_name || "No Group"}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {itemCount} item{itemCount !== 1 ? 's' : ''} split
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700 dark:text-slate-300">@{bill.users?.username || 'Unknown'}</span>
                                <span className="text-xs text-slate-400">Paid by: {bill.paid_by || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs">
                              {new Date(bill.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isHighValue ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ml-auto w-fit">
                                  <AlertTriangle className="h-3.5 w-3.5" /> High Value
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {billsList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No transactions found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "support" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-slate-400" />
                  Support Tickets & Feedback
                </h3>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold">User</th>
                      <th className="px-6 py-4 font-semibold">Subject & Message</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {supportTicketsList.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900 dark:text-white">@{ticket.users?.username || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4 max-w-md">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{ticket.subject}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {ticket.status === 'open' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Open
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Closed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => { setSelectedTicket(ticket); setIsTicketModalOpen(true); }}
                              className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {ticket.status === 'open' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleCloseTicket(ticket.id)}
                                className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Resolve
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {supportTicketsList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No support tickets found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Username (Read Only)</label>
              <Input value={selectedUser?.username || ""} disabled className="bg-slate-100 text-slate-500" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Full Name</label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUserDetails} disabled={actionLoading}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isResetPwdModalOpen} onOpenChange={setIsResetPwdModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Resetting password for:</label>
              <div className="font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                @{selectedUser?.username}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">New Password</label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Must be at least 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPwdModalOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={actionLoading || newPassword.length < 6} className="bg-emerald-600 hover:bg-emerald-700">
              {actionLoading ? "Updating..." : "Force Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Details Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: selectedGroup?.color || '#10b981' }}>
                <UsersRound className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl">{selectedGroup?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-1">Total Expenses</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">₹{selectedGroupTotal.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-1">Created By</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">@{selectedGroup?.users?.username}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selectedGroup ? new Date(selectedGroup.created_at).toLocaleDateString() : ''}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Users className="h-4 w-4 text-slate-400" />
                Group Members ({selectedGroup?.members ? selectedGroup.members.length : 0})
              </h4>
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                {selectedGroup?.members && Array.isArray(selectedGroup.members) ? (
                  selectedGroup.members.map((member: any, idx: number) => {
                    const memberName = typeof member === 'string' ? member : member.name || 'Unknown'
                    return (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {memberName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{memberName}</span>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-500 italic">No members found.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation Modal */}
      <Dialog open={isDeleteGroupModalOpen} onOpenChange={setIsDeleteGroupModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Group
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently delete the group <span className="font-bold text-slate-900 dark:text-white">{groupToDelete?.name}</span>? 
            This will also delete all associated bills and expenses. This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteGroupModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleDeleteGroup(groupToDelete?.id)} 
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Yes, Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Support Ticket Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <LifeBuoy className="h-5 w-5" />
              Ticket Details
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-1">Submitted By</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">@{selectedTicket?.users?.username || 'Unknown'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selectedTicket ? new Date(selectedTicket.created_at).toLocaleString() : ''}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                <p className="text-xs font-semibold text-slate-500 mb-2">Current Status</p>
                <div>
                  {selectedTicket?.status === 'open' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      Open (Needs Attention)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                      Closed (Resolved)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Subject
              </h4>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {selectedTicket?.subject}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Full Message
              </h4>
              <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 max-h-[250px] overflow-y-auto">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket?.message}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsTicketModalOpen(false)}>Close</Button>
            {selectedTicket?.status === 'open' && (
              <Button 
                onClick={() => {
                  handleCloseTicket(selectedTicket.id);
                  setIsTicketModalOpen(false);
                }} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" /> Mark as Resolved
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
