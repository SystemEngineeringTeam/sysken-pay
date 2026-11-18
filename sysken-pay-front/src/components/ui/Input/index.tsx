import type { JSX } from "react";
import type { AriaTextFieldOptions } from "react-aria";
import { useEffect, useRef, useState } from "react";
import { useTextField } from "react-aria";
import styles from "./Input.module.scss";

const ICON_COLOR = "#A4A5B5";

// 外部 CDN に依存しないよう、アイコンはインライン SVG で持つ（オフライン環境でも表示するため）
function SearchIcon(): JSX.Element {
  return (
    <svg aria-label="search" fill="none" height={20} role="img" stroke={ICON_COLOR} strokeLinecap="round" strokeWidth={2} viewBox="0 0 24 24" width={20}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }): JSX.Element {
  return (
    <svg aria-label={visible ? "パスワードを隠す" : "パスワードを表示"} fill="none" height={32} role="img" stroke={ICON_COLOR} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" width={32}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!visible && <path d="M4 4l16 16" />}
    </svg>
  );
}

interface InputProps
  extends React.PropsWithChildren<AriaTextFieldOptions<"input">> {
  errorMessage?: string;
  radiusFull?: boolean;
  rightIcon?: React.ReactNode;
  isDisabled?: boolean;
  className?: string;
}

export function Input(props: InputProps): JSX.Element {
  const ref = useRef<HTMLInputElement | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { labelProps, inputProps, isInvalid, validationErrors } = useTextField(
    props,
    ref
  );
  const { ...restInputProps } = inputProps;
  const {
    label,
    isRequired,
    errorMessage,
    isDisabled,
    value,
    radiusFull = false,
    rightIcon,
    type,
    className,
  } = props;

  useEffect(() => {
    if (ref.current != null && value !== undefined) {
      ref.current.value = value.toString();
    }
  }, [value]);

  const displayError = errorMessage ?? validationErrors.join(" ");
  const hasError =
    Boolean(isInvalid) || (errorMessage !== undefined && errorMessage !== "");

  const defaultSearchIcon = <SearchIcon />;

  const isPassword = type === "password";
  const passwordToggleIcon = <EyeIcon visible={isPasswordVisible} />;

  const displayIcon = isPassword
    ? passwordToggleIcon
    : radiusFull
    ? rightIcon ?? defaultSearchIcon
    : rightIcon;

  return (
    <div
      className={`${styles.container} ${
        isDisabled === true ? styles.disabled : ""
      }`}
    >
      {label != null && label !== "" && (
        <div className={styles.labelContainer}>
          <label {...labelProps} className={styles.label}>
            {label}
            {isRequired === true && <span className={styles.required}>*</span>}
          </label>
          {Boolean(hasError) && displayError !== "" && (
            <span className={styles.errorMessage}>{displayError}</span>
          )}
        </div>
      )}
      <div className={styles.inputWrapper}>
        <input
          {...restInputProps}
          className={`${styles.input} ${radiusFull ? styles.radiusFull : ""} ${
            hasError ? styles.error : ""
          } ${className ?? ""}`}
          ref={ref}
          type={isPassword && isPasswordVisible ? "text" : type}
        />
        {displayIcon !== undefined && (
          <span
            className={styles.rightIcon}
            onClick={
              isPassword
                ? () => {
                    setIsPasswordVisible(!isPasswordVisible);
                  }
                : undefined
            }
            style={isPassword ? { cursor: "pointer" } : undefined}
          >
            {displayIcon}
          </span>
        )}
      </div>
    </div>
  );
}
