import type { Meta, StoryObj } from "@storybook/react-vite";
import { PayMethodButtonGroup } from "./index";

const meta: Meta<typeof PayMethodButtonGroup> = {
  title: "Features/Buy/PayMethodButtonGroup",
  component: PayMethodButtonGroup,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof PayMethodButtonGroup>;

export const Default: Story = {
  name: "現金 / シス研Pay",
};
