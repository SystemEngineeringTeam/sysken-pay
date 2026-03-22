export interface Item {
  id: string;
  janCode: string;
  name: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}