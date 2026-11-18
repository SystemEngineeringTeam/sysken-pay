import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import Total from "./index";
import { useCartStore, type CartItem } from "../../../../store/useCartStore";

const sampleItems: CartItem[] = [
  { item: { item_id: 1, item_name: "コカ・コーラ", price: 100, jan_code: "4902102072595" }, quantity: 2 },
  { item: { item_id: 2, item_name: "ごつ盛り 豚骨", price: 150, jan_code: "4901432112234" }, quantity: 1 },
];

/** ストーリーごとにカートの中身を差し替える */
const withCart =
  (cartItems: CartItem[]): Decorator =>
  (Story) => {
    useCartStore.setState({ cartItems });
    return <Story />;
  };

const meta: Meta<typeof Total> = {
  title: "Features/Buy/Total",
  component: Total,
  tags: ["autodocs"],
  args: { title: "お会計", label: "合計" },
};
export default meta;

type Story = StoryObj<typeof Total>;

export const Default: Story = {
  decorators: [withCart(sampleItems)],
};

export const WithButton: Story = {
  name: "完了ボタンあり（現金）",
  args: { showButton: true },
  decorators: [withCart(sampleItems)],
};

export const EmptyCart: Story = {
  name: "カートが空",
  decorators: [withCart([])],
};
