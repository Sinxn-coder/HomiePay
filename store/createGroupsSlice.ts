import { StateCreator } from 'zustand'
import { Group, Person, Settlement } from '../lib/types'
import { supabase } from '../lib/supabase'
import { StoreState } from './useStore'

export interface GroupsSlice {
  groups: Group[]
  setGroups: (groups: Group[]) => void
  
  addGroup: (name: string, addSelf?: boolean) => string
  updateGroup: (id: string, updates: Partial<Omit<Group, "id">>) => void
  deleteGroup: (id: string) => void
  
  addMemberToGroup: (groupId: string, memberName: string) => void
  removeMemberFromGroup: (groupId: string, memberId: string) => void
  updateMemberInGroup: (groupId: string, memberId: string, memberName: string) => void
  
  addSettlement: (groupId: string, settlement: Omit<Settlement, 'id' | 'createdAt'>) => void

  loadGroupIntoActiveSplit: (groupId: string) => void
  joinGroupByShareCode: (code: string) => Promise<{ success: boolean; message: string; groupName?: string }>

  _saveGroupsToStorage: (newGroups: Group[]) => void

  pendingInvites: import('../lib/types').GroupInvite[]
  fetchPendingInvites: () => Promise<void>
  sendGroupInvite: (groupId: string, username: string) => Promise<{ success: boolean; message: string }>
  respondToInvite: (inviteId: string, accept: boolean) => Promise<{ success: boolean; message: string }>
}

export const createGroupsSlice: StateCreator<
  StoreState,
  [],
  [],
  GroupsSlice
