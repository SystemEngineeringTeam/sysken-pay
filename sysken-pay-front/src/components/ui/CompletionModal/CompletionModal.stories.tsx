import type { Meta, StoryObj } from "@storybook/react-vite";
import { CompletionModal } from "./index";

const meta: Meta<typeof CompletionModal> = {
  title: "UI/CompletionModal",
  component: CompletionModal,
  tags: ["autodocs"],
  args: { onClose: () => {} },
};
export default meta;

type Story = StoryObj<typeof CompletionModal>;

export const UserRegister: Story = {
  name: "ユーザー登録完了",
  args: { mode: "userRegister", name: "さな" },
};

export const ItemRegister: Story = {
  name: "商品登録完了",
  args: { mode: "itemRegister", name: "コカ・コーラ", price: 100 },
};

export const ItemUpdate: Story = {
  name: "商品更新完了",
  args: { mode: "itemUpdate", name: "お茶", price: 120 },
};
