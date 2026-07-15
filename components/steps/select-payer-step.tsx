"use client"

import { useState, useEffect } from "react"
import { Wallet, Check, Sparkles, Info, Users, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Person } from "@/lib/types"

interface SelectPayerStepProps {
  people: Person[]
  paidBy: string | null
  setPaidBy: (id: string | null) => void
  payments: Record<string, number>
  setPayments: (payments: Record<string, number>) => void
  grandTotal: number
  onBack: () => void
  onContinue: () => void
}

export function SelectPayerStep({
  people,
  paidBy,
  setPaidBy,
  payments,
  setPayments,
  grandTotal,
  onBack,
  onContinue,
}: SelectPayerStepProps) {
  // Calculate sum of currently entered payments
  const totalPaid = Object.values(payments).reduce((sum, val) => sum + val, 0)
  const remainingAmount = Math.max(0, grandTotal - totalPaid)
  const isFullyPaid = Math.abs(totalPaid - grandTotal) < 0.01

  // Handle toggling a person as a payer (triggered by clicking their profile letter / card)
  const handleTogglePayer = (personId: string) => {
    const activePayers = Object.keys(payments).filter((id) => payments[id] > 0)
    const isAlreadyPayer = payments[personId] !== undefined

    if (isAlreadyPayer) {
      // Toggle off: remove payment entry for this person
      const nextPayments = { ...payments }
      delete nextPayments[personId]

      // If only one payer remains, auto-fill them to the grand total to keep it balanced
      const remainingPayers = Object.keys(nextPayments)
      if (remainingPayers.length === 1) {
        const solePayerId = remainingPayers[0]
        nextPayments[solePayerId] = grandTotal
        setPaidBy(solePayerId)
      } else if (remainingPayers.length === 0) {
        setPaidBy(null)
      } else {
        setPaidBy(null)
      }
      setPayments(nextPayments)
    } else {
      // Toggle on: add as payer
      let initialAmount = 0
      if (activePayers.length === 0) {
        // First payer takes the entire bill
        initialAmount = grandTotal
        setPaidBy(personId)
      } else {
        // Subsequent payers take the remaining balance (if any)
        initialAmount = remainingAmount
        setPaidBy(null)
      }

      const nextPayments = {
        ...payments,
        [personId]: Number(initialAmount.toFixed(2)),
      }
      setPayments(nextPayments)
    }
  }

  // Handle entering custom numerical amount
  const handleAmountChange = (personId: string, value: string) => {
    let numVal = parseFloat(value) || 0
    if (numVal < 0) numVal = 0

    // Sum of other payments
    const otherSum = Object.entries(payments)
      .filter(([id]) => id !== personId)
      .reduce((sum, [, val]) => sum + val, 0)

    // Rule: payment cannot exceed the remaining balance
    const maxVal = Math.max(0, grandTotal - otherSum)
    const cappedVal = Number(Math.min(numVal, maxVal).toFixed(2))

    const nextPayments = {
      ...payments,
      [personId]: cappedVal,
    }
    setPayments(nextPayments)

    // Sync single payer fallback
    const activeIds = Object.keys(nextPayments).filter((id) => nextPayments[id] > 0)
    if (activeIds.length === 1) {
      setPaidBy(activeIds[0])
    } else {
      setPaidBy(null)
    }
  }

  // Quick fill remaining balance for a person
  const handleQuickFill = (personId: string) => {
    if (remainingAmount <= 0) return

    const otherSum = Object.entries(payments)
      .filter(([id]) => id !== personId)
      .reduce((sum, [, val]) => sum + val, 0)

    const nextPayments = {
      ...payments,
      [personId]: Number(Math.max(0, grandTotal - otherSum).toFixed(2)),
    }
    setPayments(nextPayments)

    // Sync single payer fallback
    const activeIds = Object.keys(nextPayments).filter((id) => nextPayments[id] > 0)
    if (activeIds.length === 1) {
      setPaidBy(activeIds[0])
    } else {
      setPaidBy(null)
    }
  }

  const progressPercent = Math.min(100, (totalPaid / grandTotal) * 100)
  const activePayersCount = Object.keys(payments).length

  return (
    <Card className="border-border/50 shadow-lg overflow-hidden">
      <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-5 w-5 text-emerald-500" />
            Who Paid the Bill?
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click on a friend's card to select them as a payer and split the bill amount.
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Grand Total Indicator */}
        <div className="p-3 sm:p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap block truncate">Total Bill Amount</span>
              <p className="text-base sm:text-lg font-extrabold text-foreground whitespace-nowrap truncate">Rs. {grandTotal.toFixed(2)}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`shrink-0 whitespace-nowrap px-2 py-1 sm:px-2.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 ${isFullyPaid
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
            }`}>
            {isFullyPaid ? "Fully Split" : `Rs. ${remainingAmount.toFixed(2)} Remaining`}
          </div>
        </div>

        {/* Payment Allocation Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Bill Payment Allocated</span>
            <span className="font-semibold text-foreground">
              Rs. {totalPaid.toFixed(2)} / Rs. {grandTotal.toFixed(2)} ({Math.round(progressPercent)}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden border border-border/50 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isFullyPaid
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-amber-500 to-emerald-500"
                }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Payers Interactive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {people.map((person, index) => {
            const isPayer = payments[person.id] !== undefined
            const paidAmount = payments[person.id] || 0

            return (
              <div
                key={person.id}
                className={`p-4 rounded-xl border-2 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-3 cursor-pointer ${isPayer
                    ? "border-emerald-500 bg-emerald-500/[0.02]"
                    : "border-border hover:border-emerald-500/30 hover:bg-muted/30"
                  }`}
                style={{ animationDelay: `${index * 40}ms` }}
                onClick={() => handleTogglePayer(person.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-left">
                    <button
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all focus:outline-none ${isPayer
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {isPayer ? (
                        <Check className="h-5 w-5 stroke-[2.5]" />
                      ) : (
                        <span className="font-bold text-sm">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </button>
                    <div>
                      <span className="font-semibold text-sm text-foreground block">{person.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {isPayer ? "Selected Payer" : "Click to select"}
                      </span>
                    </div>
                  </div>

                  {/* Auto-fill Balance Button */}
                  {isPayer && remainingAmount > 0 && paidAmount < grandTotal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation() // Prevent toggling the payer off
                        handleQuickFill(person.id)
                      }}
                      className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 px-2 rounded-lg font-medium"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Auto-fill
                    </Button>
                  )}
                </div>

                {/* Amount Input Field (Only visible when active payer) */}
                {isPayer && (
                  <div
                    className="flex items-center gap-2 pt-1 animate-in slide-in-from-top-1.5 duration-200"
                    onClick={(e) => e.stopPropagation()} // Prevent clicking input from toggling payer off
                  >
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        Rs.
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={paidAmount === 0 ? "" : paidAmount}
                        onChange={(e) => handleAmountChange(person.id, e.target.value)}
                        className="w-full bg-background border border-border rounded-xl py-1.5 pl-8 pr-3 text-xs font-bold text-foreground focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      Max: Rs. {(grandTotal - Object.entries(payments).filter(([id]) => id !== person.id).reduce((sum, [, val]) => sum + val, 0)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Informative / Warning Badges */}
        {activePayersCount === 0 && (
          <div className="flex gap-2 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground animate-in fade-in">
            <Info className="h-4 w-4 shrink-0 text-emerald-500" />
            <p>Select at least one payer above to specify who paid the bill.</p>
          </div>
        )}

        {activePayersCount > 0 && !isFullyPaid && (
          <div className="flex gap-2.5 p-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-xs text-amber-600 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Payments not fully allocated</p>
              <p className="mt-0.5 text-muted-foreground">
                The total allocated payments (Rs. {totalPaid.toFixed(2)}) must equal the grand total of the bill (Rs. {grandTotal.toFixed(2)}) before continuing.
              </p>
            </div>
          </div>
        )}

        {activePayersCount > 0 && isFullyPaid && (
          <div className="flex gap-2.5 p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 text-xs text-emerald-600 animate-in fade-in">
            <Check className="h-4 w-4 shrink-0 mt-0.5 stroke-[2.5]" />
            <div>
              <p className="font-semibold">Payments balanced perfectly!</p>
              <p className="mt-0.5 text-muted-foreground">
                Click Calculate to run the splits and optimal transaction settlements.
              </p>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-4 flex justify-between border-t border-border/50">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={onContinue}
            disabled={!isFullyPaid}
            className="min-w-32 bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
          >
            Calculate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
