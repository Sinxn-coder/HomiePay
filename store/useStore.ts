import { create } from 'zustand'
import { createActiveBillSlice, ActiveBillSlice } from './createActiveBillSlice'
import { createGroupsSlice, GroupsSlice } from './createGroupsSlice'
import { createSavedBillsSlice, SavedBillsSlice } from './createSavedBillsSlice'
import { supabase } from '../lib/supabase'

export type StoreState = ActiveBillSlice & GroupsSlice & SavedBillsSlice & {
  userSession: { id: string; username: string; full_name: string; avatar_url?: string | null } | null
  setUserSession: (session: { id: string; username: string; full_name: string; avatar_url?: string | null } | null) => void
  userProfiles: Record<string, { full_name: string; avatar_url: string | null }>
  fetchUserProfiles: (userIds: string[]) => Promise<void>
  syncPendingData: () => Promise<void>
  fetchRemoteData: () => Promise<void>
}

export const useStore = create<StoreState>()((set, get, api) => ({
  userSession: null,
  userProfiles: {},

  fetchUserProfiles: async (userIds: string[]) => {
    if (userIds.length === 0) return
    const currentProfiles = get().userProfiles
    const missingIds = userIds.filter(id => !currentProfiles[id])
    if (missingIds.length === 0) return

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', missingIds)

    if (!error && data) {
      const newProfiles = { ...currentProfiles }
      data.forEach((user: any) => {
        newProfiles[user.id] = { full_name: user.full_name, avatar_url: user.avatar_url }
      })
      set({ userProfiles: newProfiles })
    }
  },

  setUserSession: (session) => {
    set({ userSession: session })
    if (!session) {
      get().setIsLoaded(false)
      return
    }

    const userId = session.id
    const STORAGE_KEY = `homiepay-expense-data-${userId}`
    const BILLS_STORAGE_KEY = `homiepay-saved-bills-${userId}`
    const GROUPS_STORAGE_KEY = `homiepay-saved-groups-${userId}`

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        get().setPeople(data.people || [])
        get().setProducts(data.products || [])
        get().setPaidBy(data.paidBy || null)
        get().setPayments(data.payments || {})
      } else {
        get().setPeople([{ id: "user-self", name: session.full_name || session.username }])
        get().setProducts([])
        get().setPaidBy(null)
        get().setPayments({})
      }
    } catch (e) {
      console.error("Failed to load active bill:", e)
    }

    try {
      const storedBills = localStorage.getItem(BILLS_STORAGE_KEY)
      if (storedBills) {
        get().setSavedBills(JSON.parse(storedBills))
      } else {
        get().setSavedBills([])
      }
    } catch (e) {
      console.error("Failed to load saved bills:", e)
    }

    try {
      const storedGroups = localStorage.getItem(GROUPS_STORAGE_KEY)
      if (storedGroups) {
        get().setGroups(JSON.parse(storedGroups))
      } else {
        get().setGroups([])
      }
    } catch (e) {
      console.error("Failed to load groups:", e)
    }

    get().setIsLoaded(true)
  },

  fetchRemoteData: async () => {
    const { userSession, groups } = get()
    if (!userSession || !navigator.onLine) return

    const userId = userSession.id
    
    // Fetch pending invites
    get().fetchPendingInvites()
    
    // Get locally joined group IDs
    const storedJoinedKey = `homiepay-joined-group-ids-${userId}`
    const storedJoined = localStorage.getItem(storedJoinedKey)
    const joinedIds: string[] = storedJoined ? JSON.parse(storedJoined) : []

    // Fetch groups we own OR groups we joined
    const groupOrStr = `user_id.eq.${userId}${joinedIds.length > 0 ? `,id.in.(${joinedIds.join(',')})` : ''}`
    const { data: remoteGroups, error: groupErr } = await supabase
      .from('groups')
      .select('*')
      .or(groupOrStr)

    let mergedGroups = [...groups]
    let allRelevantGroupIds: string[] = []

    if (!groupErr && remoteGroups) {
      allRelevantGroupIds = remoteGroups.map((g: any) => g.id)
      const remoteGroupIdSet = new Set(allRelevantGroupIds)
      
      // Merge remote groups into local
      remoteGroups.forEach((rg: any) => {
        const localIdx = mergedGroups.findIndex(lg => lg.id === rg.id)
        const formattedRemote = {
          id: rg.id,
          name: rg.name,
          members: rg.members || [],
          color: rg.color,
          shareCode: rg.share_code,
          ownerId: rg.user_id,
          createdAt: new Date(rg.created_at).getTime(),
          settlements: rg.settlements || [],
          synced: true
        }

        if (localIdx >= 0) {
          // If local has unsynced changes, skip overwriting to preserve offline work
          if (mergedGroups[localIdx].synced !== false) {
            mergedGroups[localIdx] = formattedRemote
          }
        } else {
          mergedGroups.push(formattedRemote)
        }
      })

      // Evict local groups that no longer exist in remote.
      // Only remove groups that were previously synced — unsynced groups are
      // offline-created and haven't been pushed yet, so keep them.
      mergedGroups = mergedGroups.filter(lg => {
        if (lg.synced === false) return true   // keep unsynced (offline-created)
        return remoteGroupIdSet.has(lg.id)     // keep only if still in remote
      })
      
      const GROUPS_STORAGE_KEY = `homiepay-saved-groups-${userId}`
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(mergedGroups))
      get().setGroups(mergedGroups)

      // Fetch user profiles for all members in these groups
      const allMemberUserIds = new Set<string>()
      mergedGroups.forEach(g => {
        g.members.forEach(m => {
          if (m.userId) allMemberUserIds.add(m.userId)
        })
      })
      if (allMemberUserIds.size > 0) {
        get().fetchUserProfiles(Array.from(allMemberUserIds))
      }

      // Also clean up joined-group-ids list for any groups now gone
      const cleanedJoinedIds = joinedIds.filter(id => remoteGroupIdSet.has(id))
      if (cleanedJoinedIds.length !== joinedIds.length) {
        localStorage.setItem(storedJoinedKey, JSON.stringify(cleanedJoinedIds))
      }
    } else {
      allRelevantGroupIds = groups.map(g => g.id)
      
      // Fetch user profiles for local groups too if offline start
      const allMemberUserIds = new Set<string>()
      groups.forEach(g => {
        g.members.forEach(m => {
          if (m.userId) allMemberUserIds.add(m.userId)
        })
      })
      if (allMemberUserIds.size > 0) {
        get().fetchUserProfiles(Array.from(allMemberUserIds))
      }
    }

    // Fetch bills for those groups OR bills we created without a group
    const billOrStr = `user_id.eq.${userId}${allRelevantGroupIds.length > 0 ? `,group_id.in.(${allRelevantGroupIds.join(',')})` : ''}`
    const { data: remoteBills, error: billErr } = await supabase
      .from('bills')
      .select('*')
      .or(billOrStr)

    let mergedBills = [...get().savedBills]

    if (!billErr && remoteBills) {
      // Get pending-delete bill IDs so we don't re-add them from remote
      const pendingDeleteBillsKey = `homiepay-pending-delete-bills-${userId}`
      const storedPendingDeletes = localStorage.getItem(pendingDeleteBillsKey)
      const pendingDeleteIds: string[] = storedPendingDeletes ? JSON.parse(storedPendingDeletes) : []

      const remoteBillIdSet = new Set(remoteBills.map((rb: any) => rb.id))

      remoteBills.forEach((rb: any) => {
        // Skip bills that are pending local deletion
        if (pendingDeleteIds.includes(rb.id)) return

        const localIdx = mergedBills.findIndex(lb => lb.id === rb.id)
        const formattedRemote = {
          id: rb.id,
          createdAt: new Date(rb.created_at).getTime(),
          people: rb.people || [],
          products: rb.products || [],
          paidBy: rb.paid_by,
          payments: rb.payments || {},
          grandTotal: rb.grand_total,
          groupId: rb.group_id,
          groupName: rb.group_name,
          isSettled: rb.is_settled || false,
          clearedBy: rb.cleared_by || [],
          creatorId: rb.user_id,
          synced: true
        }

        if (localIdx >= 0) {
          if (mergedBills[localIdx].synced !== false) {
            mergedBills[localIdx] = formattedRemote
          }
        } else {
          mergedBills.push(formattedRemote)
        }
      })

      // Evict local bills that no longer exist in remote.
      // Preserve: unsynced (offline-created) bills and pending-delete bills.
      mergedBills = mergedBills.filter(lb => {
        if (lb.synced === false) return true           // keep offline-created
        if (pendingDeleteIds.includes(lb.id)) return false // pending delete — already removed locally
        return remoteBillIdSet.has(lb.id)              // keep only if still in remote
      })

      const BILLS_STORAGE_KEY = `homiepay-saved-bills-${userId}`
      localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(mergedBills))
      get().setSavedBills(mergedBills)
    }
  },

  syncPendingData: async () => {
    const { userSession } = get()
    if (!userSession || !navigator.onLine) return

    const currentUserId = userSession.id
    const pendingDeleteBillsKey = `homiepay-pending-delete-bills-${currentUserId}`
    const pendingDeleteGroupsKey = `homiepay-pending-delete-groups-${currentUserId}`

    // 1. Process Pending Deletes (Bills)
    try {
      const storedDeleteBills = localStorage.getItem(pendingDeleteBillsKey)
      const deleteBillIds: string[] = storedDeleteBills ? JSON.parse(storedDeleteBills) : []
      if (deleteBillIds.length > 0) {
        const { error } = await supabase.from("bills").delete().in("id", deleteBillIds).eq("user_id", currentUserId)
        if (!error) localStorage.removeItem(pendingDeleteBillsKey)
      }
    } catch (e) {
      console.error("Failed to sync pending bill deletions:", e)
    }

    // 2. Process Pending Deletes (Groups)
    try {
      const storedDeleteGroups = localStorage.getItem(pendingDeleteGroupsKey)
      const deleteGroupIds: string[] = storedDeleteGroups ? JSON.parse(storedDeleteGroups) : []
      if (deleteGroupIds.length > 0) {
        const { error } = await supabase.from("groups").delete().in("id", deleteGroupIds).eq("user_id", currentUserId)
        if (!error) localStorage.removeItem(pendingDeleteGroupsKey)
      }
    } catch (e) {
      console.error("Failed to sync pending group deletions:", e)
    }

    // 3. Process Pending Groups (Create/Update)
    try {
      const localGroups = get().groups
      const unsyncedGroups = localGroups.filter(g => g.synced === false)

      if (unsyncedGroups.length > 0) {
        let succeededAny = false
        for (const group of unsyncedGroups) {
          const { error } = await supabase.from("groups").upsert({
            id: group.id,
            name: group.name,
            members: group.members,
            color: group.color,
            created_at: new Date(group.createdAt).toISOString(),
            share_code: group.shareCode,
            user_id: group.ownerId || currentUserId,
            settlements: group.settlements || []
          })

          if (!error) {
            group.synced = true
            succeededAny = true
          }
        }

        if (succeededAny) {
          const GROUPS_STORAGE_KEY = `homiepay-saved-groups-${currentUserId}`
          localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(localGroups))
          get().setGroups([...localGroups])
        }
      }
    } catch (e) {
      console.error("Failed to sync pending groups:", e)
    }

    // 4. Process Pending Bills (Create/Update)
    try {
      const localBills = get().savedBills
      const unsyncedBills = localBills.filter(b => b.synced === false)

      if (unsyncedBills.length > 0) {
        let succeededAny = false
        for (const bill of unsyncedBills) {
          const { error } = await supabase.from("bills").upsert({
            id: bill.id,
            user_id: bill.creatorId || currentUserId,
            created_at: new Date(bill.createdAt).toISOString(),
            people: bill.people,
            products: bill.products,
            paid_by: bill.paidBy,
            payments: bill.payments,
            grand_total: bill.grandTotal,
            group_id: bill.groupId,
            group_name: bill.groupName,
            is_settled: bill.isSettled || false,
            cleared_by: bill.clearedBy
          })

          if (!error) {
            bill.synced = true
            succeededAny = true
          }
        }

        if (succeededAny) {
          const BILLS_STORAGE_KEY = `homiepay-saved-bills-${currentUserId}`
          localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(localBills))
          get().setSavedBills([...localBills])
        }
      }
    } catch (e) {
      console.error("Failed to sync pending bills:", e)
    }

    // 5. Finally, fetch latest remote data to sync down changes from other devices
    try {
      await get().fetchRemoteData()
    } catch (e) {
      console.error("Failed to fetch remote data:", e)
    }
  },

  ...createActiveBillSlice(set, get, api),
  ...createGroupsSlice(set, get, api),
  ...createSavedBillsSlice(set, get, api),
}))
