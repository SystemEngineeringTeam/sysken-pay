import type { AriaButtonOptions } from "react-aria";
import styles from "./SelectButton.module.scss";

interface SelectButtonProps extends React.PropsWithChildren<
  AriaButtonOptions<"button">
> {
  color?: "white" | "blue"; // デフォルト: white, white:白背景のボタン, blue:青背景のボタン
  onClick?: () => void;
}

type SelectButtonGroupProps = {
  onSelectAmount?: (amount: string) => void;
};

function SelectButton(props: SelectButtonProps) {
  const { children, onClick, color = "blue" } = props;
  const className = [styles.button, color === "white" && styles.white]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={className} onClick={onClick}>
      ￥{children}
    </button>
  );
}

export function SelectButtonGroup(props: SelectButtonGroupProps) {
  const { onSelectAmount } = props;

  return (
    <div className={styles.group}>
      <SelectButton onClick={() => onSelectAmount?.("100")} color="white">
        100
      </SelectButton>
      <SelectButton onClick={() => onSelectAmount?.("500")}>500</SelectButton>
      <SelectButton onClick={() => onSelectAmount?.("1000")} color="white">
        1000
      </SelectButton>
    </div>
  );
}

export default SelectButton;
