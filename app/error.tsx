"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to standard error logs
    console.error("Unhandled PWA Runtime Error:", error)
    
    // Auto-recover on first error
    const hasAutoReloaded = sessionStorage.getItem('homiepay_auto_reloaded')
    if (!hasAutoReloaded) {
      sessionStorage.setItem('homiepay_auto_reloaded', 'true')
      
      // Clear SW caches to fix 404s for old chunks
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name))
        }).catch(() => {})
      }
      
      // We don't want to wipe localStorage automatically unless necessary, 
      // but if it's a breaking schema change, we might need to.
      // Let's just force a hard reload first to fetch new JS bundles.
      window.location.replace("/?reset=" + Date.now())
    }
  }, [error])

  const handleResetData = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name))
        })
      }
    } catch (e) {
      // storage might be blocked in some browsers
    }
    window.location.replace("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6 p-6 rounded-2xl border border-destructive/20 bg-card shadow-2xl animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive animate-bounce" />
        </div>
        
        <div className="space-y-2 text-left bg-slate-100 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-32 text-xs">
          <p className="font-mono text-red-600 dark:text-red-400 break-all">{error.message}</p>
          {error.digest && <p className="font-mono text-slate-500 mt-1">Digest: {error.digest}</p>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={reset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Button onClick={handleResetData} variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Reset App Data
          </Button>
        </div>
      </div>
    </div>
  )
}
