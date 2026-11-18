import type { Meta, StoryObj } from "@storybook/react-vite";
import { QrCode } from "./index";

const meta: Meta<typeof QrCode> = {
  title: "UI/QrCode",
  component: QrCode,
  tags: ["autodocs"],
  args: {
    value: "https://example.com/claim/sample-token",
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
      "https://example.com/claim/0123456789abcdef0123456789abcdef0123456789abcdef?from=admin&lang=ja",
  },
};
