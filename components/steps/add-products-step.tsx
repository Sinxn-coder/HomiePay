"use client"

import { useState } from "react"
import { Plus, Trash2, Edit3, Check, X, ShoppingBag, IndianRupee, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PremiumModal } from "@/components/premium-modal"
import type { Product } from "@/lib/types"

interface AddProductsStepProps {
  products: Product[]
  addProduct: (name: string, price: number, quantity: number) => void
  updateProduct: (id: string, updates: Partial<Omit<Product, "id">>) => void
  removeProduct: (id: string) => void
  onBack: () => void
  onContinue: () => void
}

export function AddProductsStep({
  products,
  addProduct,
  updateProduct,
  removeProduct,
  onBack,
  onContinue,
}: AddProductsStepProps) {
  const [newName, setNewName] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newQuantity, setNewQuantity] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingPrice, setEditingPrice] = useState("")
  const [editingQuantity, setEditingQuantity] = useState("")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleAddProduct = () => {
    if (newName.trim() && newPrice) {
      const price = parseFloat(newPrice)
      const quantity = parseInt(newQuantity) || 1
      if (!isNaN(price) && price > 0 && quantity > 0) {
        addProduct(newName, price, quantity)
        setNewName("")
        setNewPrice("")
        setNewQuantity("")
        setIsSheetOpen(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddProduct()
    }
  }

  const startEditing = (product: Product) => {
    setEditingId(product.id)
    setEditingName(product.name)
    setEditingPrice(product.price.toString())
    setEditingQuantity(product.quantity.toString())
    setConfirmDeleteId(null)
  }

  const saveEdit = () => {
    if (editingId && editingName.trim() && editingPrice && editingQuantity) {
      const price = parseFloat(editingPrice)
      const quantity = parseInt(editingQuantity)
      if (!isNaN(price) && price > 0 && !isNaN(quantity) && quantity > 0) {
        updateProduct(editingId, { name: editingName.trim(), price, quantity })
        setEditingId(null)
        setEditingName("")
        setEditingPrice("")
        setEditingQuantity("")
      }
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
    setEditingPrice("")
    setEditingQuantity("")
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit()
    } else if (e.key === "Escape") {
      cancelEdit()
    }
  }

  const total = products.reduce((sum, p) => sum + p.price * p.quantity, 0)

  return (
    <>
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Add Products
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add items with unit price and quantity
            </p>
          </div>
          <Button
            onClick={() => setIsSheetOpen(true)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4.5 w-4.5 mr-2" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.length > 0 && (
            <div className="space-y-2 mt-2">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 animate-in fade-in slide-in-from-left-2 duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {editingId === product.id ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="flex-1 h-8"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative w-20">
                          <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            type="number"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            className="h-8 pl-7"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <span className="text-muted-foreground">x</span>
                        <Input
                          type="number"
                          value={editingQuantity}
                          onChange={(e) => setEditingQuantity(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="h-8 w-16"
                          min="1"
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
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        {product.quantity > 1 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            x{product.quantity}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end text-sm">
                          <span className="text-muted-foreground text-xs">
                            {product.quantity > 1 && (
                              <span className="inline-flex items-center">
                                <IndianRupee className="h-2.5 w-2.5" />
                                {product.price.toFixed(2)} x {product.quantity}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center font-semibold text-primary">
                            <IndianRupee className="h-3.5 w-3.5" />
                            {(product.price * product.quantity).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => startEditing(product)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {confirmDeleteId === product.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                            <span className="text-[10px] font-bold text-destructive uppercase tracking-wide mr-1 select-none">Delete?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2.5 text-xs font-bold rounded-lg shadow-sm"
                              onClick={() => {
                                removeProduct(product.id)
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
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDeleteId(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              <div className="flex justify-between items-center pt-3 mt-3 border-t border-border">
                <span className="font-medium text-muted-foreground">Total</span>
                <span className="flex items-center text-lg font-bold text-primary">
                  <IndianRupee className="h-4 w-4" />
                  {total.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {products.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border/60 rounded-xl bg-muted/20">
              <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-30 text-emerald-600" />
              <p className="font-semibold text-foreground/80">No products added yet</p>
              <p className="text-sm">Add items to split between friends</p>
            </div>
          )}

          <div className="pt-4 flex justify-between">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onContinue} disabled={products.length === 0} className="min-w-32">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Premium Add Product Popup Modal */}
      <PremiumModal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Add New Product"
        description="Add a purchased product or item with price details"
        icon={<ShoppingBag className="h-5 w-5 text-emerald-600" />}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/90">Product Name</label>
            <Input
              placeholder="e.g. Pizza, Coffee, Taxi Fare"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-12 text-base border-border/80 focus:border-primary/80 focus:ring-primary/20 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/90">Unit Price</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 h-12 text-base border-border/80 focus:border-primary/80 focus:ring-primary/20 rounded-xl"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/90">Quantity</label>
              <Input
                type="number"
                placeholder="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 text-base border-border/80 focus:border-primary/80 focus:ring-primary/20 rounded-xl"
                min="1"
              />
            </div>
          </div>

          {newPrice && newQuantity && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">Total Cost</span>
                <span className="flex items-center font-bold text-primary text-lg">
                  <IndianRupee className="h-4.5 w-4.5" />
                  {(parseFloat(newPrice || "0") * parseInt(newQuantity || "1")).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsSheetOpen(false)}
              className="flex-1 h-12 rounded-xl text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={!newName.trim() || !newPrice}
              className="flex-1 h-12 rounded-xl text-base bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </PremiumModal>
    </>
  )
}
