import type { Meta, StoryObj } from "@storybook/react-vite";
import { SelectButtonGroup } from "./index";
import { useState } from "react";

const meta: Meta<typeof SelectButtonGroup> = {
  title: "Features/Charge/SelectButtonGroup",
  component: SelectButtonGroup,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof SelectButtonGroup>;

export const Default: Story = {
  args: { selectedAmount: "", onSelectAmount: () => {} },
};

export const Interactive: Story = {
  name: "選択インタラクション",
  render: () => {
    const [selected, setSelected] = useState("");
    return <SelectButtonGroup selectedAmount={selected} onSelectAmount={setSelected} />;
  },
};

export const Preselected500: Story = {
  name: "500円選択中",
  args: { selectedAmount: "500", onSelectAmount: () => {} },
};
