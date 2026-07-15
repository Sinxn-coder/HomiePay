"use client"

import { useState, useCallback } from "react"
import {
  Calculator,
  IndianRupee,
  RotateCcw,
  Receipt,
  Share2,
  Download,
  ArrowRight,
  Save,
  Loader2,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Person } from "@/lib/types"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface FinalCalculationStepProps {
  people: Person[]
  paidBy: string | null
  payments: Record<string, number>
  calculateSplits: () => Record<
    string,
    { items: { name: string; amount: number; quantity: number }[]; total: number }
  >
  calculateOwes: () => { from: string; to: string; amount: number }[]
  grandTotal: number
  onBack: () => void
  onReset: () => void
  onSaveBill: () => void
  isGroupBill?: boolean
  isHistoryBill?: boolean
}

export function FinalCalculationStep({
  people,
  paidBy,
  payments,
  calculateSplits,
  calculateOwes,
  grandTotal,
  onBack,
  onReset,
  onSaveBill,
  isGroupBill = false,
  isHistoryBill = false,
}: FinalCalculationStepProps) {
  const splits = calculateSplits()
  const owes = calculateOwes()
  
  const [isSharingPDF, setIsSharingPDF] = useState(false)

  // Find single payer if applicable for display compatibility
  const activePayers = Object.entries(payments).filter(([, amt]) => amt > 0)
  const singlePayerId = activePayers.length === 1 ? activePayers[0][0] : paidBy
  const payer = people.find((p) => p.id === singlePayerId)

  // PDF Generator Callback
  const generatePDF = useCallback(() => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Colors
    const primaryColor: [number, number, number] = [20, 184, 166] // Teal
    const darkBg: [number, number, number] = [15, 23, 42]
    const lightText: [number, number, number] = [248, 250, 252]
    const mutedText: [number, number, number] = [148, 163, 184]
    
    // Header background
    doc.setFillColor(...darkBg)
    doc.rect(0, 0, pageWidth, 45, "F")
    
    // Title
    doc.setTextColor(...lightText)
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("Bill Split Summary", pageWidth / 2, 20, { align: "center" })
    
    // Date
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...mutedText)
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN", { 
      day: "numeric", 
      month: "long", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })}`, pageWidth / 2, 30, { align: "center" })
    
    // Grand Total Box
    doc.setFillColor(...primaryColor)
    doc.roundedRect(14, 50, pageWidth - 28, 25, 3, 3, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text("Grand Total", 20, 60)
    
    const activePayersList = people.filter((p) => (payments[p.id] || 0) > 0)
    if (activePayersList.length > 1) {
      doc.setFontSize(8)
      doc.text(`Paid by: ${activePayersList.map(p => `${p.name} (Rs.${payments[p.id].toFixed(2)})`).join(", ")}`, 20, 68)
    } else if (payer) {
      doc.setFontSize(9)
      doc.text(`Paid by: ${payer.name}`, 20, 68)
    }
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text(`Rs. ${grandTotal.toFixed(2)}`, pageWidth - 20, 65, { align: "right" })
    
    let yPos = 85
    
    // Settlement Summary
    if (owes.length > 0) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...darkBg)
      doc.text("Settlement Summary", 14, yPos)
      yPos += 5
      
      const settlementData = owes
        .filter((t) => t.amount > 0)
        .map((t) => {
          const fromPerson = people.find((p) => p.id === t.from)
          const toPerson = people.find((p) => p.id === t.to)
          return [fromPerson?.name || "", "→", toPerson?.name || "", `Rs. ${t.amount.toFixed(2)}`]
        })
      
      if (settlementData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [["From", "", "To", "Amount"]],
          body: settlementData,
          theme: "grid",
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
          },
          bodyStyles: {
            textColor: darkBg,
            halign: "center",
          },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 20 },
            2: { cellWidth: 50 },
            3: { cellWidth: 40, fontStyle: "bold" },
          },
          margin: { left: 14, right: 14 },
        })
        
        yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
      }
    }
    
    // Individual Breakdowns
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...darkBg)
    doc.text("Individual Breakdown", 14, yPos)
    yPos += 5
    
    const breakdownData: (string | number)[][] = []
    
    people.forEach((person) => {
      const personSplit = splits[person.id]
      if (personSplit && personSplit.items.length > 0) {
        const isPersonPayer = (payments[person.id] || 0) > 0
        const personName = isPersonPayer ? `${person.name} (Paid)` : person.name
        
        personSplit.items.forEach((item, idx) => {
          const qtyText = item.quantity > 1 ? ` (x${item.quantity})` : ""
          breakdownData.push([
            idx === 0 ? personName : "",
            `${item.name}${qtyText}`,
            `Rs. ${item.amount.toFixed(2)}`,
            idx === 0 ? `Rs. ${personSplit.total.toFixed(2)}` : "",
          ])
        })
        
        if (people.indexOf(person) < people.length - 1) {
          breakdownData.push(["", "", "", ""])
        }
      }
    })
    
    autoTable(doc, {
      startY: yPos,
      head: [["Person", "Item", "Amount", "Total"]],
      body: breakdownData,
      theme: "striped",
      headStyles: {
        fillColor: darkBg,
        textColor: lightText,
        fontStyle: "bold",
      },
      bodyStyles: {
        textColor: darkBg,
      },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: "bold" },
        1: { cellWidth: 60 },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 40, halign: "right", fontStyle: "bold", textColor: primaryColor },
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        const raw = data.row.raw
        if (data.section === "body" && Array.isArray(raw) && String(raw[0]).includes("(Paid)")) {
          data.cell.styles.fillColor = [204, 251, 241]
        }
      },
    })
    
    // Footer
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
    doc.setFontSize(9)
    doc.setTextColor(...mutedText)
    doc.text("Generated by HomiePay App", pageWidth / 2, finalY, { align: "center" })
    
    return doc
  }, [grandTotal, owes, payer, people, splits, payments])

  // Fallback WhatsApp Text Generator
  const generateShareText = useCallback(() => {
    let text = `*Bill Split Summary*\n`
    text += `━━━━━━━━━━━━━━━━━\n`
    text += `*Grand Total:* Rs.${grandTotal.toFixed(2)}\n`
    
    const activePayersList = people.filter((p) => (payments[p.id] || 0) > 0)
    if (activePayersList.length > 1) {
      text += `*Paid by:*\n`
      activePayersList.forEach((p) => {
        text += `  • ${p.name}: Rs.${payments[p.id].toFixed(2)}\n`
      })
    } else if (payer) {
      text += `*Paid by:* ${payer.name}\n`
    }
    text += `\n`

    people.forEach((person) => {
      const personSplit = splits[person.id]
      if (personSplit && personSplit.items.length > 0) {
        text += `*${person.name}:*\n`
        personSplit.items.forEach((item) => {
          const qtyText = item.quantity > 1 ? ` (x${item.quantity})` : ""
          text += `  • ${item.name}${qtyText}: Rs.${item.amount.toFixed(2)}\n`
        })
        text += `  *Total: Rs.${personSplit.total.toFixed(2)}*\n`
        text += `\n`
      }
    })

    if (owes.length > 0) {
      text += `*Settlement:*\n`
      owes.forEach((transaction) => {
        const fromPerson = people.find((p) => p.id === transaction.from)
        const toPerson = people.find((p) => p.id === transaction.to)
        if (fromPerson && toPerson && transaction.amount > 0) {
          text += `${fromPerson.name} ➜ ${toPerson.name}: Rs.${transaction.amount.toFixed(2)}\n`
        }
      })
    }

    return text
  }, [grandTotal, owes, payer, people, splits, payments])

  const triggerWhatsAppTextOnly = useCallback(() => {
    const text = generateShareText()
    const encoded = encodeURIComponent(text)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      window.location.href = `whatsapp://send?text=${encoded}`
    } else {
      window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank")
    }
  }, [generateShareText])

  // NEW: Share PDF directly to WhatsApp / Native Share Sheet
  const handleSharePDFToWhatsApp = async () => {
    setIsSharingPDF(true)
    try {
      const doc = generatePDF()
      const pdfBlob = doc.output("blob")
      const fileName = `bill-split-${new Date().toISOString().split("T")[0]}.pdf`
      const file = new File([pdfBlob], fileName, { type: "application/pdf" })

      // Check if native navigator.share supports sharing documents/files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "HomiePay PDF Report",
          text: `HomiePay bill split report for Rs. ${grandTotal.toFixed(2)}`,
        })
      } else {
        // Desktop Fallback: Download the PDF report automatically and redirect to WhatsApp Web
        const pdfUrl = URL.createObjectURL(pdfBlob)
        const link = document.createElement("a")
        link.href = pdfUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(pdfUrl)

        alert("📥 PDF Report downloaded successfully!\n\nWe will now open WhatsApp for you. You can easily drag & drop or attach the downloaded PDF file directly in the chat window!")

        const textMessage = encodeURIComponent(`*HomiePay PDF Split Summary*\nGrand Total: Rs. ${grandTotal.toFixed(2)}\n(I have generated and downloaded our PDF report - attaching it below!)`)
        window.open(`https://web.whatsapp.com/send?text=${textMessage}`, "_blank")
      }
    } catch (err) {
      console.error("PDF sharing failed:", err)
      triggerWhatsAppTextOnly()
    } finally {
      setIsSharingPDF(false)
    }
  }

  const handleDownloadPDF = useCallback(() => {
    const doc = generatePDF()
    const pdfBlob = doc.output("blob")
    const pdfUrl = URL.createObjectURL(pdfBlob)
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    
    if (isIOS || isSafari) {
      const newWindow = window.open(pdfUrl, "_blank")
      if (!newWindow) {
        const link = document.createElement("a")
        link.href = pdfUrl
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000)
    } else {
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = `bill-split-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(pdfUrl)
    }
  }, [generatePDF])

  const handleSaveAndReset = () => {
    onSaveBill()
    onReset()
  }

  return (
    <Card className="border-border/50 shadow-lg relative">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5 text-primary" />
          Final Calculation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Here&apos;s how much each person owes
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Grand Total Card */}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Grand Total</span>
              {activePayers.length > 1 ? (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Paid by <span className="font-semibold text-foreground">{activePayers.map(([id, val]) => `${people.find(p => p.id === id)?.name} (Rs.${val.toFixed(2)})`).join(", ")}</span>
                </p>
              ) : payer ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Paid by <span className="font-medium text-foreground">{payer.name}</span>
                </p>
              ) : null}
            </div>
            <span className="flex items-center text-2xl font-bold text-primary">
              <IndianRupee className="h-5 w-5" />
              {grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Who Owes Who Section */}
        {owes.length > 0 && (
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Settlement Summary</h4>
            <div className="space-y-2">
              {owes.map((transaction, index) => {
                const fromPerson = people.find((p) => p.id === transaction.from)
                const toPerson = people.find((p) => p.id === transaction.to)
                if (!fromPerson || !toPerson || transaction.amount === 0) return null
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                  >
                    <div className="flex items-center gap-2">

                      <span className="font-medium">{fromPerson.name}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground animate-pulse" />

                      <span className="font-medium text-primary">{toPerson.name}</span>
                    </div>
                    <span className="flex items-center font-bold text-primary">
                      <IndianRupee className="h-4 w-4" />
                      {transaction.amount.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Individual Breakdowns */}
        <div className="space-y-3">
          {people.map((person, index) => {
            const personSplit = splits[person.id]
            if (!personSplit || personSplit.items.length === 0) return null

            const paidAmount = payments[person.id] || 0
            const isPayer = paidAmount > 0

            return (
              <div
                key={person.id}
                className={`p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                  isPayer
                    ? "bg-primary/5 border-primary/30"
                    : "bg-muted/50 border-border/50"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isPayer ? "bg-primary text-primary-foreground" : "bg-primary/20"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${isPayer ? "" : "text-primary"}`}>
                        {person.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{person.name}</h3>
                      {isPayer && (
                        <span className="text-xs text-primary font-medium">
                          Paid Rs. {paidAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="flex items-center text-lg font-bold text-primary">
                    <IndianRupee className="h-4 w-4" />
                    {personSplit.total.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2 pl-10">
                  {personSplit.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="text-xs opacity-70">(x{item.quantity})</span>
                        )}
                      </span>
                      <span className="flex items-center font-medium">
                        <IndianRupee className="h-3 w-3" />
                        {item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* People with no assignments */}
        {people.some((p) => !splits[p.id] || splits[p.id].items.length === 0) && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">No items assigned: </span>
              {people
                .filter((p) => !splits[p.id] || splits[p.id].items.length === 0)
                .map((p) => p.name)
                .join(", ")}
            </p>
          </div>
        )}

        {/* Share Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            variant="default" 
            onClick={handleSharePDFToWhatsApp} 
            disabled={isSharingPDF}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2"
          >
            {isSharingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share PDF to WhatsApp
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} className="sm:w-44 flex items-center justify-center gap-2 font-semibold">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Fallback option for text split sharing */}
        <div className="text-center pt-1">
          <button 
            onClick={triggerWhatsAppTextOnly}
            className="text-[10px] text-muted-foreground hover:text-primary transition-all underline cursor-pointer"
          >
            Or share standard text-only split summary
          </button>
        </div>

        {/* Auto-saved notice for group bills */}
        {isGroupBill && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Bill auto-saved to group</p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">All group members can view this bill in the group's Bills tab</p>
            </div>
          </div>
        )}

        {/* Auto-saved notice for personal bills */}
        {!isGroupBill && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Bill auto-saved to history</p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">Any changes you make are automatically saved back to your history</p>
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-row gap-3 justify-between border-t border-border/40">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button variant="destructive" onClick={onReset} className="flex-1 flex items-center justify-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
