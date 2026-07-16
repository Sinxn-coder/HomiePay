"use client"

import { useState } from "react"
import { Plus, Trash2, Edit3, Check, X, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PremiumModal } from "@/components/premium-modal"
import type { Person } from "@/lib/types"

interface AddFriendsStepProps {
  people: Person[]
  addPerson: (name: string) => void
  updatePerson: (id: string, name: string) => void
  removePerson: (id: string) => void
  onContinue: () => void
  onBack?: () => void
}

export function AddFriendsStep({
  people,
  addPerson,
  updatePerson,
  removePerson,
  onContinue,
  onBack,
}: AddFriendsStepProps) {
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleAddPerson = () => {
    if (newName.trim()) {
      addPerson(newName)
      setNewName("")
      setIsSheetOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddPerson()
    }
  }

  const startEditing = (person: Person) => {
    setEditingId(person.id)
    setEditingName(person.name)
    setConfirmDeleteId(null)
  }

  const saveEdit = () => {
    if (editingId && editingName.trim()) {
      updatePerson(editingId, editingName)
      setEditingId(null)
      setEditingName("")
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit()
    } else if (e.key === "Escape") {
      cancelEdit()
    }
  }

  return (
    <>
      <Card className="border-border/50 shadow-lg relative">
        {onBack && (
          <div className="absolute top-4 right-4 z-10">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>
        )}
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-12 sm:pt-6">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              Add Friends
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add the names of people who will split the bill
            </p>
          </div>
          <Button
            onClick={() => setIsSheetOpen(true)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4.5 w-4.5 mr-2" />
            Add Friend
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {people.length > 0 && (
            <div className="space-y-2 mt-2">
              {people.map((person, index) => (
                <div
                  key={person.id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 animate-in fade-in slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {editingId === person.id && !person.userId ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="flex-1 h-8"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary hover:text-primary"
                        onClick={saveEdit}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={cancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{person.name}</span>
                      {confirmDeleteId === person.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                          <span className="text-[10px] font-bold text-destructive uppercase tracking-wide mr-1 select-none">Delete?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2.5 text-xs font-bold rounded-lg shadow-sm"
                            onClick={() => {
                              removePerson(person.id)
                              setConfirmDeleteId(null)
                            }}
                          >
                            Yes
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          {!person.userId && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => startEditing(person)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDeleteId(person.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {people.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border/60 rounded-xl bg-muted/20">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30 text-emerald-600" />
              <p className="font-semibold text-foreground/80">No friends added yet</p>
              <p className="text-sm">Add at least 2 people to continue</p>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button
              onClick={onContinue}
              disabled={people.length < 2}
              className="min-w-32"
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Premium Add Friend Popup Modal */}
      <PremiumModal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Add New Friend"
        description="Introduce a friend who will share split charges"
        icon={<Users className="h-5 w-5 text-emerald-600" />}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/90">
              Friend&apos;s Name
            </label>
            <Input
              placeholder="e.g. Rahul, John, Priya"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-12 text-base border-border/80 focus:border-primary/80 focus:ring-primary/20 rounded-xl"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsSheetOpen(false)}
              className="flex-1 h-12 rounded-xl text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPerson}
              disabled={!newName.trim()}
              className="flex-1 h-12 rounded-xl text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Friend
            </Button>
          </div>
        </div>
      </PremiumModal>
    </>
  )
}
