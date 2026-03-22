import type { JSX } from "react";
import type { AriaTextFieldOptions } from "react-aria";
import { useEffect, useRef, useState } from "react";
import { useTextField } from "react-aria";
import styles from "./Input.module.scss";

interface InputProps
  extends React.PropsWithChildren<AriaTextFieldOptions<"input">> {
  errorMessage?: string;
  radiusFull?: boolean;
  rightIcon?: React.ReactNode;
  isDisabled?: boolean;
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
  } = props;

  useEffect(() => {
    if (ref.current != null && value !== undefined) {
      ref.current.value = value.toString();
    }
  }, [value]);

  const displayError = errorMessage ?? validationErrors.join(" ");
  const hasError =
    Boolean(isInvalid) || (errorMessage !== undefined && errorMessage !== "");

  const defaultSearchIcon = (
    <img
      alt="search"
      height={20}
      src="https://api.iconify.design/material-symbols:search.svg?color=%23A4A5B5"
      width={20}
    />
  );

  const isPassword = type === "password";
  const passwordToggleIcon = (
    <img
      alt="toggle visibility"
      height={40}
      src={
        isPasswordVisible
          ? "https://api.iconify.design/line-md:watch-loop.svg?color=%23A4A5B5"
          : "https://api.iconify.design/line-md:watch-off-loop.svg?color=%23A4A5B5"
      }
      width={40}
    />
  );

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
          }`}
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
