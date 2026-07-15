"use client"

import { useState, useEffect, useRef } from "react"
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronRight,
  Receipt,
  Copy,
  MoreVertical,
  History,
  IndianRupee,
  FileText,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet"
import { PremiumModal } from "@/components/premium-modal"
import type { Group, Person, SavedBill } from "@/lib/types"
import { calculateGroupBalances, calculateSplits, calculateOwes } from "@/lib/finance-engine"

interface GroupsViewProps {
  groups: Group[]
  currentUserId: string
  savedBills: SavedBill[]
  onAddGroup: (name: string, addSelf: boolean) => string
  onUpdateGroup: (id: string, updates: Partial<Omit<Group, "id">>) => void
  onDeleteGroup: (id: string) => void
  onAddMember: (groupId: string, name: string) => void
  onRemoveMember: (groupId: string, personId: string) => void
  onUpdateMember: (groupId: string, personId: string, name: string) => void
  onJoinGroup: (code: string) => Promise<{ success: boolean; message: string; groupName?: string }>
  onSelectGroup: (groupId: string) => void
  onLoadBill: (billId: string) => void
  onDeleteBill: (billId: string) => void
  onMarkPersonBillSettled: (billId: string, personId?: string) => void
  onNewBill: () => void
  onAddSettlement: (groupId: string, settlement: Omit<import("@/lib/types").Settlement, 'id' | 'createdAt'>) => void
}

