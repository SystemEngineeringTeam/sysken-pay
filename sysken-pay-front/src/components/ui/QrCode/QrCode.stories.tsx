import type { Meta, StoryObj } from "@storybook/react-vite";
import { QrCode } from "./index";

const meta: Meta<typeof QrCode> = {
  title: "UI/QrCode",
  component: QrCode,
  tags: ["autodocs"],
  args: {
    value: "https://qr.pay.sysken.net/#a=SP7Q2KX9MDRA4TW8YZ",
    label: "スマホ登録用の QR コード",
  },
};
export default meta;

type Story = StoryObj<typeof QrCode>;

export const Default: Story = {};

export const LongUrl: Story = {
  name: "長い URL",
  args: {
    value:
      "https://qr.pay.sysken.net/#a=SP7Q2KX9MDRA4TW8YZ&from=admin",
  },
};
