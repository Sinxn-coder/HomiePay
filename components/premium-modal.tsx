"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PremiumModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  icon?: React.ReactNode
}

export function PremiumModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  icon,
}: PremiumModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      window.addEventListener("keydown", handleEscape)
    }
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center sm:p-6">
      {/* Premium Glassmorphism Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Floating Card Popup / Top Sheet */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-card border-b sm:border border-border/80 rounded-b-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform animate-in slide-in-from-top-full sm:zoom-in-95 sm:slide-in-from-bottom-8"
      >
        {/* Color Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-border/40">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-muted/20 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <X className="h-4.5 w-4.5" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