> = (set, get) => ({
  groups: [],
  pendingInvites: [],

  setGroups: (groups) => set({ groups }),

  _saveGroupsToStorage: (newGroups) => {
    const userSession = get().userSession
    const GROUPS_STORAGE_KEY = `homiepay-saved-groups-${userSession?.id || "anonymous"}`

    set({ groups: [...newGroups] })
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(newGroups))

    if (userSession && navigator.onLine) {
      const groupsToSync = JSON.parse(JSON.stringify(newGroups))
      
      ;(async () => {
        let hasChanges = false
        try {
          for (const group of groupsToSync) {
            if (!group.synced) {
              const { error } = await supabase.from("groups").upsert({
                id: group.id,
                name: group.name,
                members: group.members,
                color: group.color,
                created_at: new Date(group.createdAt).toISOString(),
                share_code: group.shareCode,
                user_id: group.ownerId || userSession.id,
                settlements: group.settlements || []
              })
              
              if (!error) {
                group.synced = true
                hasChanges = true
              }
            }
          }
          
          if (hasChanges) {
            set((state) => {
              const updated = state.groups.map((pg) => {
                const syncedGroup = groupsToSync.find((sg: any) => sg.id === pg.id)
                if (syncedGroup && syncedGroup.synced) {
                  return { ...pg, synced: true }
                }
                return pg
              })
              localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(updated))
              return { groups: updated }
            })
          }
        } catch (err) {
          console.warn("Supabase background backup loop error:", err)
        }
      })()
    }
  },

  addGroup: (name, addSelf = false) => {
    const userSession = get().userSession
    const colors = ["#0d9488", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444", "#14b8a6"]
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
    const shareCode = `HP-${randomHex}`

    const initialMembers: Person[] = []
    if (addSelf && userSession) {
      initialMembers.push({
        id: crypto.randomUUID(),
        name: userSession.full_name || userSession.username,
        username: userSession.username,
        userId: userSession.id
      })
    }

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: name.trim(),
      members: initialMembers,
      color: randomColor,
      createdAt: Date.now(),
      ownerId: userSession?.id,
      shareCode: shareCode,
      synced: false
    }

    get()._saveGroupsToStorage([newGroup, ...get().groups])
    return newGroup.id
  },

  updateGroup: (id, updates) => {
    const updated = get().groups.map((g) => (g.id === id ? { ...g, ...updates, synced: false } : g))
    get()._saveGroupsToStorage(updated)
  },

  deleteGroup: (id) => {
    const userSession = get().userSession
    const groups = get().groups
    const group = groups.find((g) => g.id === id)
    
    if (!userSession || !group || group.ownerId !== userSession.id) {
      console.warn("Only the group creator can delete this group.")
      return
    }

    const pendingDeleteGroupsKey = `homiepay-pending-delete-groups-${userSession.id}`
    
    const addPendingDeleteGroupId = (groupId: string) => {
      const stored = localStorage.getItem(pendingDeleteGroupsKey)
      const list: string[] = stored ? JSON.parse(stored) : []
      if (!list.includes(groupId)) {
        localStorage.setItem(pendingDeleteGroupsKey, JSON.stringify([...list, groupId]))
      }
    }

    const removePendingDeleteGroupIds = (groupIds: string[]) => {
      const stored = localStorage.getItem(pendingDeleteGroupsKey)
      const list: string[] = stored ? JSON.parse(stored) : []
      const groupIdSet = new Set(groupIds)
      const next = list.filter((groupId) => !groupIdSet.has(groupId))
      if (next.length > 0) {
        localStorage.setItem(pendingDeleteGroupsKey, JSON.stringify(next))
      } else {
        localStorage.removeItem(pendingDeleteGroupsKey)
      }
    }

    addPendingDeleteGroupId(id)

    const updated = groups.filter((g) => g.id !== id)
    get()._saveGroupsToStorage(updated)

    ;(async () => {
      if (navigator.onLine) {
        try {
          const { error } = await supabase.from("groups").delete().eq("id", id).eq("user_id", userSession.id)
          if (!error) {
            removePendingDeleteGroupIds([id])
          }
        } catch (err) {
          console.warn("Supabase failed to delete group in background:", err)
        }
      }
    })()
  },

  addMemberToGroup: (groupId, memberName) => {
    const newMember: Person = {
      id: crypto.randomUUID(),
      name: memberName.trim(),
    }
    const updated = get().groups.map((g) => {
      if (g.id === groupId) {
        return { ...g, members: [...g.members, newMember], synced: false }
      }
      return g
    })
    get()._saveGroupsToStorage(updated)
  },

  removeMemberFromGroup: (groupId, memberId) => {
    const updated = get().groups.map((g) => {
      if (g.id === groupId) {
        return { ...g, members: g.members.filter((m) => m.id !== memberId), synced: false }
      }
      return g
    })
    get()._saveGroupsToStorage(updated)
  },

  updateMemberInGroup: (groupId, memberId, memberName) => {
    const updated = get().groups.map((g) => {
      if (g.id === groupId) {
        const nextMembers = g.members.map((m) => (m.id === memberId && !m.userId ? { ...m, name: memberName.trim() } : m))
        return { ...g, members: nextMembers, synced: false }
      }
      return g
    })
    get()._saveGroupsToStorage(updated)
  },

  addSettlement: (groupId, settlement) => {
    const newSettlement: Settlement = {
      ...settlement,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    }
    const updated = get().groups.map((g) => {
      if (g.id === groupId) {
        return { ...g, settlements: [...(g.settlements || []), newSettlement], synced: false }
      }
      return g
    })
    get()._saveGroupsToStorage(updated)
  },

  loadGroupIntoActiveSplit: (groupId) => {
    const group = get().groups.find((g) => g.id === groupId)
    if (group) {
      get().setPeople([...group.members])
      get().setProducts([])
      get().setPaidBy(null)
      get().setPayments({})
    }
  },

  joinGroupByShareCode: async (code: string) => {
    const userSession = get().userSession
    const groups = get().groups
    const userId = userSession?.id || "anonymous"

    try {
      if (!userSession) throw new Error("You must be logged in to join a group.")

      const cleanCode = code.trim().toUpperCase()
      if (!cleanCode) return { success: false, message: "Please enter a valid share code." }

      const { data: groupData, error: groupErr } = await supabase
        .from("groups")
        .select("*")
        .eq("share_code", cleanCode)
        .single()

      if (groupErr || !groupData) {
        return { success: false, message: "Group not found. Please double check the share code." }
      }

      const alreadyMember = groups.some((g) => g.id === groupData.id)
      if (alreadyMember) {
        return { success: false, message: "You are already a member of this group!" }
      }

      const newMember: Person = {
        id: crypto.randomUUID(),
        name: userSession?.full_name || userSession?.username || "Unknown",
        username: userSession?.username,
        userId: userSession?.id
      }
      const updatedMembers = [...(groupData.members || []), newMember]

      const formattedGroup: Group = {
        id: groupData.id,
        name: groupData.name,
        members: updatedMembers,
        color: groupData.color,
        createdAt: new Date(groupData.created_at).getTime(),
        ownerId: groupData.user_id,
        shareCode: groupData.share_code,
        synced: true // we just got it from DB
      }

      await supabase.from("groups").update({ members: updatedMembers }).eq("id", formattedGroup.id)

      const storedJoinedKey = `homiepay-joined-group-ids-${userId}`
      const storedJoined = localStorage.getItem(storedJoinedKey)
      const joinedIds: string[] = storedJoined ? JSON.parse(storedJoined) : []
      if (!joinedIds.includes(formattedGroup.id)) {
        joinedIds.push(formattedGroup.id)
        localStorage.setItem(storedJoinedKey, JSON.stringify(joinedIds))
      }

      const updated = [formattedGroup, ...groups]
      const GROUPS_STORAGE_KEY = `homiepay-saved-groups-${userId}`
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(updated))
      set({ groups: updated })

      return { success: true, message: "Joined group successfully!", groupName: formattedGroup.name }
    } catch (err: any) {
      console.error("Failed to join group:", err)
      return { success: false, message: err.message || "An error occurred while joining the group." }
    }
  },

  fetchPendingInvites: async () => {
    const userSession = get().userSession
    if (!userSession || !navigator.onLine) return
    
    try {
      const { data, error } = await supabase
        .from('group_invites')
        .select(`
          *,
          group:groups(name),
          from_user:users!group_invites_from_user_id_fkey(full_name, username)
        `)
        .eq('to_user_id', userSession.id)
        .eq('status', 'pending')
        
      if (!error && data) {
        set({ pendingInvites: data as any })
      }
    } catch (err) {
      console.error("Failed to fetch invites", err)
    }
  },

  sendGroupInvite: async (groupId, username) => {
    const userSession = get().userSession
    if (!userSession) return { success: false, message: "Must be logged in to invite." }
    if (!navigator.onLine) return { success: false, message: "You are offline." }

    try {
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .single()
        
      if (userErr || !userData) {
        return { success: false, message: "User not found." }
      }
      
      if (userData.id === userSession.id) {
        return { success: false, message: "You cannot invite yourself." }
      }

      const group = get().groups.find(g => g.id === groupId)
      if (group?.members.some(m => m.userId === userData.id)) {
        return { success: false, message: "User is already in this group." }
      }
      
      const { error: inviteErr } = await supabase
        .from('group_invites')
        .insert({
          group_id: groupId,
          from_user_id: userSession.id,
          to_user_id: userData.id
        })
        
      if (inviteErr) {
        if (inviteErr.code === '23505') {
           return { success: false, message: "An invite is already pending for this user." }
        }
        throw inviteErr
      }
      
      return { success: true, message: "Invitation sent!" }
    } catch (err: any) {
      console.error(err)
      return { success: false, message: "Failed to send invitation." }
    }
  },

  respondToInvite: async (inviteId, accept) => {
     const userSession = get().userSession
     if (!userSession) return { success: false, message: "Not logged in." }
     
     try {
       const status = accept ? 'accepted' : 'declined'
       const { error } = await supabase
         .from('group_invites')
         .update({ status })
         .eq('id', inviteId)
         .eq('to_user_id', userSession.id)
         
       if (error) throw error
       
       if (accept) {
         const invite = get().pendingInvites.find(i => i.id === inviteId)
         if (invite) {
           const { data: groupData } = await supabase.from('groups').select('*').eq('id', invite.group_id).single()
           if (groupData) {
             const newMember: import('../lib/types').Person = {
               id: crypto.randomUUID(),
               name: userSession.full_name || userSession.username,
               username: userSession.username,
               userId: userSession.id
             }
             const updatedMembers = [...(groupData.members || []), newMember]
             await supabase.from('groups').update({ members: updatedMembers }).eq('id', groupData.id)
             
             const formattedGroup = {
               id: groupData.id,
               name: groupData.name,
               members: updatedMembers,
               color: groupData.color,
               createdAt: new Date(groupData.created_at).getTime(),
               ownerId: groupData.user_id,
               shareCode: groupData.share_code,
               synced: true
             }
             
             const existingGroups = get().groups
             if (!existingGroups.find(g => g.id === formattedGroup.id)) {
               const updated = [formattedGroup, ...existingGroups]
               set({ groups: updated })
               localStorage.setItem(`homiepay-saved-groups-${userSession.id}`, JSON.stringify(updated))
             } else {
               const updated = existingGroups.map(g => g.id === formattedGroup.id ? formattedGroup : g)
               set({ groups: updated })
               localStorage.setItem(`homiepay-saved-groups-${userSession.id}`, JSON.stringify(updated))
             }
           }
         }
       }
       
       set({ pendingInvites: get().pendingInvites.filter(i => i.id !== inviteId) })
       return { success: true, message: accept ? "Joined group!" : "Invitation declined." }
     } catch (err) {
       console.error(err)
       return { success: false, message: "Failed to respond to invitation." }
     }
  }
})
