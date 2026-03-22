export interface Charge {
  id: number;
  userId: string; // UUID
  amount: number;
  balance: number;
  createdAt: Date;
  deletedAt?: Date;
}
