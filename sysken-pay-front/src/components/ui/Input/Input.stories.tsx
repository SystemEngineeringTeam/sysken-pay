import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./index";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  args: { label: "名前", placeholder: "例: シス研 太郎" },
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const Required: Story = {
  name: "必須",
  args: { isRequired: true },
};

export const WithError: Story = {
  name: "エラー",
  args: { value: "", errorMessage: "名前を入力してください" },
};

export const Disabled: Story = {
  name: "無効",
  args: { isDisabled: true, value: "入力できません" },
};

export const Search: Story = {
  name: "検索（丸型）",
  args: { label: undefined, radiusFull: true, placeholder: "商品を探す" },
};

export const Password: Story = {
  name: "パスワード",
  args: { label: "パスワード", type: "password", value: "secret" },
};
