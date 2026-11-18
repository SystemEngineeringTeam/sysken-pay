import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfirmDialog } from "./index";

const meta: Meta<typeof ConfirmDialog> = {
  title: "UI/ConfirmDialog",
  component: ConfirmDialog,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

const noop = () => {};

export const Refund: Story = {
  name: "返金",
  args: {
    title: "¥1,230 を返金しますか？",
    children: <p>現金箱から ¥1,230 を渡してから押してください。</p>,
    actions: [
      { label: "やめる", onClick: noop, variant: "plain" },
      { label: "現金を渡した", onClick: noop },
    ],
  },
};

export const Stop: Story = {
  name: "利用停止（残高あり）",
  args: {
    title: "利用停止しますか？",
    children: (
      <>
        <p>支払い用バーコードが使えなくなります。</p>
        <p>残高が ¥1,230 残っています。</p>
      </>
    ),
    actions: [
      { label: "やめる", onClick: noop, variant: "plain" },
      { label: "止めるだけ", onClick: noop, variant: "danger" },
      { label: "返金して止める", onClick: noop },
    ],
  },
};

export const Busy: Story = {
  name: "処理中",
  args: { ...Stop.args, busy: true },
};
