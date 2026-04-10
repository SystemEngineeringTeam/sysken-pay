export interface User {
  userId: string; // UUID
  userName: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserBalance {
  userId: string; // UUID
  balance: number;
}
