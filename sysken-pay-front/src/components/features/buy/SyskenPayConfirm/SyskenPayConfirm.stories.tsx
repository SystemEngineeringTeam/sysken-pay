import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import SyskenPayConfirm from "./index";
import { useCartStore, type CartItem } from "../../../../store/useCartStore";

// 合計 350 円
const cart: CartItem[] = [
  { item: { item_id: 1, item_name: "コカ・コーラ", price: 100, jan_code: "4902102072595" }, quantity: 2 },
  { item: { item_id: 2, item_name: "ごつ盛り 豚骨", price: 150, jan_code: "4901432112234" }, quantity: 1 },
];

const withCart: Decorator = (Story) => {
  useCartStore.setState({ cartItems: cart });
  return <Story />;
};

const meta: Meta<typeof SyskenPayConfirm> = {
  title: "Features/Buy/SyskenPayConfirm",
  component: SyskenPayConfirm,
  tags: ["autodocs"],
  decorators: [withCart],
};
export default meta;

type Story = StoryObj<typeof SyskenPayConfirm>;

export const Enough: Story = {
  name: "残高が足りる",
  args: { balance: 1000 },
};

export const Exact: Story = {
  name: "残高ぴったり",
  args: { balance: 350 },
};

export const Shortage: Story = {
  name: "残高が足りない",
  args: { balance: 200 },
};

export const WithName: Story = {
  name: "名前つき（スマホのバーコードで読み取ったとき）",
  args: { balance: 1000, userName: "k24000_yamadataro" },
};
