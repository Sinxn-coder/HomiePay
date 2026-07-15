"use client"

import { useState, useEffect, useRef } from "react"
import { Receipt, Plus, Users, History, Download, DollarSign, Smartphone, X, User, WifiOff, Wifi } from "lucide-react"
import { StepIndicator } from "@/components/step-indicator"
import { AddFriendsStep } from "@/components/steps/add-friends-step"
import { AddProductsStep } from "@/components/steps/add-products-step"
import { AssignProductsStep } from "@/components/steps/assign-products-step"
import { SelectPayerStep } from "@/components/steps/select-payer-step"
import { FinalCalculationStep } from "@/components/steps/final-calculation-step"
import { StartSplitStep } from "@/components/steps/start-split-step"
import { SavedBills } from "@/components/saved-bills"
import { GroupsView } from "@/components/groups-view"
import { ProfileView } from "@/components/profile-view"
import { AppTutorial } from "@/components/app-tutorial"
import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { SavedBill } from "@/lib/types"

// Loaded client-side only — Three.js Canvas can't run on the server
const FluidGlassNav = dynamic(
  () => import("@/components/fluid-glass-nav").then(m => ({ default: m.FluidGlassNav })),
  { ssr: false }
)

const STEP_LABELS = ["Friends", "Products", "Assign", "Payer", "Summary"]

