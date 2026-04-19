import type { JSX } from "react";
import type { AriaButtonOptions } from "react-aria";
import styles from "./ArrowButton.module.scss";

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
    variant === "prev" && styles.prev,
    variant === "next" && styles.next,
  ]
    .filter(Boolean)
    .join(" ");

  const arrowPath = "M12.727 3.687a1 1 0 1 0-1.454-1.374l-8.5 9a1 1 0 0 0 0 1.374l8.5 9.001a1 1 0 1 0 1.454-1.373L4.875 12z";

  return (
    <button className={className} onClick={onClick}>
      {variant === "prev" && (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-label="leftArrow" className={styles.leftArrow}>
          <path fill="currentColor" d={arrowPath} />
        </svg>
      )}
      {children}
      {variant === "next" && (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-label="rightArrow" className={styles.rightArrow}>
          <path fill="currentColor" d={arrowPath} />
        </svg>
      )}
    </button>
  );
}
