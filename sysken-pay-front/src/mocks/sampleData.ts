import type { components } from "../types/api-schema";

type User = components["schemas"]["PostUserResponse"];
type Item = components["schemas"]["GetItemResponse"];

export const sampleUsers: User[] = [
  { user_id: "550e8400-e29b-41d4-a716-446655440000", user_name: "さな", created_at: "2025-04-01T00:00:00.000Z" },
  { user_id: "550e8400-e29b-41d4-a716-446655440001", user_name: "たろう", created_at: "2025-04-02T00:00:00.000Z" },
];

export const sampleItems: Item[] = [
  { item_id: 1, jan_code: "4902102072595", item_name: "コカ・コーラ", price: 100 },
  { item_id: 2, jan_code: "4901432112234", item_name: "ごつ盛り 豚骨", price: 150 },
  { item_id: 3, jan_code: "4902102123456", item_name: "お茶", price: 120 },
];
