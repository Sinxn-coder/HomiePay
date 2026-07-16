"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, Check, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

const AVATAR_OPTIONS = [
  "/profiles/female1.gif",
  "/profiles/female2.gif",
  "/profiles/man1.gif",
  "/profiles/man2.gif",
  "/profiles/man3.gif",
]

interface AvatarPageProps {
  currentAvatar: string | null
  onClose: () => void
  onSave: (avatarUrl: string) => void
}

export function AvatarPage({ currentAvatar, onClose, onSave }: AvatarPageProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => setMounted(true), [])

  const handleSave = async () => {
    if (!selectedAvatar) return
    setIsSaving(true)
    // simulate a small delay for better UX
    await new Promise((r) => setTimeout(r, 500))
    onSave(selectedAvatar)
    setIsSaving(false)
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex-1 text-center pr-10">Select Profile</h1>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-2xl mx-auto p-8 pb-24 sm:p-12 flex flex-col items-center">
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 text-center text-lg">
          Choose a unique animated avatar for your profile
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full">
          {AVATAR_OPTIONS.map((avatarUrl, index) => {
            const isSelected = selectedAvatar === avatarUrl
            
            return (
              <button
                key={index}
                onClick={() => setSelectedAvatar(avatarUrl)}
                className={`relative group rounded-3xl overflow-hidden aspect-square border-4 transition-all duration-300 ${
                  isSelected 
                    ? "border-emerald-500 shadow-xl shadow-emerald-500/20 scale-105" 
                    : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
                }`}
              >
                <img 
                  src={avatarUrl} 
                  alt={`Avatar Option ${index + 1}`} 
                  className={`w-full h-full object-contain transition-transform duration-300 ${isSelected ? "" : "group-hover:scale-110"} ${
                    avatarUrl.includes('female2.gif') ? '-translate-y-2 sm:-translate-y-4 scale-110' : ''
                  }`}
                />
                
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full shadow-lg animate-in zoom-in">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-12 w-full max-w-md">
          <Button 
            onClick={handleSave} 
            disabled={!selectedAvatar || isSaving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-lg rounded-2xl shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none transition-all duration-300"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                Set as Profile Picture
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
