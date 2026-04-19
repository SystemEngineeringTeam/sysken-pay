import type { Meta, StoryObj } from "@storybook/react-vite";
import { PriceItemCard } from "./index";

const meta: Meta<typeof PriceItemCard> = {
  title: "UI/PriceItemCard",
  component: PriceItemCard,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof PriceItemCard>;

export const WithDelete: Story = {
  name: "削除ボタンあり",
  args: {
    title: "コカ・コーラ × 2",
    price: 200,
    onDelete: () => alert("削除"),
  },
};

export const WithoutDelete: Story = {
  name: "削除ボタンなし",
  args: {
    title: "ごつ盛り 豚骨",
    price: 150,
  },
};
