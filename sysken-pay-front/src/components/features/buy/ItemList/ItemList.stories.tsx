import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemList } from "./index";
import type { CartItem } from "../../../../store/useCartStore";

const meta: Meta<typeof ItemList> = {
  title: "Features/Buy/ItemList",
  component: ItemList,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ItemList>;

const sampleItems: CartItem[] = [
  { item: { item_id: 1, item_name: "コカ・コーラ", price: 100, jan_code: "4902102072595" }, quantity: 2 },
  { item: { item_id: 2, item_name: "ごつ盛り 豚骨", price: 150, jan_code: "4901432112234" }, quantity: 1 },
];

export const Default: Story = {
  args: { Items: sampleItems, onDelete: () => {} },
};

export const Empty: Story = {
  name: "カートが空",
  args: { Items: [], onDelete: () => {} },
};

export const SingleItem: Story = {
  name: "1商品",
  args: { Items: [sampleItems[0]], onDelete: () => {} },
};
