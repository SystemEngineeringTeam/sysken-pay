import type { Meta, StoryObj } from "@storybook/react-vite";
import ArrowButton from "./index";

const meta: Meta<typeof ArrowButton> = {
  title: "UI/ArrowButton",
  component: ArrowButton,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ArrowButton>;

export const Prev: Story = {
  name: "戻る",
  args: { variant: "prev", children: "戻る" },
};

export const Next: Story = {
  name: "次へ",
  args: { variant: "next", children: "次へ" },
};