export function GroupsView({
  groups,
  currentUserId,
  savedBills,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  onJoinGroup,
  onSelectGroup,
  onLoadBill,
  onDeleteBill,
  onMarkPersonBillSettled,
  onNewBill,
  onAddSettlement,
}: GroupsViewProps) {
  const [newGroupName, setNewGroupName] = useState("")
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState("")
  const [newMemberName, setNewMemberName] = useState("")
  const [addingMemberGroupId, setAddingMemberGroupId] = useState<string | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editingMemberName, setEditingMemberName] = useState("")
  const [activeDetailGroupId, setActiveDetailGroupId] = useState<string | null>(null)
  const [groupDetailTab, setGroupDetailTab] = useState<"members" | "bills" | "new-bill" | "balances">("members")

  // Settlement modal state
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [settleData, setSettleData] = useState<{ from: string, to: string, amount: number } | null>(null)
  const [settleAmountInput, setSettleAmountInput] = useState("")

  // Bill settling state
  const [confirmSettleBillId, setConfirmSettleBillId] = useState<string | null>(null)
  const [confirmSettlePersonId, setConfirmSettlePersonId] = useState<string | null>(null)
  const [billFilter, setBillFilter] = useState<"all" | "uncleared" | "cleared">("uncleared")
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null)

  // Swipe logic for bill filter
  const filterSwipeRef = useRef({ startX: 0, active: false });
  const filterOptions = ["all", "uncleared", "cleared"] as const;

  // Three-dot dropdown menu state
  const [openMenuGroupId, setOpenMenuGroupId] = useState<string | null>(null)
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null)
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuGroupId(null)
        setOpenMemberMenuId(null)
        setConfirmDeleteGroupId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Sharing states
  const [activeAddTab, setActiveAddTab] = useState<"create" | "join">("create")
  const [shareCodeInput, setShareCodeInput] = useState("")
  const [joinError, setJoinError] = useState("")
  const [joinSuccess, setJoinSuccess] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null)
  const [addSelfToGroup, setAddSelfToGroup] = useState(true)

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      const groupId = onAddGroup(newGroupName.trim(), addSelfToGroup)
      setNewGroupName("")
      setShowAddGroup(false)
      setExpandedGroupId(groupId)
    }
  }

  const handleSaveGroupName = (groupId: string) => {
    if (editingGroupName.trim()) {
      onUpdateGroup(groupId, { name: editingGroupName.trim() })
      setEditingGroupId(null)
      setEditingGroupName("")
    }
  }

  const handleAddMember = (groupId: string) => {
    if (newMemberName.trim()) {
      onAddMember(groupId, newMemberName.trim())
      setNewMemberName("")
      setAddingMemberGroupId(null)
    }
  }

  const handleSaveMemberName = (groupId: string, personId: string) => {
    if (editingMemberName.trim()) {
      onUpdateMember(groupId, personId, editingMemberName.trim())
      setEditingMemberId(null)
      setEditingMemberName("")
    }
  }

  const handleJoinGroup = async () => {
    setJoinError("")
    setJoinSuccess("")
    setIsJoining(true)

    const code = shareCodeInput.trim().toUpperCase()
    if (!code) {
      setJoinError("Please enter a group share code.")
      setIsJoining(false)
      return
    }

    try {
      const res = await onJoinGroup(code)
      if (res.success) {
        setJoinSuccess(`Successfully joined "${res.groupName}"!`)
        setShareCodeInput("")
        setTimeout(() => {
          setShowAddGroup(false)
          setJoinSuccess("")
          // Switch tab back to default for next open
          setActiveAddTab("create")
        }, 1500)
      } else {
        setJoinError(res.message)
      }
    } catch (err) {
      setJoinError("Could not join group. Try again!")
    } finally {
      setIsJoining(false)
    }
  }

  const handleCopyCode = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation()
    if (!group.shareCode) return
    
    navigator.clipboard.writeText(group.shareCode)
    setCopiedGroupId(group.id)
    setTimeout(() => setCopiedGroupId(null), 2000)
  }

  const activeGroup = groups.find(g => g.id === activeDetailGroupId)
  const canDeleteActiveGroup = activeGroup?.ownerId === currentUserId
  const canRemoveMember = (group: Group, member: Person) => group.ownerId === currentUserId || member.userId === currentUserId
  const isCurrentUserMember = (member: Person) => member.userId === currentUserId

  const allGroupBills = savedBills.filter(b => b.groupId === activeGroup?.id)
  const groupBills = allGroupBills.filter(b => {
    if (billFilter === "cleared") return b.isSettled;
    if (billFilter === "uncleared") return !b.isSettled;
    return true; // "all"
  })

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const renderModals = () => (
    <>
      {/* Settle Up Modal */}
      {settleData && (
        <MobileBottomSheet
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          title="Settle Up"
        >
          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {groups.find(g => g.id === activeDetailGroupId)?.members.find(m => m.id === settleData.from)?.name}
                </span>
                <span className="text-xs text-muted-foreground font-medium px-2">pays</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {groups.find(g => g.id === activeDetailGroupId)?.members.find(m => m.id === settleData.to)?.name}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Amount (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={settleAmountInput}
                  onChange={(e) => setSettleAmountInput(e.target.value)}
                  className="pl-11 h-12 text-lg font-bold border-border/80 focus:border-primary/80 focus:ring-primary/20 rounded-xl"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl text-base"
                onClick={() => setSettleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => {
                  const amt = parseFloat(settleAmountInput)
                  if (!isNaN(amt) && amt > 0 && activeDetailGroupId) {
                    onAddSettlement(activeDetailGroupId, {
                      fromUserId: settleData.from,
                      toUserId: settleData.to,
                      amount: amt,
                      groupId: activeDetailGroupId
                    })
                    setSettleModalOpen(false)
                  }
                }}
                disabled={parseFloat(settleAmountInput) <= 0 || isNaN(parseFloat(settleAmountInput))}
              >
                Record Payment
              </Button>
            </div>
          </div>
        </MobileBottomSheet>
      )}

      {/* Confirm Bill Settlement Modal */}
      {confirmSettleBillId && (
        <MobileBottomSheet
          isOpen={!!confirmSettleBillId}
          onClose={() => setConfirmSettleBillId(null)}
          title="Mark as Settled?"
        >
          <div className="space-y-4 pt-2">
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                {confirmSettlePersonId 
                  ? "Are you sure you want to mark this person's share as paid?" 
                  : "Are you sure you want to mark this entire bill as settled?"}
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-2">
                This will record a settlement and balance the group's debts. This action cannot be changed later.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl text-base"
                onClick={() => { setConfirmSettleBillId(null); setConfirmSettlePersonId(null) }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => {
                  onMarkPersonBillSettled(confirmSettleBillId, confirmSettlePersonId || undefined)
                  setConfirmSettleBillId(null)
                  setConfirmSettlePersonId(null)
                }}
              >
                Mark as Settled
              </Button>
            </div>
          </div>
        </MobileBottomSheet>
      )}
    </>
  )

  if (activeGroup) {
    const calculatedBalances = groupDetailTab === "balances" 
      ? calculateGroupBalances(activeGroup.members, allGroupBills, activeGroup.settlements || [])
      : []

    return (
      <div className="w-[95vw] relative left-1/2 -translate-x-1/2 sm:w-full sm:left-auto sm:translate-x-0 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
        {/* Header with Back button + Group Settings Menu */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              setActiveDetailGroupId(null)
              setGroupDetailTab("members")
            }}
            className="gap-2 px-3 py-1.5 h-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-semibold text-xs tracking-wider uppercase cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Groups
          </Button>

          <div className="relative" ref={menuRef}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOpenMenuGroupId(openMenuGroupId === activeGroup.id ? null : activeGroup.id)}
              className="h-9 w-9 rounded-xl cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {openMenuGroupId === activeGroup.id && (
              <div className="absolute right-0 top-10 z-50 w-48 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setEditingGroupId(activeGroup.id)
                    setEditingGroupName(activeGroup.name)
                    setOpenMenuGroupId(null)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                >
                  <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                  Rename Group
                </button>
                {canDeleteActiveGroup && <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3" />}
                {canDeleteActiveGroup && (confirmDeleteGroupId === activeGroup.id ? (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Are you sure?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onDeleteGroup(activeGroup.id)
                          setActiveDetailGroupId(null)
                          setOpenMenuGroupId(null)
                          setConfirmDeleteGroupId(null)
                        }}
                        className="flex-1 py-1.5 text-[10px] font-extrabold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteGroupId(null)}
                        className="flex-1 py-1.5 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteGroupId(activeGroup.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Group
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group Identity Card */}
        <Card className="border-border/50 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <CardContent className="p-4 pt-6">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0"
                style={{ backgroundColor: activeGroup.color }}
              >
                {activeGroup.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {editingGroupId === activeGroup.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      className="h-9 text-base font-bold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveGroupName(activeGroup.id)
                        if (e.key === "Escape") setEditingGroupId(null)
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => handleSaveGroupName(activeGroup.id)}>
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingGroupId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-xl font-black text-foreground tracking-tight truncate">{activeGroup.name}</h2>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    <Users className="h-2.5 w-2.5" />
                    {activeGroup.members.length} members
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <History className="h-2.5 w-2.5" />
                    {groupBills.length} bill{groupBills.length !== 1 ? "s" : ""}
                  </span>
                  {activeGroup.shareCode && (
                    <button
                      onClick={(e) => handleCopyCode(e, activeGroup)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      {copiedGroupId === activeGroup.id ? (
                        <><Check className="h-2.5 w-2.5 text-emerald-600" />Copied!</>
                      ) : (
                        <><Copy className="h-2.5 w-2.5" />Code: {activeGroup.shareCode}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ───────── 3-Tab Navigation ───────── */}
        <div className="relative flex bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 p-1 rounded-2xl">
          {/* Sliding highlight */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(33.333%-4px)] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/20 dark:border-slate-700/20 transition-all duration-300 ease-out ${
              groupDetailTab === "members" ? "left-1" : groupDetailTab === "bills" ? "left-[calc(33.333%+1px)]" : groupDetailTab === "balances" ? "left-[calc(66.666%+2px)]" : "opacity-0 scale-95"
            }`}
          />
          {([
            { key: "members", icon: Users, label: "Members" },
            { key: "bills",   icon: History, label: "Bills" },
            { key: "balances", icon: IndianRupee, label: "Balances" },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setGroupDetailTab(key)}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                groupDetailTab === key
                  ? "text-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {key === "bills" && groupBills.length > 0 && (
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  groupDetailTab === "bills" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}>
                  {groupBills.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ───────── Tab: Members ───────── */}
        {groupDetailTab === "members" && (
          <Card className="border-border/50 shadow-md animate-in fade-in duration-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-bold">Group Members</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Manage participants and split profiles</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Input
                  placeholder="New member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="h-9 w-40"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddMember(activeGroup.id) }}
                />
                <Button size="sm" className="h-9" onClick={() => handleAddMember(activeGroup.id)} disabled={!newMemberName.trim()}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeGroup.members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No members yet. Add friends to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeGroup.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      {editingMemberId === member.id && !member.userId ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingMemberName}
                            onChange={(e) => setEditingMemberName(e.target.value)}
                            className="h-8 flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveMemberName(activeGroup.id, member.id)
                              if (e.key === "Escape") setEditingMemberId(null)
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveMemberName(activeGroup.id, member.id)}>
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingMemberId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{member.name}</span>
                          </div>
                          {(!member.userId || canRemoveMember(activeGroup, member)) && (
                            <div className="relative" ref={menuRef}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMemberMenuId(openMemberMenuId === member.id ? null : member.id)
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openMemberMenuId === member.id && (
                                <div
                                  className="absolute right-0 top-8 z-50 w-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {!member.userId && (
                                    <button
                                      onClick={() => {
                                        setEditingMemberId(member.id)
                                        setEditingMemberName(member.name)
                                        setOpenMemberMenuId(null)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                                    >
                                      <Edit3 className="h-3 w-3 text-slate-400" />
                                      Rename Member
                                    </button>
                                  )}
                                  {!member.userId && canRemoveMember(activeGroup, member) && (
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />
                                  )}
                                  {canRemoveMember(activeGroup, member) && (
                                    <button
                                      onClick={() => {
                                        onRemoveMember(activeGroup.id, member.id)
                                        setOpenMemberMenuId(null)
                                        if (isCurrentUserMember(member) && activeGroup.ownerId !== currentUserId) {
                                          setActiveDetailGroupId(null)
                                        }
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-left"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      {isCurrentUserMember(member) && activeGroup.ownerId !== currentUserId ? "Leave Group" : "Remove Member"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Mobile Add Member */}
              <div className="sm:hidden pt-2">
                <Button variant="outline" className="w-full" onClick={() => setAddingMemberGroupId(activeGroup.id)}>
                  <Plus className="h-4 w-4 mr-1" />Add Member
                </Button>
                {addingMemberGroupId === activeGroup.id && (
                  <MobileBottomSheet
                    isOpen={addingMemberGroupId === activeGroup.id}
                    onClose={() => { setAddingMemberGroupId(null); setNewMemberName("") }}
                    title="Add Group Member"
                  >
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter member name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        autoFocus
                      />
                      <Button className="w-full" onClick={() => handleAddMember(activeGroup.id)} disabled={!newMemberName.trim()}>
                        Add Member
                      </Button>
                    </div>
                  </MobileBottomSheet>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ───────── Tab: Bills ───────── */}
        {groupDetailTab === "bills" && (
          <Card className="border-border/50 shadow-md animate-in fade-in duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Past Bills
                </CardTitle>
                <Button size="sm" onClick={() => setGroupDetailTab("new-bill")} className="h-7 text-[11px] font-bold px-2.5 gap-1 shadow-sm rounded-lg">
                  <Plus className="h-3.5 w-3.5" />
                  New Bill
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 sm:mt-1 gap-2">
                <p className="text-xs text-muted-foreground">All bills created in this group</p>
                <div 
                  className="relative flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg w-full sm:w-[240px] shrink-0 touch-pan-y select-none"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    filterSwipeRef.current = { startX: e.clientX, active: true };
                  }}
                  onPointerMove={(e) => {
                    if (!filterSwipeRef.current.active) return;
                    const deltaX = e.clientX - filterSwipeRef.current.startX;
                    if (Math.abs(deltaX) > 30) {
                      const currentIndex = filterOptions.indexOf(billFilter);
                      let nextIndex = currentIndex;
                      if (deltaX > 0 && currentIndex > 0) nextIndex = currentIndex - 1; // Swiping right goes to previous
                      else if (deltaX < 0 && currentIndex < 2) nextIndex = currentIndex + 1; // Swiping left goes to next
                      
                      if (nextIndex !== currentIndex) {
                        setBillFilter(filterOptions[nextIndex]);
                        filterSwipeRef.current.startX = e.clientX;
                      }
                    }
                  }}
                  onPointerUp={(e) => {
                    filterSwipeRef.current.active = false;
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }}
                  onPointerCancel={(e) => {
                    filterSwipeRef.current.active = false;
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }}
                >
                  {/* Sliding highlight */}
                  <div
                    className={`absolute top-0.5 bottom-0.5 w-[calc(33.333%-2px)] bg-white dark:bg-slate-700 rounded-md shadow-sm transition-all duration-300 ease-out z-0 ${
                      billFilter === "all" ? "left-0.5" : 
                      billFilter === "uncleared" ? "left-[calc(33.333%+1px)]" : 
                      "left-[calc(66.666%+1.5px)]"
                    }`}
                  />
                  <button 
                    onClick={() => setBillFilter("all")}
                    className={`relative z-10 flex-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${billFilter === "all" ? "text-slate-800 dark:text-slate-200" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setBillFilter("uncleared")}
                    className={`relative z-10 flex-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${billFilter === "uncleared" ? "text-slate-800 dark:text-slate-200" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    Uncleared
                  </button>
                  <button 
                    onClick={() => setBillFilter("cleared")}
                    className={`relative z-10 flex-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${billFilter === "cleared" ? "text-slate-800 dark:text-slate-200" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    Cleared
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupBills.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-foreground text-sm">No bills yet</p>
                  <p className="text-xs mt-1">Bills you create in this group will appear here</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setGroupDetailTab("new-bill")}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create First Bill
                  </Button>
                </div>
              ) : (
                <>
                  {/* Permissions removed — anyone can view, specific users can edit */}
                  {groupBills.map((bill, index) => {
                    const isOwner = activeGroup.ownerId === currentUserId
                    const canManageBill = isOwner || bill.creatorId === currentUserId
                    
                    let canSettleBill = false
                    if (bill.paidBy) {
                      const payer = bill.people.find((p) => p.id === bill.paidBy)
                      if (payer && payer.userId === currentUserId) canSettleBill = true
                    } else if (bill.payments) {
                      const payerIds = Object.keys(bill.payments).filter(id => (bill.payments?.[id] || 0) > 0)
                      for (const pid of payerIds) {
                        const payer = bill.people.find(p => p.id === pid)
                        if (payer && payer.userId === currentUserId) {
                          canSettleBill = true
                          break
                        }
                      }
                    }

                    const payersCount = bill.payments ? Object.keys(bill.payments).filter(id => (bill.payments?.[id] || 0) > 0).length : 0
                    let payerText = ""
                    if (payersCount > 1) {
                      payerText = `Paid by ${payersCount} people`
                    } else if (bill.paidBy) {
                      const singlePayer = bill.people.find((p) => p.id === bill.paidBy)
                      if (singlePayer) payerText = `Paid by ${singlePayer.name}`
                    } else if (bill.payments) {
                      const solePayerId = Object.keys(bill.payments).find(id => (bill.payments?.[id] || 0) > 0)
                      const solePayer = solePayerId ? bill.people.find(p => p.id === solePayerId) : null
                      if (solePayer) payerText = `Paid by ${solePayer.name}`
                    }

                    const splits = calculateSplits(bill.people, bill.products)
                    const billTransactions = calculateOwes(bill.people, splits, bill.payments || {})
                    const isExpanded = expandedBillId === bill.id

                    return (
                      <div
                        key={bill.id}
                        onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                        className={`p-3 rounded-xl bg-muted/50 border transition-all duration-200 animate-in fade-in slide-in-from-left-2 cursor-pointer ${isExpanded ? "border-primary/40 shadow-sm" : "border-border/50 hover:border-primary/20"}`}
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          {/* Bill info — always visible */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <IndianRupee className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground flex items-center text-sm">
                                  <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                                  {bill.grandTotal.toFixed(2)}
                                </span>
                                <span className="text-[10px] bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Users className="h-2.5 w-2.5" />
                                  {bill.people.length} people
                                </span>
                                {/* View Only text removed */}
                                {bill.isSettled && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                                    <Check className="h-2.5 w-2.5" />
                                    Settled
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                                <span>{formatDate(bill.createdAt)}</span>
                                {payerText && <><span>·</span><span className="truncate">{payerText}</span></>}
                              </div>
                            </div>
                          </div>
                          {/* Actions — for bill creator or group owner */}
                          {canManageBill && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); onLoadBill(bill.id) }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                                title="Load bill in splitter"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteBill(bill.id) }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-muted-foreground hover:text-rose-600 transition-all cursor-pointer"
                                title="Delete bill"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Expandable Per-Person Settlement Area */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
                            {billTransactions.length === 0 ? (
                              <p className="text-xs text-center text-muted-foreground py-2 font-medium">No pending debts for this bill.</p>
                            ) : (
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Individual Debts</p>
                                {billTransactions.map((tx, idx) => {
                                  const fromPerson = bill.people.find(p => p.id === tx.from)
                                  const toPerson = bill.people.find(p => p.id === tx.to)
                                  const isCleared = bill.clearedBy?.includes(tx.from)
                                  
                                  return (
                                    <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`text-xs font-semibold truncate ${isCleared ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                          {fromPerson?.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">owes</span>
                                        <span className={`text-xs font-semibold truncate ${isCleared ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                          {toPerson?.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 pl-2">
                                        <span className={`text-xs font-bold flex items-center ${isCleared ? 'text-slate-400 line-through' : 'text-rose-600 dark:text-rose-400'}`}>
                                          <IndianRupee className="h-3 w-3 mr-0.5" />
                                          {tx.amount.toFixed(2)}
                                        </span>
                                        {isCleared ? (
                                          <span className="h-6 px-2 flex items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                                            PAID
                                          </span>
                                        ) : (
                                          canSettleBill ? (
                                            <button
                                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmSettleBillId(bill.id); setConfirmSettlePersonId(tx.from) }}
                                              className="h-6 px-2.5 flex items-center justify-center rounded-md bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-900/30 text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 text-[10px] font-bold transition-colors cursor-pointer border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/50"
                                            >
                                              Mark Paid
                                            </button>
                                          ) : (
                                            <span className="text-[10px] font-medium text-muted-foreground italic">Pending</span>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ───────── Tab: Balances ───────── */}
        {groupDetailTab === "balances" && (
          <Card className="border-border/50 shadow-md animate-in fade-in duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-emerald-500" />
                Group Balances
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Who owes whom across all bills</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {calculatedBalances.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="font-bold text-foreground text-sm">All settled up! 🎉</p>
                  <p className="text-xs mt-1">There are no outstanding debts in this group.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {calculatedBalances.map((tx, i) => {
                    const fromPerson = activeGroup.members.find(m => m.id === tx.from)
                    const toPerson = activeGroup.members.find(m => m.id === tx.to)
                    
                    if (!fromPerson || !toPerson) return null

                    return (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/50 bg-slate-50/50 dark:bg-slate-900/30 hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-rose-600 dark:text-rose-400">{fromPerson.name}</span>
                          <span className="text-xs font-medium text-muted-foreground">owes</span>
                          <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{toPerson.name}</span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          <span className="font-bold text-base flex items-center">
                            <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                            {tx.amount.toFixed(2)}
                          </span>
                          <Button 
                            size="sm" 
                            className="h-8 text-xs font-bold tracking-wide"
                            onClick={() => {
                              setSettleData({ from: tx.from, to: tx.to, amount: tx.amount })
                              setSettleAmountInput(tx.amount.toFixed(2))
                              setSettleModalOpen(true)
                            }}
                          >
                            Settle Up
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Recent Activity Section */}
              {activeGroup.settlements && activeGroup.settlements.length > 0 && (
                <div className="mt-6 pt-5 border-t border-border/50">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    Recent Settlements
                  </h4>
                  <div className="space-y-2">
                    {[...activeGroup.settlements].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map(s => {
                      const fromPerson = activeGroup.members.find(m => m.id === s.fromUserId)
                      const toPerson = activeGroup.members.find(m => m.id === s.toUserId)
                      return (
                        <div key={s.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{fromPerson?.name}</span>
                            <span className="text-slate-400">paid</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{toPerson?.name}</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 ml-1 flex items-center">
                              <IndianRupee className="h-2.5 w-2.5" />
                              {s.amount.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-slate-400 text-[10px] font-medium shrink-0 ml-2">
                            {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ───────── Tab: New Bill ───────── */}
        {groupDetailTab === "new-bill" && (
          <Card className="border-border/50 shadow-md animate-in fade-in duration-200">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 flex items-center justify-center mx-auto shadow-sm">
                  <Receipt className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Start a New Bill</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will load all <span className="font-semibold text-foreground">{activeGroup.members.length} member{activeGroup.members.length !== 1 ? "s" : ""}</span> from <span className="font-semibold text-foreground">{activeGroup.name}</span> into the bill splitter.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    The bill will be automatically saved to this group's history.
                  </p>
                </div>
                <Button
                  className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => onSelectGroup(activeGroup.id)}
                  disabled={activeGroup.members.length === 0}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {activeGroup.members.length === 0 ? "Add members first" : "Start Bill with Group"}
                </Button>
                {activeGroup.members.length === 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setGroupDetailTab("members")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Go to Members
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {renderModals()}
      </div>
    )
  }

  return (
    <div className="space-y-4">


      {/* Groups */}
      <Card className="w-[95vw] relative left-1/2 -translate-x-1/2 sm:w-full sm:left-auto sm:translate-x-0 border-border/50 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Groups
            </CardTitle>
            {/* Desktop Add/Join Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddGroup(true)
                setActiveAddTab("create")
              }}
              className="hidden sm:flex"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add or Join Group
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Create groups or enter a share code to join a shared workspace
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No groups yet</p>
              <p className="text-sm">Create a group or join one to save sheet splits</p>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-border/50 bg-card"
              >
                {/* Group Header */}
                <div
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors rounded-xl"
                  onClick={() => {
                    setActiveDetailGroupId(group.id)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: group.color }}
                    >
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      {editingGroupId === group.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            className="h-8 w-32"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveGroupName(group.id)
                              if (e.key === "Escape") setEditingGroupId(null)
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSaveGroupName(group.id)}
                          >
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingGroupId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-semibold">{group.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" ref={menuRef}>
                    {/* Three-dot menu button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuGroupId(openMenuGroupId === group.id ? null : group.id)
                          setConfirmDeleteGroupId(null)
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                        title="More options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuGroupId === group.id && (
                        <div
                          className="absolute right-0 top-9 z-50 w-48 bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Copy Share Code */}
                          {group.shareCode && (
                            <button
                              onClick={(e) => {
                                handleCopyCode(e, group)
                                setTimeout(() => setOpenMenuGroupId(null), 1500)
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                            >
                              {copiedGroupId === group.id ? (
                                <><Check className="h-3.5 w-3.5 text-emerald-600" /><span className="text-emerald-700">Copied!</span></>
                              ) : (
                                <><Copy className="h-3.5 w-3.5 text-slate-400" /><span>Copy Share Code</span></>
                              )}
                            </button>
                          )}

                          {/* Divider */}
                          {group.shareCode && <div className="h-px bg-slate-100 mx-3" />}

                          {/* Rename Group */}
                          <button
                            onClick={() => {
                              setEditingGroupId(group.id)
                              setEditingGroupName(group.name)
                              setOpenMenuGroupId(null)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                            Rename Group
                          </button>

                          {group.ownerId === currentUserId && <div className="h-px bg-slate-100 mx-3" />}

                          {/* Delete — with confirm step */}
                          {group.ownerId === currentUserId && (confirmDeleteGroupId === group.id ? (
                            <div className="px-4 py-3 space-y-2">
                              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">Are you sure?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    onDeleteGroup(group.id)
                                    setOpenMenuGroupId(null)
                                    setConfirmDeleteGroupId(null)
                                  }}
                                  className="flex-1 py-1.5 text-[10px] font-extrabold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteGroupId(null)}
                                  className="flex-1 py-1.5 text-[10px] font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteGroupId(group.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Group
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
                  </div>
                </div>

                {/* Expanded Group Content */}
                {false && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/50">
                    {/* Members */}
                    <div className="mt-3 space-y-2">
                      {group.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No members yet
                        </p>
                      ) : (
                        group.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50"
                          >
                            {editingMemberId === member.id && !member.userId ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editingMemberName}
                                  onChange={(e) => setEditingMemberName(e.target.value)}
                                  className="h-8 flex-1"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleSaveMemberName(group.id, member.id)
                                    if (e.key === "Escape") setEditingMemberId(null)
                                  }}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => handleSaveMemberName(group.id, member.id)}
                                >
                                  <Check className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setEditingMemberId(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-medium">{member.name}</span>
                                {/* Member three-dot menu */}
                                {(!member.userId || canRemoveMember(group, member)) && (
                                  <div className="relative" ref={menuRef}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenMemberMenuId(openMemberMenuId === member.id ? null : member.id)
                                      }}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </button>

                                    {openMemberMenuId === member.id && (
                                      <div
                                        className="absolute right-0 top-8 z-50 w-40 bg-white rounded-xl border border-slate-200/80 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {!member.userId && (
                                          <button
                                            onClick={() => {
                                              setEditingMemberId(member.id)
                                              setEditingMemberName(member.name)
                                              setOpenMemberMenuId(null)
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                                          >
                                            <Edit3 className="h-3 w-3 text-slate-400" />
                                            Rename
                                          </button>
                                        )}
                                        {!member.userId && canRemoveMember(group, member) && (
                                          <div className="h-px bg-slate-100 mx-2" />
                                        )}
                                        {canRemoveMember(group, member) && (
                                          <button
                                            onClick={() => {
                                              onRemoveMember(group.id, member.id)
                                              setOpenMemberMenuId(null)
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                            {isCurrentUserMember(member) && group.ownerId !== currentUserId ? "Leave" : "Remove"}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))
                      )}

                      {/* Add Member - Desktop */}
                      <div className="hidden sm:flex items-center gap-2 mt-2">
                        <Input
                          placeholder="Add member name"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          className="h-9"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddMember(group.id)
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddMember(group.id)}
                          disabled={!newMemberName.trim()}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Add Member - Mobile */}
                      <div className="sm:hidden mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setAddingMemberGroupId(group.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Member
                        </Button>
                        {addingMemberGroupId === group.id && (
                          <MobileBottomSheet
                            isOpen={addingMemberGroupId === group.id}
                            onClose={() => {
                              setAddingMemberGroupId(null)
                              setNewMemberName("")
                            }}
                            title="Add Member"
                          >
                            <div className="space-y-4">
                              <Input
                                placeholder="Enter member name"
                                value={newMemberName}
                                onChange={(e) => setNewMemberName(e.target.value)}
                                autoFocus
                              />
                              <Button
                                className="w-full"
                                onClick={() => handleAddMember(group.id)}
                                disabled={!newMemberName.trim()}
                              >
                                Add Member
                              </Button>
                            </div>
                          </MobileBottomSheet>
                        )}
                      </div>
                    </div>

                    {/* Use Group Button */}
                    <Button
                      className="w-full mt-3"
                      onClick={() => onSelectGroup(group.id)}
                      disabled={group.members.length === 0}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Start Bill with Group
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Mobile Add/Join Button */}
          <div className="sm:hidden pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowAddGroup(true)
                setActiveAddTab("create")
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add or Join Group
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Premium Add or Join Group Popup Modal */}
      <PremiumModal
        isOpen={showAddGroup}
        onClose={() => {
          setShowAddGroup(false)
          setNewGroupName("")
          setShareCodeInput("")
          setJoinError("")
          setJoinSuccess("")
          setActiveAddTab("create")
        }}
        title={activeAddTab === "create" ? "Create New Group" : "Join Shared Group"}
        description={activeAddTab === "create" ? "Establish a new shared workspace for your group bills" : "Enter a share code to join an existing group workspace"}
        icon={<Users className="h-5 w-5 text-emerald-600" />}
      >
        <div className="space-y-4 pt-1">
          {/* Tab Selector */}
          <div className="relative flex bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 p-1 rounded-2xl">
            {/* Sliding highlight card */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/20 dark:border-slate-700/20 transition-all duration-300 ease-out ${
                activeAddTab === "create" ? "left-1" : "left-1/2"
              }`}
            />
            <button
              onClick={() => {
                setActiveAddTab("create")
                setJoinError("")
                setJoinSuccess("")
              }}
              className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center ${
                activeAddTab === "create"
                  ? "text-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Create New Group
            </button>
            <button
              onClick={() => {
                setActiveAddTab("join")
                setJoinError("")
                setJoinSuccess("")
              }}
              className={`relative z-10 flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center ${
                activeAddTab === "join"
                  ? "text-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Join via Share Code
            </button>
          </div>

          {activeAddTab === "create" ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Group Name
                </label>
                <Input
                  placeholder="e.g. Roommates 2026, Goa Trip, Family"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  className="h-12 text-base border-border/80 focus:border-primary/80 focus:ring-primary/20 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddGroup()
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer pl-1">
                <input
                  type="checkbox"
                  checked={addSelfToGroup}
                  onChange={(e) => setAddSelfToGroup(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                Add me to this group
              </label>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddGroup(false)}
                  className="flex-1 h-12 rounded-xl text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim()}
                  className="flex-1 h-12 rounded-xl text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Share Code
                </label>
                <Input
                  placeholder="Enter HP-XXXX code"
                  value={shareCodeInput}
                  onChange={(e) => {
                    setShareCodeInput(e.target.value.toUpperCase())
                    setJoinError("")
                  }}
                  className="font-mono text-center tracking-widest text-base font-black placeholder:font-sans placeholder:tracking-normal placeholder:text-sm uppercase h-12 border-border/80 focus:border-primary/80 focus:ring-primary/20 rounded-xl"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJoinGroup()
                  }}
                />
              </div>
              
              {joinError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-center animate-in fade-in duration-200">
                  {joinError}
                </p>
              )}

              {joinSuccess && (
                <p className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center animate-in fade-in duration-200">
                  {joinSuccess}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddGroup(false)}
                  className="flex-1 h-12 rounded-xl text-base"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoinGroup}
                  disabled={!shareCodeInput.trim() || isJoining}
                  className="flex-1 h-12 rounded-xl text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isJoining ? "Joining..." : "Join Group"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PremiumModal>

      {renderModals()}
    </div>
  )
}
