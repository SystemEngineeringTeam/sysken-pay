import type { JSX } from "react";
import type { AriaButtonOptions } from "react-aria";
import styles from "./Button.module.scss";

interface ButtonProps extends React.PropsWithChildren<
  AriaButtonOptions<"button">
> {
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
}

export default function Button(props: ButtonProps): JSX.Element {
  const { children, size = "md", selected = false, onClick } = props;
  const className = [
    styles.button,
    size === "lg" && styles.large,
    size === "sm" && styles.small,
    size === "sm" && selected && styles.selected,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
}
