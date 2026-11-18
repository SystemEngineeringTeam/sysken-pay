import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarcodeReader } from "./index";

const meta: Meta<typeof BarcodeReader> = {
  title: "UI/BarcodeReader",
  component: BarcodeReader,
  tags: ["autodocs"],
  args: { onScan: () => {} },
};
export default meta;

type Story = StoryObj<typeof BarcodeReader>;

export const Product: Story = {
  name: "商品",
  args: { mode: "product" },
};

export const Member: Story = {
  name: "学生証",
  args: { mode: "member" },
};

export const CustomPlaceholder: Story = {
  name: "案内文を変える",
  args: { mode: "member", placeholder: "学生証をかざしてください" },
};

export const WithError: Story = {
  name: "読み取り失敗",
  args: {
    mode: "product",
    error: "このバーコードは登録されていません",
  },
};
