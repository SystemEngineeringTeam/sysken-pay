import type { Meta, StoryObj } from "@storybook/react-vite";
import Button from "./index";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "ボタン" },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Medium: Story = {
  args: { size: "md" },
};

export const Large: Story = {
  args: { size: "lg" },
};

export const Small: Story = {
  args: { size: "sm" },
};

export const SmallSelected: Story = {
  name: "Small (選択中)",
  args: { size: "sm", selected: true },
};
