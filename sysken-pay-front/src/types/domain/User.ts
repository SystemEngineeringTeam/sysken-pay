export interface User {
  userId: string; // UUID
  userName: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
