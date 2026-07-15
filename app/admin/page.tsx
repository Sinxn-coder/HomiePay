"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Shield, Lock, User, LogOut, Users, UsersRound, ReceiptText, LayoutDashboard, Settings, MoreVertical, Edit, KeyRound, Ban, CheckCircle2 } from "lucide-react"
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
  const [isLoading, setIsLoading] = useState(true)
  const [loginError, setLoginError] = useState("")

  const [activeTab, setActiveTab] = useState<"dashboard" | "users">("dashboard")
  
  const [stats, setStats] = useState({ users: 0, groups: 0, bills: 0 })
  const [usersList, setUsersList] = useState<any[]>([])

  // User Actions State
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false)
  const [editFullName, setEditFullName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
      if (session) fetchDashboardData()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchDashboardData()
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [usersRes, groupsRes, billsRes] = await Promise.all([
        supabase.from("users").select("id, username, full_name, created_at, is_banned", { count: 'exact' }),
        supabase.from("groups").select("id", { count: 'exact', head: true }),
        supabase.from("bills").select("id", { count: 'exact', head: true }),
      ])

      setStats({
        users: usersRes.count || 0,
        groups: groupsRes.count || 0,
        bills: billsRes.count || 0
      })
      
      if (usersRes.data) {
        setUsersList(usersRes.data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      }
    } catch (err) {
      console.error("Error fetching admin data:", err)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginError(error.message)
      setIsLoading(false)
    }
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Admin Access</h1>
          <p className="text-slate-400 text-sm text-center mb-8">Enter your credentials to manage the platform</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold text-center">
                {loginError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500"
                  placeholder="admin@homiepay.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-900/50"
              disabled={isLoading}
            >
              Sign In to Dashboard
            </Button>
          </form>
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
            className={`flex items-center px-5 py-3 mx-2 rounded-xl transition-colors cursor-pointer \${activeTab === "dashboard" ? "bg-emerald-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("users")}
            className={`flex items-center px-5 py-3 mx-2 rounded-xl transition-colors cursor-pointer \${activeTab === "users" ? "bg-emerald-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Users className="h-5 w-5 shrink-0" />
            <span className="ml-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Users Management</span>
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
        <div className="max-w-6xl mx-auto px-6 py-8">
          
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
            <DialogTitle>Force Reset Password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-slate-500">Set a new password for <span className="font-bold text-slate-800 dark:text-white">@{selectedUser?.username}</span>.</p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">New Password (min 6 chars)</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPwdModalOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={actionLoading || newPassword.length < 6} className="bg-amber-500 hover:bg-amber-600 text-white">Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
