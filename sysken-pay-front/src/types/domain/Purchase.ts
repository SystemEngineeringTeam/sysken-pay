export interface PurchaseItem {
  itemId: number;
  quantity: number;
}

export interface Purchase {
  id: number;
  userId: string; // UUID
  balance: number;
  items: PurchaseItem[];
  createdAt: Date;
  deletedAt?: Date;
}
