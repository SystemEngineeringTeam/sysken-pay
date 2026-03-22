import type { JSX } from "react";
import type { AriaButtonOptions } from "react-aria";
import styles from "./Button.module.scss";

interface ButtonProps extends React.PropsWithChildren<
  AriaButtonOptions<"button">
> {
  size?: "md" | "lg"; //デフォルト:medium , medium:普通のボタン, large:大きいボタン
  onClick?: () => void;
}

export default function Button(props: ButtonProps): JSX.Element {
  const { children, size = "md", onClick } = props;
  const className = [styles.button, size === "lg" && styles.large]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}