export function ExpenseSplitter({ 
  userSession,
  onProfileUpdate
}: { 
  userSession: { id: string; username: string; full_name: string },
  onProfileUpdate: (session: { id: string; username: string; full_name: string }) => void
}) {
  const [activeTab, setActiveTab] = useState<"splitter" | "groups" | "history" | "profile">("splitter")
  const navSwipeRef = useRef({ startX: 0, active: false })
  const navTabs = ["splitter", "groups", "history", "profile"] as const
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showPwaPopup, setShowPwaPopup] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showSyncedToast, setShowSyncedToast] = useState(false)
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null)
  const [activeBillId, setActiveBillId] = useState<string | null>(null)
  
  const store = useStore()

  useEffect(() => {
    store.setUserSession(userSession)
    if (userSession) {
      store.syncPendingData()
    }
  }, [userSession])

  const {
    people,
    products,
    paidBy,
    payments,
    setPayments,
    groups,
    savedBills,
    isLoaded,
    addPerson,
    updatePerson,
    removePerson,
    addProduct,
    updateProduct,
    removeProduct,
    togglePersonForProduct,
    assignAllPeopleToProduct,
    toggleSplitByPercentage,
    updateProductPercentage,
    calculateSplits,
    calculateOwes,
    setPaidBy,
    resetAll,
    saveBill,
    getSavedBills,
    loadBill,
    deleteSavedBill,
    addGroup,
    updateGroup,
    deleteGroup,
    addMemberToGroup,
    removeMemberFromGroup,
    updateMemberInGroup,
    loadGroupIntoActiveSplit,
    joinGroupByShareCode,
    addSettlement,
    markPersonBillSettled,
    grandTotal,
  } = store

  const tutorialStorageKey = `homiepay-tutorial-complete-${userSession.id}`

  // Register PWA service worker on mount & capture install prompt
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Register service worker with explicit scope for subdirectory hosting
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js", { scope: "./" }).then(
          (reg) => console.log("[SW] Registered, scope:", reg.scope),
          (err) => console.error("[SW] Registration failed:", err)
        )
      }

      // Capture PWA install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        setInstallPrompt(e)
      }
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      }
    }
  }, [])

  // Show the first-run tutorial after login. PWA install prompts stay hidden until this is complete.
  useEffect(() => {
    if (typeof window === "undefined") return

    const completed = localStorage.getItem(tutorialStorageKey) === "true"
    setHasCompletedTutorial(completed)
    setShowTutorial(!completed)
    if (!completed) {
      setShowPwaPopup(false)
    }
  }, [tutorialStorageKey])

  // Track online/offline state for real-time indicator
  useEffect(() => {
    if (typeof window === "undefined") return
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowSyncedToast(true)
      store.syncPendingData()
      setTimeout(() => setShowSyncedToast(false), 3500)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Trigger PWA Install Steps Popup only after the onboarding tutorial is complete.
  useEffect(() => {
    if (!hasCompletedTutorial || showTutorial) return

    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone
      if (!isStandalone) {
        // Show popup after 1.5 seconds delay
        const showTimer = setTimeout(() => {
          setShowPwaPopup(true)
        }, 1500)

        return () => {
          clearTimeout(showTimer)
        }
      }
    }
  }, [hasCompletedTutorial, showTutorial])

  const handleReset = () => {
    const wasGroupBill = !!activeGroupId
    const wasHistoryBill = !!activeBillId
    resetAll()
    setCurrentStep(1)
    setActiveGroupId(null)
    setActiveGroupName(null)
    setActiveBillId(null)
    // If done with a group bill, go back to groups tab
    if (wasGroupBill) {
      setActiveTab("groups")
    } else if (wasHistoryBill) {
      setActiveTab("history")
    }
  }

  const handleSaveBill = () => {
    saveBill(activeGroupId ?? undefined, activeGroupName ?? undefined, activeBillId ?? undefined)
    // If created from a group context, go back to groups tab so user sees it in Bills tab
    if (activeGroupId) {
      setActiveTab("groups")
    } else {
      setActiveTab("history")
    }
    setActiveGroupId(null)
    setActiveGroupName(null)
    setActiveBillId(null)
    setCurrentStep(1)
  }

  const handleLoadBill = (billId: string) => {
    loadBill(billId)
    setActiveBillId(billId)
    
    // Check if the loaded bill is a group bill
    const bill = savedBills.find((b) => b.id === billId)
    if (bill?.groupId) {
      setActiveGroupId(bill.groupId)
      setActiveGroupName(bill.groupName ?? null)
    } else {
      setActiveGroupId(null)
      setActiveGroupName(null)
    }
    
    setCurrentStep(5)
    setActiveTab("splitter")
  }

  const handleDeleteBill = (billId: string) => {
    deleteSavedBill(billId)
  }

  const handleNewBill = () => {
    resetAll()
    setCurrentStep(1)
    setActiveGroupId(null)
    setActiveGroupName(null)
    setActiveBillId(null)
  }

  const handleInstallApp = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") {
      setInstallPrompt(null)
    }
  }

  const handleCompleteTutorial = () => {
    localStorage.setItem(tutorialStorageKey, "true")
    setHasCompletedTutorial(true)
    setShowTutorial(false)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <p className="text-muted-foreground font-medium">Loading HomiePay...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-[90px] md:pb-6">
      {/* Top Header / App Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Dollar Icon in Green on White BG */}
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 flex items-center justify-center shadow-sm transition-colors duration-300">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 font-bold" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">HomiePay</h1>
              {/* Offline Mode Micro-indicator */}
              {!isOnline && (
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1 leading-none mt-0.5 animate-pulse">
                  <WifiOff className="h-2.5 w-2.5" />
                  Offline · Saved Locally
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Offline badge chip */}
            {!isOnline && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Offline Mode
              </div>
            )}

            {/* Install PWA Button */}
            {installPrompt && hasCompletedTutorial && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstallApp}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-xs px-2.5 py-1.5 h-8 flex items-center gap-1 font-medium"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Install App
              </Button>
            )}

            {savedBills.length > 0 && activeTab === "splitter" && currentStep === 5 && (
              <Button variant="outline" size="sm" onClick={handleNewBill} className="h-8 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Bill
              </Button>
            )}
          </div>
        </div>

        {/* Offline Banner (mobile full-width) */}
        {!isOnline && (
          <div className="w-full bg-amber-500/10 border-t border-amber-200/60 px-4 py-1.5 flex items-center gap-2">
            <WifiOff className="h-3 w-3 text-amber-600 shrink-0" />
            <p className="text-[10px] font-semibold text-amber-700 leading-tight">
              You're offline. Your bills and groups are saved on this device and will sync when you reconnect.
            </p>
          </div>
        )}
      </header>

      {/* Main Content Layout */}
      <div className="max-w-2xl md:max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar Navigation - Hidden on Mobile */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-4">
          <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-sm space-y-2 sticky top-20">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 mb-2">Dashboard</p>
            
            <button
              onClick={() => setActiveTab("groups")}
              className={`w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                activeTab === "groups"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 scale-102"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4" />
                <span>Groups</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                activeTab === "groups" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground border border-border"
              }`}>
                {groups.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("splitter")}
              className={`w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                activeTab === "splitter"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 scale-102"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Split Bill</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                activeTab === "history"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 scale-102"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <History className="h-4 w-4" />
                <span>History</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                activeTab === "history" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground border border-border"
              }`}>
                {savedBills.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                activeTab === "profile"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/10 scale-102"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </button>
            
            {/* Divider */}
            <div className="h-px bg-border/50 my-2" />
            
            {/* Quick Stats Panel */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Stats</span>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Total Saved Bills:</span>
                <span className="font-semibold text-foreground">{savedBills.length}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total Groups:</span>
                <span className="font-semibold text-foreground">{groups.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Tab Content Display */}
          <div className="transition-all duration-300">
            {/* GROUPS TAB */}
            {activeTab === "groups" && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                <GroupsView
                  groups={groups}
                  currentUserId={userSession.id}
                  savedBills={savedBills}
                  onAddGroup={addGroup}
                  onUpdateGroup={updateGroup}
                  onDeleteGroup={deleteGroup}
                  onAddMember={addMemberToGroup}
                  onRemoveMember={removeMemberFromGroup}
                  onUpdateMember={updateMemberInGroup}
                  onAddSettlement={addSettlement}
                  onJoinGroup={joinGroupByShareCode}
                  onLoadBill={(billId) => {
                    handleLoadBill(billId)
                  }}
                  onDeleteBill={handleDeleteBill}
                  onMarkPersonBillSettled={markPersonBillSettled}
                  onSelectGroup={(groupId) => {
                    const group = groups.find(g => g.id === groupId)
                    loadGroupIntoActiveSplit(groupId)
                    setActiveGroupId(groupId)
                    setActiveGroupName(group?.name ?? null)
                    setCurrentStep(2) // Skip Step 1 (Friends) since group loaded them!
                    setActiveTab("splitter")
                  }}
                  onNewBill={() => {
                    handleNewBill()
                    setActiveTab("splitter")
                  }}
                />
              </div>
            )}

            {/* SPLIT BILL TAB */}
            {activeTab === "splitter" && (
              <div className="w-[95vw] relative left-1/2 -translate-x-1/2 md:w-full md:left-auto md:translate-x-0 space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                {/* Step Indicator */}
                {currentStep > 0 && <StepIndicator currentStep={currentStep} totalSteps={5} stepLabels={STEP_LABELS} />}

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {currentStep === 0 && (
                    <StartSplitStep 
                      onStart={() => {
                        resetAll()
                        setCurrentStep(1)
                      }} 
                    />
                  )}

                  {currentStep === 1 && (
                    <AddFriendsStep
                      people={people}
                      addPerson={addPerson}
                      updatePerson={updatePerson}
                      removePerson={removePerson}
                      onContinue={() => setCurrentStep(2)}
                    />
                  )}

                  {currentStep === 2 && (
                    <AddProductsStep
                      products={products}
                      addProduct={addProduct}
                      updateProduct={updateProduct}
                      removeProduct={removeProduct}
                      onBack={() => setCurrentStep(1)}
                      onContinue={() => setCurrentStep(3)}
                    />
                  )}

                  {currentStep === 3 && (
                    <AssignProductsStep
                      people={people}
                      products={products}
                      togglePersonForProduct={togglePersonForProduct}
                      assignAllPeopleToProduct={assignAllPeopleToProduct}
                      toggleSplitByPercentage={toggleSplitByPercentage}
                      updateProductPercentage={updateProductPercentage}
                      onBack={() => setCurrentStep(2)}
                      onContinue={() => setCurrentStep(4)}
                    />
                  )}

                  {currentStep === 4 && (
                    <SelectPayerStep
                      people={people}
                      paidBy={paidBy}
                      setPaidBy={setPaidBy}
                      payments={payments}
                      setPayments={setPayments}
                      grandTotal={grandTotal}
                      onBack={() => setCurrentStep(3)}
                      onContinue={() => {
                        // Auto-save immediately when entering final step
                        const savedId = saveBill(activeGroupId ?? undefined, activeGroupName ?? undefined, activeBillId ?? undefined)
                        if (!activeBillId) {
                          setActiveBillId(savedId)
                        }
                        setCurrentStep(5)
                      }}
                    />
                  )}

                  {currentStep === 5 && (
                    <FinalCalculationStep
                      people={people}
                      paidBy={paidBy}
                      payments={payments}
                      calculateSplits={calculateSplits}
                      calculateOwes={calculateOwes}
                      grandTotal={grandTotal}
                      onBack={() => setCurrentStep(4)}
                      onReset={handleReset}
                      onSaveBill={handleSaveBill}
                      isGroupBill={!!activeGroupId}
                      isHistoryBill={!!activeBillId}
                    />
                  )}
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                <SavedBills
                  bills={savedBills}
                  onLoadBill={handleLoadBill}
                  onDeleteBill={handleDeleteBill}
                />
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                <ProfileView
                  userSession={userSession}
                  onProfileUpdate={onProfileUpdate}
                  totalGroups={groups.length}
                  totalBills={savedBills.length}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Floating Bottom Tab Navigation (Fixed bottom) */}
      <div 
        className="md:hidden flex ios-nav-container touch-pan-y"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          navSwipeRef.current = { startX: e.clientX, active: true };
          setIsDragging(true);
          setDragOffset(0);
          setIsPressing(true);
        }}
        onPointerMove={(e) => {
          if (!navSwipeRef.current.active) return;
          const deltaX = e.clientX - navSwipeRef.current.startX;
          const currentIndex = navTabs.indexOf(activeTab);
          const tabWidth = typeof window !== 'undefined' ? (window.innerWidth - 40) / 4 : 90;
          const maxDrag = tabWidth / 2;
          let clampedDelta = deltaX;
          if (currentIndex === 0 && deltaX < 0) {
            clampedDelta = Math.max(deltaX, -maxDrag);
          } else if (currentIndex === navTabs.length - 1 && deltaX > 0) {
            clampedDelta = Math.min(deltaX, maxDrag);
          }
          setDragOffset(clampedDelta);
        }}
        onPointerUp={(e) => {
          if (!navSwipeRef.current.active) return;
          navSwipeRef.current.active = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
          setIsDragging(false);
          setDragOffset(0);
          setIsPressing(false);
          const deltaX = e.clientX - navSwipeRef.current.startX;
          const tabWidth = typeof window !== 'undefined' ? (window.innerWidth - 40) / 4 : 90;
          const currentIndex = navTabs.indexOf(activeTab);
          const shift = Math.round(deltaX / tabWidth);
          let nextIndex = currentIndex + shift;
          if (nextIndex < 0) nextIndex = 0;
          if (nextIndex > 3) nextIndex = 3;
          if (nextIndex !== currentIndex) {
            setActiveTab(navTabs[nextIndex]);
          }
        }}
        onPointerCancel={(e) => {
          navSwipeRef.current.active = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
          setIsDragging(false);
          setDragOffset(0);
          setIsPressing(false);
        }}
      >
        {/* Three.js Fluid Glass highlighter */}
        <FluidGlassNav
          activeIndex={navTabs.indexOf(activeTab)}
          tabCount={navTabs.length}
          dragOffset={dragOffset}
          isDragging={isDragging}
          isPressed={isPressing}
        />
        
        <button
          onClick={() => setActiveTab("splitter")}
          className={`ios-nav-item ${activeTab === "splitter" ? "active" : ""}`}
        >
          <Receipt className="ios-nav-icon" />
          <span className="ios-nav-label">Split Bill</span>
        </button>

        <button
          onClick={() => setActiveTab("groups")}
          className={`ios-nav-item ${activeTab === "groups" ? "active" : ""}`}
        >
          <Users className="ios-nav-icon" />
          <span className="ios-nav-label">Groups</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`ios-nav-item ${activeTab === "history" ? "active" : ""}`}
        >
          <History className="ios-nav-icon" />
          <span className="ios-nav-label">History</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`ios-nav-item ${activeTab === "profile" ? "active" : ""}`}
        >
          <User className="ios-nav-icon" />
          <span className="ios-nav-label">Profile</span>
        </button>
      </div>

      {/* Back-online Synced Toast */}
      {showSyncedToast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xl shadow-emerald-900/20 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <Wifi className="h-3.5 w-3.5" />
          Back online! Syncing your data to the cloud...
        </div>
      )}

      {showTutorial && (
        <AppTutorial
          userName={userSession.full_name || userSession.username}
          onComplete={handleCompleteTutorial}
        />
      )}

      {/* Footer Branding (Nexlyte) */}
      <footer className="w-full py-8 border-t border-border/10 flex items-center justify-center mt-8 pb-24 md:pb-8">
        <a 
          href="https://sinxn-coder.github.io/Nexlyte/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex flex-row items-center justify-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group"
        >
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-semibold opacity-75 group-hover:text-foreground transition-colors">Powered by</span>
          <img 
            src="nexlytelight.png" 
            alt="Nexlyte Light" 
            className="h-4.5 w-auto object-contain dark:hidden group-hover:scale-105 transition-transform duration-200" 
          />
          <img 
            src="nexlytedark.png" 
            alt="Nexlyte Dark" 
            className="h-4.5 w-auto object-contain hidden dark:block group-hover:scale-105 transition-transform duration-200" 
          />
          <span className="text-xs font-bold tracking-tight text-foreground/80 group-hover:text-emerald-600 transition-colors duration-200">Nexlyte</span>
        </a>
      </footer>

      {/* PWA Floating Installation Popup & Steps */}
      {showPwaPopup && hasCompletedTutorial && (
        <div className="fixed bottom-20 md:bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 p-4 rounded-2xl bg-card border border-border/80 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm shrink-0">
                <Smartphone className="h-5 w-5 text-emerald-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Install HomiePay PWA</h3>
                <p className="text-xs text-muted-foreground">Use fully offline like a native app!</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPwaPopup(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="mt-3.5 pt-3.5 border-t border-border/40 space-y-2">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">How to Install:</p>
            <div className="text-xs space-y-2 text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="w-4.5 h-4.5 rounded-full bg-emerald-50 text-[10px] text-emerald-700 flex items-center justify-center shrink-0 font-bold">1</span>
                <p className="leading-snug">
                  <span className="font-semibold text-foreground">Mobile:</span> Tap the browser's <span className="underline font-medium">Share</span> or <span className="underline font-medium">Menu</span> button.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4.5 h-4.5 rounded-full bg-emerald-50 text-[10px] text-emerald-700 flex items-center justify-center shrink-0 font-bold">2</span>
                <p className="leading-snug">
                  Tap <span className="font-semibold text-foreground">"Add to Home Screen"</span> or <span className="font-semibold text-foreground">"Install App"</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
