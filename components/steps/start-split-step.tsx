"use client"

import { Receipt, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function StartSplitStep({ onStart }: { onStart: () => void }) {
  return (
    <Card className="w-[97vw] relative left-1/2 -translate-x-1/2 md:w-full md:left-auto md:translate-x-0 border-border/50 shadow-lg border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-400/10 blur-[80px] pointer-events-none" />
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6 relative z-10">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 border border-emerald-400/30">
          <Receipt className="h-10 w-10 text-white stroke-[2]" />
        </div>
        
        <div className="space-y-2 max-w-sm">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ready to split?</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Start a new bill to easily split expenses with friends, calculate who owes what, and keep track of balances.
          </p>
        </div>

        <Button 
          onClick={onStart}
          className="w-full sm:w-auto px-8 py-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm tracking-wider uppercase shadow-xl hover:shadow-emerald-600/20 transition-all hover:scale-105"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Start New Split
        </Button>
      </CardContent>
    </Card>
  )
}
