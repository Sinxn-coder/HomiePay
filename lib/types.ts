export interface Person {
  id: string
  name: string
  username?: string
  userId?: string
}

export interface ProductAssignment {
  personId: string
  percentage: number // treated as "count" or "shares" in the UI
}

export interface Product {
  id: string
  name: string
  price: number
  quantity: number
  assignedTo: string[]
  splitByPercentage: boolean // toggles custom count-based split
  percentages: ProductAssignment[] // custom count/shares assigned to each person
}

export interface Settlement {
  id: string
  groupId: string
  billId?: string
  fromUserId: string
  toUserId: string
  amount: number
  note?: string
  createdAt: number
}

export interface Group {
  id: string
  name: string
  members: Person[]
  color: string
  createdAt: number
  ownerId?: string
  shareCode?: string
  synced?: boolean
  settlements?: Settlement[]
}

export interface SavedBill {
  id: string
  createdAt: number
  expiresAt?: number
  people: Person[]
  products: Product[]
  paidBy: string | null
  payments?: Record<string, number>
  grandTotal: number
  groupId?: string
  groupName?: string
  synced?: boolean
  isSettled?: boolean
  clearedBy?: string[]
  creatorId?: string
}

export interface GroupInvite {
  id: string
  group_id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  group?: {
    name: string
  }
  from_user?: {
    full_name: string
    username: string
  }
}
