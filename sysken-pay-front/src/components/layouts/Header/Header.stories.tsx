import type { Meta, StoryObj } from "@storybook/react-vite";
import Header from "./index";

const meta: Meta<typeof Header> = {
  title: "Layouts/Header",
  component: Header,
  tags: ["autodocs"],
  args: { title: "商品を選ぶ" },
};
export default meta;

type Story = StoryObj<typeof Header>;

export const Default: Story = {
  name: "右側なし",
  args: { right: "none" },
};

export const Setting: Story = {
  name: "設定ボタン",
  args: { right: "setting" },
};

export const ToTop: Story = {
  name: "最初に戻る",
  args: { right: "toTop" },
};

export const WithShadow: Story = {
  name: "影あり",
  args: { right: "toTop", shadow: true },
};
