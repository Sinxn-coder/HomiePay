"use client"

import { useState } from "react"
import { Bell, Check, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useStore } from "@/store/useStore"
import { toast } from "sonner"
import type { GroupInvite } from "@/lib/types"

export function NotificationsDialog() {
  const [open, setOpen] = useState(false)
  const { pendingInvites, respondToInvite } = useStore()
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const handleRespond = async (invite: GroupInvite, accept: boolean) => {
    setLoadingIds(prev => new Set(prev).add(invite.id))
    try {
      const { success, message } = await respondToInvite(invite.id, accept)
      if (success) {
        toast.success(message)
        if (pendingInvites.length === 1) {
          setOpen(false) // Close if that was the last one
        }
      } else {
        toast.error(message)
      }
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(invite.id)
        return next
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          {pendingInvites.length > 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{pendingInvites.length}</span>
            </span>
          )}
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {pendingInvites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">You have no new notifications.</p>
            </div>
          ) : (
            pendingInvites.map((invite) => (
              <div 
                key={invite.id} 
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50"
              >
                <div>
                  <p className="text-sm font-semibold">
                    Group Invite: {invite.group?.name || "Unknown Group"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    From {invite.from_user?.full_name || invite.from_user?.username}
                  </p>
                </div>
                
                <div className="flex gap-1.5">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0"
                    onClick={() => handleRespond(invite, false)}
                    disabled={loadingIds.has(invite.id)}
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleRespond(invite, true)}
                    disabled={loadingIds.has(invite.id)}
                  >
                    <Check className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
