"use client"

import { History, IndianRupee, Trash2, Users, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SavedBill } from "@/lib/types"

interface SavedBillsProps {
  bills: SavedBill[]
  onLoadBill: (billId: string) => void
  onDeleteBill: (billId: string) => void
}

export function SavedBills({ bills, onLoadBill, onDeleteBill }: SavedBillsProps) {
  if (bills.length === 0) {
    return (
      <Card className="w-[95vw] relative left-1/2 -translate-x-1/2 sm:w-full sm:left-auto sm:translate-x-0 border-border/50 shadow-lg">
        <CardContent className="p-8 text-center text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No saved bills yet</p>
          <p className="text-sm">Bills you split will appear here forever</p>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="w-[95vw] relative left-1/2 -translate-x-1/2 sm:w-full sm:left-auto sm:translate-x-0 border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
          Saved Bills History
        </CardTitle>
        <p className="text-xs text-muted-foreground">Your bill splits are saved forever locally on this device</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {bills.map((bill, index) => {
          const payersCount = bill.payments ? Object.keys(bill.payments).filter(id => (bill.payments?.[id] || 0) > 0).length : 0
          let payerText = ""
          if (payersCount > 1) {
            payerText = `Paid by ${payersCount} people`
          } else if (bill.paidBy) {
            const singlePayer = bill.people.find((p) => p.id === bill.paidBy)
            if (singlePayer) {
              payerText = `Paid by ${singlePayer.name}`
            }
          } else if (bill.payments) {
            const solePayerId = Object.keys(bill.payments).find(id => (bill.payments?.[id] || 0) > 0)
            const solePayer = solePayerId ? bill.people.find(p => p.id === solePayerId) : null
            if (solePayer) {
              payerText = `Paid by ${solePayer.name}`
            }
          }

          return (
            <div
              key={bill.id}
              className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-all duration-200 animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => onLoadBill(bill.id)}
                  className="flex-1 text-left hover:opacity-85 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IndianRupee className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground flex items-center">
                          <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                          {bill.grandTotal.toFixed(2)}
                        </span>
                        <span className="text-xs bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {bill.people.length} friends
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatDate(bill.createdAt)}</span>
                        {payerText && (
                          <>
                            <span>•</span>
                            <span className="truncate">{payerText}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteBill(bill.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
