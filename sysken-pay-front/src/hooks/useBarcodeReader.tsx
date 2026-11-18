import { useState, useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useBalanceStore } from "../store/useBalanceStore";
import { useUserStore } from "../store/useUserStore";
import { ItemRepositoryImpl } from "../adapter/repository/ItemRepositoryImpl";
import { UserRepositoryImpl } from "../adapter/repository/UserRepositoryImpl";
import { PaymentCardRepositoryImpl } from "../adapter/repository/PaymentCardRepositoryImpl";
import {
  PAYMENT_CODE_ON_HOME,
  STUDENT_ID_NOT_ACCEPTED,
  isStudentId,
  looksLikePaymentCode,
  toPaymentScanErrorMessage,
} from "../services/paymentScan";
import { PRODUCT_NOT_REGISTERED, toProductScanErrorMessage } from "../services/productScanErrorMessage";
import styles from "./useBarcodeReader.module.scss";

function useScanGuards() {
  const isMountedRef = useRef(true);
  const isScanningRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { isMountedRef, isScanningRef };
}

function useErrorWithAutoReset() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const ErrorMessage = (): JSX.Element | null =>
    error ? <p className={styles.error}>{error}</p> : null;

  return { setError, ErrorMessage };
}

export function useProductScan() {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { setError, ErrorMessage } = useErrorWithAutoReset();
  const { isMountedRef, isScanningRef } = useScanGuards();

  const onScan = async (barcode: string) => {
    if (isScanningRef.current) return;
    // スマホの支払い用バーコードを商品の読み取りでかざしたとき（商品の API には送らない）
    if (looksLikePaymentCode(barcode)) {
      setError(PAYMENT_CODE_ON_HOME);
      return;
    }
    isScanningRef.current = true;
    try {
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      if (!isMountedRef.current) return;
      if (!data?.item_id) {
        setError(PRODUCT_NOT_REGISTERED);
        return;
      }
      addItem(data);
      navigate("/buy/list");
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(toProductScanErrorMessage(e));
    } finally {
      isScanningRef.current = false;
    }
  };

  return { onScan, ErrorMessage };
}

/**
 * スマホのシス研Payバーコード（支払い用バーコード）を読み取り、持ち主と残高を調べてから nextPath へ進む。
 * 支払い・チャージで使う（docs/phone-payment.md。学生証での支払いはやめた）。
 * 学生証を読んだときは API に送らず、「学生証は使えません」と案内する。
 */
export function usePaymentCardScan(nextPath: string = "/charge/select") {
  const navigate = useNavigate();
  const setBalance = useBalanceStore((state) => state.setBalance);
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  const { setError, ErrorMessage } = useErrorWithAutoReset();
  const { isMountedRef, isScanningRef } = useScanGuards();

  const onScan = async (barcode: string) => {
    if (isScanningRef.current) return;
    if (isStudentId(barcode)) {
      setError(STUDENT_ID_NOT_ACCEPTED);
      return;
    }
    isScanningRef.current = true;
    try {
      const user = await PaymentCardRepositoryImpl.resolve(barcode);
      const balance = await UserRepositoryImpl.getBalance(user.user_id);
      if (!isMountedRef.current) return;
      setBalance(balance);
      setScannedUser({ user_id: user.user_id, user_name: user.user_name });
      navigate(nextPath);
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(toPaymentScanErrorMessage(e));
    } finally {
      isScanningRef.current = false;
    }
  };

  return { onScan, ErrorMessage };
}
