import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChargeButton } from "./index";

const meta: Meta<typeof ChargeButton> = {
  title: "Features/Home/ChargeButton",
  component: ChargeButton,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ChargeButton>;

export const Default: Story = {
  name: "チャージ画面へ移動",
};

export const CustomHandler: Story = {
  name: "押したときの処理を差し替え",
  args: { onCharge: () => alert("チャージ") },
};
