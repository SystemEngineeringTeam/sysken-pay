import type { Meta, StoryObj } from "@storybook/react-vite";
import { PriceLabel } from "./index";

const meta: Meta<typeof PriceLabel> = {
  title: "UI/PriceLabel",
  component: PriceLabel,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof PriceLabel>;

export const Default: Story = {
  args: { label: "残高", price: 1500 },
};

export const Zero: Story = {
  args: { label: "合計", price: 0 },
};

export const LargePrice: Story = {
  name: "大きい金額",
  args: { label: "チャージ金額", price: 100000 },
};
