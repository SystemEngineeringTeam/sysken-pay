import type { User } from "../types/domain/User";
import type { Item } from "../types/domain/Item";
import type { Purchase, PurchaseItem } from "../types/domain/Purchase";
import type { Charge } from "../types/domain/Charge";

// ---- User ----
export const sampleUsers: User[] = [
  {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    userName: "さな",
    createdAt: new Date("2025-04-01"),
    updatedAt: new Date("2025-04-01"),
  },
  {
    userId: "550e8400-e29b-41d4-a716-446655440001",
    userName: "たろう",
    createdAt: new Date("2025-04-02"),
    updatedAt: new Date("2025-04-02"),
    deletedAt: new Date("2025-12-01"),
  },
];

// ---- Item ----
export const sampleItems: Item[] = [
  {
    id: "1",
    janCode: "4902102072595",
    name: "コカ・コーラ",
    price: 100,
    createdAt: new Date("2025-04-01"),
    updatedAt: new Date("2025-04-01"),
  },
  {
    id: "2",
    janCode: "4901432112234",
    name: "ごつ盛り 豚骨",
    price: 150,
    createdAt: new Date("2025-04-01"),
    updatedAt: new Date("2025-04-01"),
  },
  {
    id: "3",
    janCode: "4902102123456",
    name: "お茶",
    price: 120,
    createdAt: new Date("2025-04-01"),
    updatedAt: new Date("2025-04-01"),
  },
];

// ---- PurchaseItem ----
export const samplePurchaseItems: PurchaseItem[] = [
  { itemId: 1, quantity: 2 },
  { itemId: 2, quantity: 1 },
];

// ---- Purchase ----
export const samplePurchases: Purchase[] = [
  {
    id: 1,
    userId: "550e8400-e29b-41d4-a716-446655440000",
    balance: 700,
    items: samplePurchaseItems,
    createdAt: new Date("2025-05-01"),
  },
  {
    id: 2,
    userId: "550e8400-e29b-41d4-a716-446655440001",
    balance: 500,
    items: [{ itemId: 3, quantity: 1 }],
    createdAt: new Date("2025-05-02"),
    deletedAt: new Date("2025-05-03"),
  },
];

// ---- Charge ----
export const sampleCharges: Charge[] = [
  {
    id: 1,
    userId: "550e8400-e29b-41d4-a716-446655440000",
    amount: 1000,
    balance: 1000,
    createdAt: new Date("2025-04-10"),
  },
  {
    id: 2,
    userId: "550e8400-e29b-41d4-a716-446655440001",
    amount: 500,
    balance: 500,
    createdAt: new Date("2025-04-15"),
    deletedAt: new Date("2025-12-01"),
  },
];
