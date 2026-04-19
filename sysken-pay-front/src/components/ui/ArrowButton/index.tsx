import type { JSX } from "react";
import type { AriaButtonOptions } from "react-aria";
import styles from "./ArrowButton.module.scss";

const ICONS_BASE = "https://raw.githubusercontent.com/sana-sagegami/sysken-pay/main/public/icons";

interface ArrowButtonProps extends React.PropsWithChildren<
  AriaButtonOptions<"button">
> {
  variant?: "prev" | "next";
  onClick?: () => void;
}

export default function ArrowButton(props: ArrowButtonProps): JSX.Element {
  const { children, variant = "prev", onClick } = props;
  const className = [
    styles.arrowButton,
    styles.arrowIcon,
    variant === "prev" && styles.prev,
    variant === "next" && styles.next,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={className} onClick={onClick}>
      {variant === "prev" && (
        <img
          src={`${ICONS_BASE}/LeftArrow.svg`}
          alt="leftArrow"
          className={styles.leftArrow}
        />
      )}
      {children}
      {variant === "next" && (
        <img
          src={`${ICONS_BASE}/RightArrow.svg`}
          alt="rightArrow"
          className={styles.rightArrow}
        />
      )}
    </button>
  );
}
